import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiProductService, catalogParams } from '../src/services/api/productService';
import { request, HttpError } from '../src/services/api/http';
import { selectColorVariant, variantsForColor } from '../src/domain/productSelection';
import { MOCK_PRODUCTS } from '../src/data/mockProducts';
import { quoteCart } from '../src/services/api/quoteService';
import { createCartItem } from '../src/domain/cart';

test('API price brackets keep exact VND boundaries and encode literal searches', () => {
  for (const [range, min, max] of [['under15', 0, 14999999], ['15to25', 15000000, 25000000], ['25to35', 25000001, 35000000], ['above35', 35000001, Number.MAX_SAFE_INTEGER]] as const) {
    const params = catalogParams({ priceRange: range, searchQuery: 'Mac & iPad + 1', maxPrice: max });
    assert.equal(params.get('minPrice'), String(min)); assert.equal(params.get('maxPrice'), String(max));
    assert.equal(new URLSearchParams(params.toString()).get('q'), 'Mac & iPad + 1');
  }
  assert.equal(catalogParams({ maxPrice: 0 }).get('maxPrice'), '0');
});

test('color change preserves configuration, never picks another color, and keeps sold-out SKU visible', () => {
  const template = MOCK_PRODUCTS[0];
  const variant = template.variants[0];
  const product = { ...template, variants: [
    { ...variant, id: 'black-128', configurationId: '128', colorId: 'black' },
    { ...variant, id: 'white-128', configurationId: '128', colorId: 'white', inStock: false },
    { ...variant, id: 'white-256', configurationId: '256', colorId: 'white' },
  ] };
  assert.equal(selectColorVariant(product, 'white', product.variants[0])?.id, 'white-128');
  assert.equal(selectColorVariant(product, 'missing'), undefined);
  assert.deepEqual(variantsForColor(product, 'white').map((item) => item.id), ['white-128', 'white-256']);
  assert.equal(selectColorVariant(template, template.colors[0].id, variant)?.id, variant.id);
});

test('HTTP mutations send CSRF header and same-origin cookies, handle 204 and typed errors', async (t) => {
  const calls: RequestInit[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => { calls.push(init); return new Response(null, { status: 204 }); });
  await request('/auth/logout', { method: 'POST' });
  assert.equal(calls[0].credentials, 'same-origin');
  assert.equal((calls[0].headers as Record<string, string>)['X-Aura-Request'], '1');
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Expired' } }, { status: 401 }));
  await assert.rejects(request('/auth/me'), (error: unknown) => error instanceof HttpError && error.status === 401);
});

test('catalog clamps an obsolete page with one retry and forwards cancellation', async (t) => {
  const urls: string[] = [], signal = new AbortController().signal;
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    urls.push(url); assert.equal(init.signal, signal);
    return Response.json({ items: [], total: 7, pageSize: 6, page: urls.length === 1 ? 99 : 2, categoryTotal: 7, subCategories: [] });
  });
  assert.equal((await apiProductService.getCatalog({ page: 99, pageSize: 6 }, { signal })).page, 2);
  assert.equal(urls.length, 2); assert.match(urls[1], /page=2&/);
});

test('detail maps only 404 to missing; server/network errors never fall back to fixtures', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Missing' } }, { status: 404 }));
  assert.equal(await apiProductService.getProductBySlug('missing'), null);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Unavailable' } }, { status: 503 }));
  await assert.rejects(apiProductService.getProductBySlug('iphone'), HttpError);
});

test('API cart quote sends only SKU and quantity, never trusted client prices or totals', async (t) => {
  const product = MOCK_PRODUCTS[0], signal = new AbortController().signal;
  const item = createCartItem(product, product.variants[0], product.colors[0], 2);
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/v1/cart/quote'); assert.equal(init.signal, signal);
    assert.deepEqual(JSON.parse(String(init.body)), { items: [{ skuId: item.variant.id, quantity: 2 }], shippingMethod: 'express' });
    return Response.json({ lines: [], issues: [], subtotal: 0, totalDiscount: 0, shippingFee: 0, grandTotal: 0, canCheckout: false });
  });
  assert.equal((await quoteCart([item], 'express', signal)).canCheckout, false);
});
