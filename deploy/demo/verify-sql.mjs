import assert from 'node:assert/strict';
import {readConfig} from '/app/backend/dist/config.js';
import {createDatabase} from '/app/backend/dist/db/database.js';
const config=readConfig();
assert.equal(config.database.database,'AuraDemoDocker');
assert.equal(config.database.user,'aura_demo_app');
const db=createDatabase(config.database);
try {
  const permissions=(await db.query("SELECT IS_SRVROLEMEMBER('sysadmin') AS sysadmin,HAS_DBACCESS('AuraStoreDocker') AS mainDatabaseAccess,HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS createTable,HAS_PERMS_BY_NAME('dbo.schema_migrations','OBJECT','UPDATE') AS updateMigrations")).rows[0];
  assert.equal(permissions.sysadmin,0);assert.equal(permissions.mainDatabaseAccess,0);assert.equal(permissions.createTable,0);assert.equal(permissions.updateMigrations,0);
  const counts=(await db.query('SELECT (SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM inventory_skus) AS skus,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COUNT(*) FROM admin_users) AS admins,(SELECT COUNT(*) FROM customers) AS customers')).rows[0];
  assert.deepEqual(counts,{products:8,skus:24,orders:6,admins:2,customers:1});
  const stock=(await db.query("SELECT sku,on_hand AS onHand,reserved FROM inventory_skus WHERE sku IN ('DEMO-IPHONE-1-1','DEMO-IPHONE-2-1','DEMO-IPAD-3-1','DEMO-IPAD-4-1','DEMO-MAC-5-1','DEMO-MAC-6-1') ORDER BY sku")).rows;
  assert.deepEqual(stock.map(x=>[x.onHand,x.reserved]),[[19,0],[19,0],[20,1],[20,1],[19,0],[20,0]]);
  const revenue=(await db.query("SELECT SUM(total) AS amount FROM orders WHERE status='COMPLETED' AND payment_status='PAID'")).rows[0];assert.equal(Number(revenue.amount),25000000);
  console.log(JSON.stringify({at:new Date().toISOString(),database:'AuraDemoDocker',permissions,counts,stock,revenue:Number(revenue.amount)},null,2));
} finally {await db.close();}
