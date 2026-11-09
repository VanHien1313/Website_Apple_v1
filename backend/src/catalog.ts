import { Router } from 'express';
import type { Database, SqlClient } from './db/database.ts';
const source = `FROM products p CROSS APPLY (SELECT TOP (1) price,original_price FROM inventory_skus WHERE product_id=p.id ORDER BY price,id) s`;
const projection = `p.id,p.slug,p.name,p.category_id AS category,p.sub_category AS subCategory,p.tagline,p.thumbnail,
 JSON_QUERY(p.gallery) AS gallery,JSON_QUERY(p.description) AS description,JSON_QUERY(p.key_specs) AS keySpecs,
 JSON_QUERY(p.detailed_specs) AS detailedSpecs,p.warranty_info AS warrantyInfo,p.badge,0 AS rating,0 AS reviewCount,
 CONVERT(varchar(30),p.created_at,126)+'Z' AS createdAt,s.price AS basePrice,s.original_price AS originalPrice,
 JSON_QUERY((SELECT c.id,c.name,c.hex,c.image FROM colors c WHERE c.product_id=p.id AND EXISTS(SELECT 1 FROM inventory_skus k WHERE k.color_id=c.id) ORDER BY c.id FOR JSON PATH)) AS colors,
 JSON_QUERY((SELECT k.id,v.id AS configurationId,k.color_id AS colorId,k.sku,v.storage,v.screen_size AS screenSize,v.connectivity,v.chip,k.price,k.original_price AS originalPrice,
 CAST(CASE WHEN k.on_hand>k.reserved THEN 1 ELSE 0 END AS bit) AS inStock FROM inventory_skus k JOIN variants v ON v.id=k.variant_id WHERE k.product_id=p.id ORDER BY k.id FOR JSON PATH)) AS variants`;
async function jsonRows(tx: SqlClient, statement: string, values: unknown[]) {
  const result = await tx.query<{ payload: string }>(`SELECT (${statement} FOR JSON PATH) AS payload`, values);
  return JSON.parse(result.rows[0]?.payload ?? '[]') as Record<string, unknown>[];
}
export function catalogRouter(db: Database) {
  const router = Router();
  router.get('/categories', async (_req,res) => { res.json((await db.query('SELECT id,name FROM categories ORDER BY name,id')).rows); });
  router.get('/products/by-slug/:slug', async (req,res) => {
    const rows = await jsonRows(db,`SELECT ${projection} ${source} WHERE p.active=1 AND p.slug=@arg1`,[req.params.slug]);
    if (!rows[0]) { res.status(404).json({error:{code:'NOT_FOUND',message:'Không tìm thấy sản phẩm.',requestId:res.locals.requestId}}); return; }
    res.json(rows[0]);
  });
  router.get('/products', async (req,res) => {
    const values: unknown[] = [], where=['p.active=1'];
    const bind=(value:unknown)=>{values.push(value);return `@arg${values.length}`;};
    const sorts:Record<string,string>={newest:'p.created_at DESC,p.id',featured:'p.created_at DESC,p.id',price_asc:'s.price,p.id',price_desc:'s.price DESC,p.id'};
    let page:number,pageSize:number,sort:string;
    const integer=(key:string,fallback:number,max:number)=>{
      if(req.query[key]===undefined)return fallback;
      const raw=req.query[key];
      if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<1||Number(raw)>max)throw Error('query');
      return Number(raw);
    };
    try {
      page=integer('page',1,1000000);pageSize=integer('pageSize',12,100);
      for(const key of ['q','category','subCategory','storage','sort']) if(req.query[key]!==undefined&&(typeof req.query[key]!=='string'||(req.query[key] as string).length>200))throw Error('query');
      const key=String(req.query.sort??'featured');if(!Object.hasOwn(sorts,key))throw Error('query');sort=sorts[key]!;
      if(req.query.q)where.push(`CHARINDEX(LOWER(${bind(String(req.query.q).trim())}),LOWER(p.name+' '+p.tagline))>0`);
      if(req.query.category)where.push(`p.category_id=${bind(req.query.category)}`);
      if(req.query.subCategory)where.push(`p.sub_category=${bind(req.query.subCategory)}`);
      if(req.query.storage)where.push(`EXISTS(SELECT 1 FROM variants v JOIN inventory_skus k ON k.variant_id=v.id WHERE v.product_id=p.id AND v.storage=${bind(req.query.storage)})`);
      for(const key of ['minPrice','maxPrice'])if(req.query[key]!==undefined){
        const raw=req.query[key];if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw Error('query');
        where.push(`s.price ${key==='minPrice'?'>=':'<='} ${bind(Number(raw))}`);
      }
      if(req.query.minPrice!==undefined&&req.query.maxPrice!==undefined&&Number(req.query.minPrice)>Number(req.query.maxPrice))throw Error('query');
    }catch {res.status(400).json({error:{code:'INVALID_QUERY',message:'Bộ lọc hoặc phân trang không hợp lệ.',requestId:res.locals.requestId}});return;}
    const result=await db.transaction(async tx=>{
      const total=(await tx.query<{total:number}>(`SELECT COUNT(*) AS total ${source} WHERE ${where.join(' AND ')}`,values)).rows[0]!.total;
      const offset=values.length+1,limit=values.length+2;
      const items=await jsonRows(tx,`SELECT ${projection} ${source} WHERE ${where.join(' AND ')} ORDER BY ${sort} OFFSET @arg${offset} ROWS FETCH NEXT @arg${limit} ROWS ONLY`,[...values,(page-1)*pageSize,pageSize]);
      const categoryTotal=(await tx.query<{total:number}>(`SELECT COUNT(*) AS total ${source} WHERE p.active=1 AND (@arg1 IS NULL OR p.category_id=@arg1)`,[req.query.category??null])).rows[0]!.total;
      const facets=await tx.query<{sub_category:string}>(`SELECT DISTINCT p.sub_category ${source} WHERE p.active=1 AND p.sub_category IS NOT NULL AND (@arg1 IS NULL OR p.category_id=@arg1) ORDER BY p.sub_category`,[req.query.category??null]);
      return {items,total,page,pageSize,categoryTotal,subCategories:facets.rows.map(row=>row.sub_category)};
    });
    res.json(result);
  });
  return router;
}
