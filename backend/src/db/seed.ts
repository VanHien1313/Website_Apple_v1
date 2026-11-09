import { lockTransaction } from './database.ts';
import type { Database } from './database.ts';

export async function seedDemo(db: Database, env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === 'production' || env.ALLOW_DEMO_SEED !== 'true') throw new Error('Demo seed requires ALLOW_DEMO_SEED=true and a non-production environment.');
  await db.transaction(async (tx) => {
    await lockTransaction(tx, 'aura:seed');
    await tx.query("IF NOT EXISTS (SELECT 1 FROM categories WHERE id='demo-hardware') INSERT INTO categories(id,name) VALUES ('demo-hardware',N'Thiết bị mẫu B1')");
    await tx.query(`IF NOT EXISTS (SELECT 1 FROM products WHERE id=@arg1) INSERT INTO products(id,category_id,slug,name,thumbnail,description)
      VALUES (@arg1,'demo-hardware','sample-device-b1',N'Thiết bị mẫu B1','/images/placeholder.svg',N'["Dữ liệu giả để kiểm thử schema; không phải sản phẩm thương mại."]')`, ['00000000-0000-4000-8000-000000000001']);
    await tx.query("IF NOT EXISTS (SELECT 1 FROM variants WHERE id=@arg1) INSERT INTO variants(id,product_id,storage) VALUES (@arg1,@arg2,'128GB')", ['00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001']);
    await tx.query("IF NOT EXISTS (SELECT 1 FROM colors WHERE id=@arg1) INSERT INTO colors(id,product_id,name,hex,image) VALUES (@arg1,@arg2,N'Màu mẫu','#111111','/images/placeholder.svg')", ['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001']);
    await tx.query(`IF NOT EXISTS (SELECT 1 FROM inventory_skus WHERE id=@arg1) INSERT INTO inventory_skus(id,product_id,variant_id,color_id,sku,price,original_price,on_hand)
      VALUES (@arg1,@arg2,@arg3,@arg4,'DEMO-B1-128-BLACK',10000000,11000000,5)`, ['00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']);
  });
}
