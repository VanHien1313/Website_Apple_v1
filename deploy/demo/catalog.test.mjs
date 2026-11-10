import test from 'node:test';
import assert from 'node:assert/strict';
import { demoProducts, demoId, categories, illustration } from './catalog.mjs';
import { parseProduct } from '../../backend/src/products-input.ts';

test('demo dataset passes real product validation and has globally distinct SKU/config/color IDs', () => {
  const ids=[],skus=[];
  for(const product of demoProducts) {
    const parsed=parseProduct(product);
    assert.ok(categories.some(c=>c.id===parsed.categoryId));
    assert.match(parsed.name,/Demo/);
    assert.equal(parsed.skus.filter(sku=>sku.onHand===0).length,1);
    ids.push(parsed.id,...parsed.configurations.map(x=>x.id),...parsed.colors.map(x=>x.id),...parsed.skus.map(x=>x.id));
    skus.push(...parsed.skus.map(x=>x.sku));
  }
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(new Set(skus).size,24);
  assert.equal(demoProducts.length,8);
  assert.equal(demoProducts[0].skus[0].price,10000000);
});
test('demo IDs are deterministic and illustrations have no external resources', () => {
  assert.equal(demoId('order:0'),demoId('order:0'));
  assert.notEqual(demoId('order:0'),demoId('order:1'));
  for(const category of categories) {
    const svg=illustration(category.id,'#667788');
    assert.match(svg,/<svg/);
    assert.doesNotMatch(svg,/<script|href=|<image|foreignObject/);
  }
});
