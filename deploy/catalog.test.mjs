import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseProduct} from '../backend/src/products-input.ts';
const data=JSON.parse(await fs.readFile(new URL('./catalog/catalog.json',import.meta.url),'utf8'));
test('original catalog maps to valid unique SQL products, variants, colors and SKUs',()=>{
 const ids=[],skus=[];
 for(const value of data.products){const p=parseProduct(value);ids.push(p.id,...p.configurations.map(v=>v.id),...p.colors.map(c=>c.id),...p.skus.map(k=>k.id));skus.push(...p.skus.map(k=>k.sku));assert.ok(data.categories.some(c=>c.id===p.categoryId));
 for(const url of [p.thumbnail,...p.gallery,...p.colors.map(c=>c.image)])assert.ok(data.media.some(m=>url==='/api/v1/media/'+m.id));}
 assert.equal(data.products.length,24);assert.equal(new Set(ids).size,ids.length);assert.equal(new Set(skus).size,92);
});
test('all image bytes match manifest; no remote runtime image dependencies',async()=>{
 for(const m of data.media){const bytes=await fs.readFile(new URL('./catalog/'+m.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),m.sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(m.width>0&&m.height>0);}
});
