// Container-only initializer. Fixed demo DB; never drops, truncates or rewrites an existing dataset.
import { createDatabase } from '/app/backend/dist/db/database.js';
import { readConfig } from '/app/backend/dist/config.js';
import { migrate, assertSchemaReady } from '/app/backend/dist/db/migrate.js';
import { bootstrapOwner } from '/app/backend/dist/auth/bootstrap.js';
import { createAuthService } from '/app/backend/dist/auth/service.js';
import { adminManagement } from '/app/backend/dist/admin-users.js';
import { categoryManagement } from '/app/backend/dist/categories-admin.js';
import { productManagement } from '/app/backend/dist/products-admin.js';
import { createOrderService } from '/app/backend/dist/checkout/orders.js';
import { orderManagement } from '/app/backend/dist/checkout/management.js';
import { quoteCart } from '/app/backend/dist/checkout/quote.js';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { categories, demoProducts, demoId, illustration } from './catalog.mjs';
const sharp = createRequire('/app/backend/package.json')('sharp');

let master, db, stage = 'configuration';
try {
  const config = readConfig();
  if (config.mode !== 'development' || config.database.database !== 'AuraDemoDocker' || config.database.server !== 'db' || config.database.user !== 'sa') throw new Error('Invalid demo target');
  let raw=''; for await (const chunk of process.stdin) { raw+=chunk; if(raw.length>8192) throw new Error('Input too large'); }
  const secret=JSON.parse(raw);
  for(const key of ['ownerPassword','editorPassword','customerPassword','databasePassword']) if(typeof secret[key]!=='string' || secret[key].length<16 || secret[key].length>128) throw new Error('Invalid credentials');
  master=createDatabase({...config.database,database:'master'});
  const exists=(await master.query("SELECT DB_ID(N'AuraDemoDocker') AS id")).rows[0].id;
  stage='database';
  if(!exists) await master.exec('CREATE DATABASE [AuraDemoDocker]');
  db=createDatabase(config.database);
  if(exists) {
    const marker=(await db.query("SELECT OBJECT_ID(N'dbo.aura_demo_dataset') AS id")).rows[0].id;
    if(!marker || (await db.query("SELECT version FROM dbo.aura_demo_dataset WHERE version='demo-v1-ready'")).rows.length!==1) throw new Error('Existing or incomplete database; refusing to overwrite');
    await assertSchemaReady(db);
    const runtime=createDatabase({...config.database,user:'aura_demo_app',password:secret.databasePassword});
    try {await assertSchemaReady(runtime);} finally {await runtime.close();}
    console.log(JSON.stringify({event:'demo_preserved',database:'AuraDemoDocker'}));
  } else {
    stage='migrations'; await migrate(db);
    await db.exec('CREATE TABLE dbo.aura_demo_dataset(version varchar(40) PRIMARY KEY)');
    stage='accounts';
    await bootstrapOwner(db,'owner@aura.example.test','Chủ cửa hàng Demo',secret.ownerPassword);
    const auth=createAuthService(db), owner=await auth.login('admin','owner@aura.example.test',secret.ownerPassword);
    await adminManagement(db).create(owner.token,{email:'editor@aura.example.test',name:'Biên tập viên Demo',password:secret.editorPassword,role:'editor',active:true});
    await auth.register({shippingAddress:{address:'Địa chỉ minh họa đồ án',province:'Thành phố Hồ Chí Minh',ward:'Phường minh họa'},email:'customer@aura.example.test',fullName:'Khách hàng Demo',phone:'0900000001',password:secret.customerPassword});
    const customer=await auth.login('customer','customer@aura.example.test',secret.customerPassword);
    stage='catalog';
    for(const category of categories) await categoryManagement(db).write(owner.token,'create',category.id,category);
    for(const product of demoProducts) {
      const content=await sharp(Buffer.from(illustration(product.categoryId,product.tint))).webp().toBuffer();
      await db.query('INSERT INTO media_images(id,created_by,content,width,height) VALUES (@arg1,@arg2,@arg3,800,600)',[product.mediaId,owner.profile.id,content]);
      await productManagement(db).save(owner.token,product,true);
    }
    stage='orders';
    const management=orderManagement(db), states=['PENDING','PROCESSING','SHIPPED','DELIVERED','COMPLETED','CANCELLED'];
    for(let i=0;i<states.length;i++) {
      const items=[{skuId:demoProducts[i].skus[0].id,quantity:1}], quote=await quoteCart(db,{items,shippingMethod:'standard'});
      const created=await createOrderService(db).create({items,shippingMethod:'standard',paymentMethod:'cod',customer:{fullName:'Khách hàng Demo',phone:'0900000001',email:'customer@aura.example.test'},shippingAddress:{address:'Địa chỉ minh họa đồ án',province:'Thành phố Hồ Chí Minh',ward:'Phường minh họa',notes:'ĐƠN DEMO — không giao hàng thật'},requestId:demoId(`order:${i}`),receiptToken:randomBytes(32).toString('hex'),expectedTotal:quote.grandTotal,expectedPrices:quote.lines.map(line=>({skuId:line.skuId,price:line.price}))},customer.token);
      const actions=states[i]==='CANCELLED' ? [['status','CANCELLED']] : [['status','PROCESSING'],['status','SHIPPED'],['status','DELIVERED'],['payment','PAID'],['status','COMPLETED']];
      if(states[i]!=='PENDING') for(const [kind,target] of actions) {
        const order=await management.get(true,owner.token,created.order.id);
        await management.update(true,owner.token,created.order.id,{kind,target,revision:order.revision,note:'Trình diễn nghiệp vụ, không giao dịch thật'});
        if(target===states[i]) break;
      }
    }
    await auth.logout('customer',customer.token); await auth.logout('admin',owner.token);
    stage='runtime_login';
    await master.query(`IF SUSER_ID(N'aura_demo_app') IS NOT NULL THROW 51000, 'Demo login already exists; refusing password rotation', 1;
      DECLARE @sql nvarchar(max)=N'CREATE LOGIN [aura_demo_app] WITH PASSWORD=N'''+REPLACE(@arg1,'''','''''')+N''', CHECK_POLICY=ON'; EXEC sys.sp_executesql @sql;`,[secret.databasePassword]);
    await db.exec('CREATE USER [aura_demo_app] FOR LOGIN [aura_demo_app]; GRANT SELECT,INSERT,UPDATE,DELETE ON SCHEMA::dbo TO [aura_demo_app]; DENY INSERT,UPDATE,DELETE ON OBJECT::dbo.schema_migrations TO [aura_demo_app]; DENY INSERT,UPDATE,DELETE ON OBJECT::dbo.aura_demo_dataset TO [aura_demo_app];');
    await db.exec("INSERT INTO dbo.aura_demo_dataset(version) VALUES ('demo-v1-ready')");
    console.log(JSON.stringify({event:'demo_created',database:'AuraDemoDocker',products:demoProducts.length,skus:demoProducts.length*3,orders:states.length,accounts:3}));
  }
} catch {console.error(JSON.stringify({event:'demo_setup_failed',stage,message:'Setup stopped without deleting or overwriting existing data. Inspect the demo-only database before retrying; credentials were not logged.'}));process.exitCode=1;}
finally {await db?.close(); await master?.close();}
