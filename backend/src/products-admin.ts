import { queryChoice, namedSorts } from './list-query.ts';
import express, { Router } from 'express';
import { lockTransaction, type Database, type SqlClient } from './db/database.ts';
import { requireAdmin } from './auth/admin-access.ts';
import { ApiError } from './auth/service.ts';
import type { AuthOptions } from './auth/router.ts';
import { guid, parseProduct } from './products-input.ts';

const version = 'CONVERT(varchar(16),CAST(version AS binary(8)),2)';
async function read(tx: SqlClient, id: string) {
  const row = (await tx.query<Record<string, unknown> & { id: string; revision: string }>(`SELECT id,slug,name,category_id AS categoryId,active,tagline,thumbnail,gallery,description,key_specs AS keySpecs,
    detailed_specs AS detailedSpecs,warranty_info AS warrantyInfo,sub_category AS subCategory,badge,${version} AS revision FROM products WHERE id=@arg1`, [id])).rows[0];
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
  const configurations = (await tx.query('SELECT id,storage,screen_size AS screenSize,connectivity,chip FROM variants WHERE product_id=@arg1 ORDER BY id', [id])).rows;
  const colors = (await tx.query('SELECT id,name,hex,image FROM colors WHERE product_id=@arg1 ORDER BY id', [id])).rows;
  const skus = (await tx.query(`SELECT id,variant_id AS configurationId,color_id AS colorId,sku,price,original_price AS originalPrice,on_hand AS onHand,reserved,revision FROM inventory_skus WHERE product_id=@arg1 ORDER BY id`, [id])).rows;
  return { ...row, gallery: JSON.parse(String(row.gallery)), description: JSON.parse(String(row.description)), keySpecs: JSON.parse(String(row.keySpecs)), detailedSpecs: JSON.parse(String(row.detailedSpecs)),
    configurations, colors, skus: skus.map((sku) => ({ ...sku, price: Number(sku.price), originalPrice: Number(sku.originalPrice) })) };
}
export function productManagement(db: Database) {
  return {
    async list(token: string | undefined, query: Record<string, unknown>) {
      const sort = queryChoice(query.sort, namedSorts, 'newest');
      const q = query.q ?? '', active = query.active ?? '', page = Number(query.page ?? 1);
      if (typeof q !== 'string' || q.length > 120 || !['', 'true', 'false'].includes(String(active)) || typeof active !== 'string' || !Number.isInteger(page) || page < 1 || page > 10000) throw new ApiError(422, 'INVALID_QUERY', 'Bộ lọc sản phẩm không hợp lệ.');
      return db.transaction(async (tx) => {
        await requireAdmin(tx, token);
        const where = "WHERE (@arg1='' OR CHARINDEX(@arg1,name)>0 OR CHARINDEX(@arg1,slug)>0) AND (@arg2='' OR active=CASE WHEN @arg2='true' THEN 1 ELSE 0 END)";
        const total = Number((await tx.query<{ total: number }>(`SELECT COUNT(*) AS total FROM products ${where}`, [q.trim(), active])).rows[0]!.total);
        const currentPage = Math.min(page, Math.max(1, Math.ceil(total / 20)));
        const items = (await tx.query(`SELECT id,name,slug,category_id AS categoryId,active,thumbnail,${version} AS revision FROM products ${where} ORDER BY ${sort} OFFSET @arg3 ROWS FETCH NEXT 20 ROWS ONLY`, [q.trim(), active, (currentPage - 1) * 20])).rows;
        return { items, total, page: currentPage, pageSize: 20 };
      });
    },
    async get(token: string | undefined, id: string) { guid(id); return db.transaction(async (tx) => { await requireAdmin(tx, token); return read(tx, id); }); },
    async save(token: string | undefined, value: unknown, creating: boolean) {
      const input = parseProduct(value);
      if (!creating && !input.revision) throw new ApiError(422, 'INVALID_REVISION', 'Thiếu phiên bản sản phẩm.');
      return db.transaction(async (tx) => {
        await requireAdmin(tx, token);
        // Catalog writes are rare; one namespace lock avoids slug/SKU uniqueness races.
        await lockTransaction(tx, 'catalog:products');
        // Match checkout/fulfillment SKU lock ordering BEFORE taking the product update lock.
        for (const sku of [...input.skus].sort((a, b) => a.id.localeCompare(b.id))) await lockTransaction(tx, `inventory:${sku.id}`);
        const existing = (await tx.query<{ revision: string }>(`SELECT ${version} AS revision FROM products WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1`, [input.id])).rows[0];
        if (creating && existing) throw new ApiError(409, 'PRODUCT_EXISTS', 'Mã sản phẩm đã tồn tại.');
        if (!creating && !existing) throw new ApiError(404, 'NOT_FOUND', 'Sản phẩm không còn tồn tại.');
        if (!creating && existing!.revision !== input.revision!.toUpperCase()) throw new ApiError(409, 'STALE_PRODUCT', 'Sản phẩm đã thay đổi. Hãy tải lại trước khi lưu.');
        if (!(await tx.query('SELECT id FROM categories WHERE id=@arg1', [input.categoryId])).rows.length) throw new ApiError(422, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
        if ((await tx.query('SELECT id FROM products WHERE slug=@arg1 AND id<>@arg2', [input.slug, input.id])).rows.length) throw new ApiError(409, 'SLUG_EXISTS', 'Slug sản phẩm đã tồn tại.');
        // Uploaded image references must exist. Local /images paths are deploy-owned assets.
        const images = new Set([input.thumbnail, ...input.gallery, ...input.colors.map((color) => color.image)]);
        for (const path of images) if (path.startsWith('/api/v1/media/') && !(await tx.query('SELECT id FROM media_images WHERE id=@arg1', [path.split('/').pop()])).rows.length) throw new ApiError(422, 'IMAGE_NOT_FOUND', 'Ảnh tải lên không tồn tại.');
        const previousSkus = (await tx.query<{ id: string; variant_id: string; color_id: string; sku: string; reserved: number; revision: number }>('SELECT id,variant_id,color_id,sku,reserved,revision FROM inventory_skus WHERE product_id=@arg1', [input.id])).rows;
        const oldConfigs = (await tx.query<{ id: string }>('SELECT id FROM variants WHERE product_id=@arg1', [input.id])).rows;
        const oldColors = (await tx.query<{ id: string }>('SELECT id FROM colors WHERE product_id=@arg1', [input.id])).rows;
        if (previousSkus.some((old) => !input.skus.some((sku) => sku.id === old.id.toLowerCase())) || oldConfigs.some((old) => !input.configurations.some((row) => row.id === old.id.toLowerCase())) || oldColors.some((old) => !input.colors.some((row) => row.id === old.id.toLowerCase()))) throw new ApiError(409, 'IDENTITY_REMOVAL', 'Không được xóa SKU, cấu hình hoặc màu đã lưu. Hãy ẩn sản phẩm hoặc đặt tồn khả dụng về 0.');
        for (const sku of input.skus) {
          const old = previousSkus.find((row) => row.id.toLowerCase() === sku.id);
          if (old && (old.variant_id.toLowerCase() !== sku.configurationId || old.color_id.toLowerCase() !== sku.colorId || old.sku !== sku.sku)) throw new ApiError(409, 'SKU_IDENTITY_CHANGED', 'Mã SKU và cặp cấu hình/màu đã lưu không được đổi.');
          if (old && old.revision !== sku.revision) throw new ApiError(409, 'STALE_INVENTORY', 'Giá hoặc tồn kho đã thay đổi. Hãy tải lại sản phẩm.');
          if (old && sku.onHand < old.reserved) throw new ApiError(409, 'STOCK_RESERVED', 'Tồn kho không được thấp hơn lượng đang giữ cho đơn.');
          if ((await tx.query('SELECT id FROM inventory_skus WHERE (normalized_sku=LOWER(TRIM(@arg1)) OR id=@arg2) AND product_id<>@arg3', [sku.sku, sku.id, input.id])).rows.length) throw new ApiError(409, 'SKU_EXISTS', 'SKU đã được sử dụng bởi sản phẩm khác.');
        }
        for (const [table, rows] of [['variants', input.configurations], ['colors', input.colors]] as const) for (const row of rows) {
          if ((await tx.query(`SELECT id FROM ${table} WHERE id=@arg1 AND product_id<>@arg2`, [row.id, input.id])).rows.length) throw new ApiError(409, 'CHILD_ID_EXISTS', 'Mã cấu hình/màu thuộc sản phẩm khác.');
        }
        const values = [input.categoryId, input.slug, input.name, input.tagline, input.thumbnail, JSON.stringify(input.gallery), JSON.stringify(input.description), JSON.stringify(input.keySpecs), JSON.stringify(input.detailedSpecs), input.warrantyInfo, input.subCategory || null, input.badge, input.active, input.id];
        if (creating) await tx.query(`INSERT INTO products(category_id,slug,name,tagline,thumbnail,gallery,description,key_specs,detailed_specs,warranty_info,sub_category,badge,active,id)
          VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8,@arg9,@arg10,@arg11,@arg12,@arg13,@arg14)`, values);
        else await tx.query(`UPDATE products SET category_id=@arg1,slug=@arg2,name=@arg3,tagline=@arg4,thumbnail=@arg5,gallery=@arg6,description=@arg7,key_specs=@arg8,detailed_specs=@arg9,warranty_info=@arg10,sub_category=@arg11,badge=@arg12,active=@arg13,updated_at=SYSUTCDATETIME() WHERE id=@arg14`, values);
        for (const row of input.configurations) {
          const values = [row.storage || null, row.screenSize || null, row.connectivity || null, row.chip || null, row.id, input.id];
          if (oldConfigs.some((old) => old.id.toLowerCase() === row.id)) await tx.query('UPDATE variants SET storage=@arg1,screen_size=@arg2,connectivity=@arg3,chip=@arg4 WHERE id=@arg5 AND product_id=@arg6', values);
          else await tx.query('INSERT INTO variants(storage,screen_size,connectivity,chip,id,product_id) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6)', values);
        }
        for (const row of input.colors) {
          const values = [row.name, row.hex, row.image, row.id, input.id];
          if (oldColors.some((old) => old.id.toLowerCase() === row.id)) await tx.query('UPDATE colors SET name=@arg1,hex=@arg2,image=@arg3 WHERE id=@arg4 AND product_id=@arg5', values);
          else await tx.query('INSERT INTO colors(name,hex,image,id,product_id) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)', values);
        }
        for (const sku of input.skus) {
          if (previousSkus.some((old) => old.id.toLowerCase() === sku.id)) await tx.query('UPDATE inventory_skus SET price=@arg1,original_price=@arg2,on_hand=@arg3,revision=revision+1 WHERE id=@arg4', [sku.price, sku.originalPrice, sku.onHand, sku.id]);
          else await tx.query('INSERT INTO inventory_skus(id,product_id,variant_id,color_id,sku,price,original_price,on_hand) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8)', [sku.id, input.id, sku.configurationId, sku.colorId, sku.sku, sku.price, sku.originalPrice, sku.onHand]);
        }
        return read(tx, input.id);
      });
    },
  };
}
export function productsAdminRouter(db: Database, options: AuthOptions) {
  const router = Router(), service = productManagement(db), name = `${options.secure ? '__Host-' : ''}aura_admin`;
  const token = (raw?: string) => raw?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  router.use('/admin/products', async (req, _res, next) => {
    // Authenticate before accepting the larger product body.
    await db.transaction((tx) => requireAdmin(tx, token(req.headers.cookie)));
    if (req.method !== 'GET' && (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1' || !req.is('application/json'))) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    next();
  }, express.json({ limit: '256kb' }));
  router.get('/admin/products', async (req, res) => { res.json(await service.list(token(req.headers.cookie), req.query)); });
  router.get('/admin/products/:id', async (req, res) => { res.json(await service.get(token(req.headers.cookie), req.params.id)); });
  router.post('/admin/products', async (req, res) => { res.status(201).json(await service.save(token(req.headers.cookie), req.body, true)); });
  router.put('/admin/products/:id', async (req, res) => {
    if (guid(req.params.id) !== guid(req.body?.id)) throw new ApiError(422, 'PRODUCT_ID_MISMATCH', 'ID sản phẩm không khớp đường dẫn.');
    res.json(await service.save(token(req.headers.cookie), req.body, false));
  });
  return router;
}
