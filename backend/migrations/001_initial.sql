-- SQL Server 2022+; UTC timestamps; integer VND. New SQL Server database only.
-- Prices are integer VND bounded to JavaScript's safe integer range.
CREATE TABLE categories (
  id nvarchar(200) PRIMARY KEY CHECK (LEN(id)>0 AND id COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^a-z0-9-]%' AND id NOT LIKE '-%' AND id NOT LIKE '%-' AND id NOT LIKE '%--%'),
  name nvarchar(200) NOT NULL CHECK (LEN(TRIM(name)) BETWEEN 1 AND 120)
);
ALTER TABLE categories ADD normalized_name AS LOWER(TRIM(name)) PERSISTED;
CREATE UNIQUE INDEX categories_name_unique ON categories(normalized_name);
CREATE TABLE products (
  id uniqueidentifier PRIMARY KEY, category_id nvarchar(200) NOT NULL REFERENCES categories(id) ON DELETE NO ACTION,
  slug nvarchar(200) NOT NULL UNIQUE CHECK (LEN(slug)>0 AND slug COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^a-z0-9-]%' AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%'),
  name nvarchar(200) NOT NULL CHECK (LEN(TRIM(name)) BETWEEN 1 AND 200),
  tagline nvarchar(200) NOT NULL DEFAULT '', description nvarchar(max) NOT NULL DEFAULT '[]' CHECK (ISJSON(description, ARRAY)=1),
  thumbnail nvarchar(2048) NOT NULL, gallery nvarchar(max) NOT NULL DEFAULT '[]' CHECK (ISJSON(gallery, ARRAY)=1),
  key_specs nvarchar(max) NOT NULL DEFAULT '[]' CHECK (ISJSON(key_specs, ARRAY)=1),
  detailed_specs nvarchar(max) NOT NULL DEFAULT '[]' CHECK (ISJSON(detailed_specs, ARRAY)=1),
  warranty_info nvarchar(2000) NOT NULL DEFAULT '', sub_category nvarchar(200), badge nvarchar(200) CHECK (badge IN (N'Mới',N'Bán chạy',N'Ưu đãi')),
  active bit NOT NULL DEFAULT 1,
  created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), updated_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX products_category_active ON products(category_id, active);
CREATE INDEX products_created ON products(created_at DESC, id);
CREATE TABLE variants (
  id uniqueidentifier PRIMARY KEY, product_id uniqueidentifier NOT NULL REFERENCES products(id) ON DELETE NO ACTION,
  storage nvarchar(200), screen_size nvarchar(200), connectivity nvarchar(200), chip nvarchar(200),
  UNIQUE (id, product_id)
);
CREATE TABLE colors (
  id uniqueidentifier PRIMARY KEY, product_id uniqueidentifier NOT NULL REFERENCES products(id) ON DELETE NO ACTION,
  name nvarchar(200) NOT NULL CHECK (LEN(TRIM(name)) BETWEEN 1 AND 120),
  hex nvarchar(200) NOT NULL CHECK (LEN(hex)=7 AND LEFT(hex,1)='#' AND SUBSTRING(hex,2,6) COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-fA-F]%'), image nvarchar(2048) NOT NULL,
  UNIQUE (id, product_id)
);
CREATE TABLE inventory_skus (
  id uniqueidentifier PRIMARY KEY, product_id uniqueidentifier NOT NULL REFERENCES products(id) ON DELETE NO ACTION,
  variant_id uniqueidentifier NOT NULL, color_id uniqueidentifier NOT NULL,
  sku nvarchar(200) NOT NULL CHECK (LEN(TRIM(sku)) BETWEEN 1 AND 120),
  price bigint NOT NULL CHECK (price BETWEEN 1 AND 9007199254740991), original_price bigint NOT NULL CHECK (original_price BETWEEN 0 AND 9007199254740991),
  on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  CHECK (original_price >= price), CHECK (reserved <= on_hand),
  FOREIGN KEY (variant_id, product_id) REFERENCES variants(id, product_id) ON DELETE NO ACTION,
  FOREIGN KEY (color_id, product_id) REFERENCES colors(id, product_id) ON DELETE NO ACTION,
  UNIQUE (variant_id, color_id)
);
ALTER TABLE inventory_skus ADD normalized_sku AS LOWER(TRIM(sku)) PERSISTED;
CREATE UNIQUE INDEX inventory_sku_unique ON inventory_skus(normalized_sku);
CREATE INDEX inventory_product ON inventory_skus(product_id);
CREATE TABLE customers (
  id uniqueidentifier PRIMARY KEY, email nvarchar(254) NOT NULL CHECK (email COLLATE Latin1_General_100_BIN2 = lower(TRIM(email)) COLLATE Latin1_General_100_BIN2 AND CHARINDEX('@',email) > 1),
  full_name nvarchar(200) NOT NULL CHECK (LEN(TRIM(full_name)) BETWEEN 1 AND 120), phone nvarchar(200) NOT NULL,
  password_hash nvarchar(2000) NOT NULL CHECK (LEN(password_hash) > 0),
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), UNIQUE(email)
);
CREATE TABLE admin_users (
  id uniqueidentifier PRIMARY KEY, email nvarchar(254) NOT NULL UNIQUE CHECK (email COLLATE Latin1_General_100_BIN2 = lower(TRIM(email)) COLLATE Latin1_General_100_BIN2 AND CHARINDEX('@',email) > 1),
  name nvarchar(200) NOT NULL CHECK (LEN(TRIM(name)) BETWEEN 1 AND 120),
  password_hash nvarchar(2000) NOT NULL CHECK (LEN(password_hash) > 0),
  role nvarchar(200) NOT NULL CHECK (role IN ('owner','editor')), active bit NOT NULL DEFAULT 1,
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0), created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE sessions (
  token_hash nvarchar(200) PRIMARY KEY CHECK (LEN(token_hash)=64 AND token_hash COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^a-f0-9]%'),
  customer_id uniqueidentifier REFERENCES customers(id) ON DELETE CASCADE,
  admin_id uniqueidentifier REFERENCES admin_users(id) ON DELETE CASCADE,
  credential_version integer NOT NULL CHECK (credential_version > 0),
  created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), expires_at datetime2(3) NOT NULL, revoked_at datetime2(3),
  CHECK ((CASE WHEN customer_id IS NULL THEN 0 ELSE 1 END + CASE WHEN admin_id IS NULL THEN 0 ELSE 1 END) = 1), CHECK (expires_at > created_at)
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX sessions_customer ON sessions(customer_id);
CREATE INDEX sessions_admin ON sessions(admin_id);
CREATE TABLE orders (
  id uniqueidentifier PRIMARY KEY, order_code nvarchar(200) NOT NULL UNIQUE,
  customer_id uniqueidentifier REFERENCES customers(id) ON DELETE NO ACTION,
  customer_snapshot nvarchar(max) NOT NULL CHECK (ISJSON(customer_snapshot, OBJECT)=1),
  shipping_address nvarchar(max) NOT NULL CHECK (ISJSON(shipping_address, OBJECT)=1),
  shipping_method nvarchar(200) NOT NULL CHECK (shipping_method IN ('standard','express')),
  payment_method nvarchar(200) NOT NULL DEFAULT 'cod' CHECK (payment_method = 'cod'),
  status nvarchar(200) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','COMPLETED','CANCELLED')),
  payment_status nvarchar(200) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID','FAILED','REFUNDED')),
  subtotal bigint NOT NULL CHECK (subtotal BETWEEN 0 AND 9007199254740991), discount bigint NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 9007199254740991),
  shipping_fee bigint NOT NULL CHECK (shipping_fee BETWEEN 0 AND 9007199254740991), total bigint NOT NULL CHECK (total BETWEEN 0 AND 9007199254740991),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), completed_at datetime2(3),
  -- discount represents savings against original price; subtotal already uses sale price.
  CHECK (total = subtotal + shipping_fee),
  CHECK ((status = 'COMPLETED' AND completed_at IS NOT NULL) OR (status <> 'COMPLETED' AND completed_at IS NULL)),
  CHECK (status <> 'COMPLETED' OR payment_status IN ('PAID','REFUNDED')),
  CHECK (completed_at IS NULL OR completed_at >= created_at)
);
CREATE INDEX orders_customer_created ON orders(customer_id, created_at DESC, id);
CREATE INDEX orders_status_created ON orders(status, created_at DESC, id);
CREATE INDEX orders_revenue ON orders(completed_at, payment_status) WHERE status = 'COMPLETED';
CREATE TABLE order_items (
  id uniqueidentifier PRIMARY KEY, order_id uniqueidentifier NOT NULL REFERENCES orders(id) ON DELETE NO ACTION,
  sku_id uniqueidentifier REFERENCES inventory_skus(id) ON DELETE NO ACTION,
  product_id uniqueidentifier NOT NULL, variant_id uniqueidentifier NOT NULL,
  product_name nvarchar(200) NOT NULL, product_image nvarchar(2048) NOT NULL, color_name nvarchar(200) NOT NULL, storage nvarchar(200),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  unit_price bigint NOT NULL CHECK (unit_price BETWEEN 0 AND 9007199254740991), total_price bigint NOT NULL CHECK (total_price BETWEEN 0 AND 9007199254740991),
  CHECK (total_price = unit_price * quantity)
);
CREATE INDEX order_items_order ON order_items(order_id);
CREATE TABLE order_events (
  id uniqueidentifier PRIMARY KEY, order_id uniqueidentifier NOT NULL REFERENCES orders(id) ON DELETE NO ACTION,
  actor_type nvarchar(200) NOT NULL CHECK (actor_type IN ('customer','admin','system')),
  customer_id uniqueidentifier REFERENCES customers(id) ON DELETE NO ACTION,
  admin_id uniqueidentifier REFERENCES admin_users(id) ON DELETE NO ACTION,
  actor_name nvarchar(200) NOT NULL, kind nvarchar(200) NOT NULL CHECK (kind IN ('status','payment')),
  from_state nvarchar(200) NOT NULL, to_state nvarchar(200) NOT NULL,
  note nvarchar(2000) NOT NULL CHECK (LEN(TRIM(note)) BETWEEN 1 AND 2000), at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  CHECK ((actor_type = 'customer' AND customer_id IS NOT NULL AND admin_id IS NULL)
    OR (actor_type = 'admin' AND admin_id IS NOT NULL AND customer_id IS NULL)
    OR (actor_type = 'system' AND customer_id IS NULL AND admin_id IS NULL))
);
CREATE INDEX order_events_order ON order_events(order_id, at);
EXEC(N'CREATE TRIGGER dbo.order_events_immutable ON dbo.order_events INSTEAD OF UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51001, ''Order events are append-only'', 1; END');
CREATE TABLE payments (
  id uniqueidentifier PRIMARY KEY, order_id uniqueidentifier NOT NULL REFERENCES orders(id) ON DELETE NO ACTION,
  method nvarchar(200) NOT NULL CHECK (method = 'cod'),
  status nvarchar(200) NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  amount bigint NOT NULL CHECK (amount BETWEEN 0 AND 9007199254740991), provider_ref nvarchar(200), paid_at datetime2(3), refunded_at datetime2(3),
  CHECK (status NOT IN ('PAID','REFUNDED') OR paid_at IS NOT NULL),
  CHECK (status <> 'REFUNDED' OR refunded_at IS NOT NULL)
);
CREATE INDEX payments_order ON payments(order_id);
CREATE TABLE reservations (
  id uniqueidentifier PRIMARY KEY, order_id uniqueidentifier NOT NULL REFERENCES orders(id) ON DELETE NO ACTION,
  sku_id uniqueidentifier NOT NULL REFERENCES inventory_skus(id) ON DELETE NO ACTION,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  expires_at datetime2(3) NOT NULL,
  status nvarchar(200) NOT NULL CHECK (status IN ('HELD','CONSUMED','RELEASED','EXPIRED')),
  UNIQUE(order_id, sku_id)
);
CREATE INDEX reservations_expiry ON reservations(expires_at) WHERE status = 'HELD';
CREATE TABLE idempotency_requests (
  scope nvarchar(200) NOT NULL CHECK (LEN(scope) BETWEEN 1 AND 200), request_id nvarchar(200) NOT NULL CHECK (LEN(request_id) BETWEEN 1 AND 200),
  fingerprint nvarchar(200) NOT NULL CHECK (LEN(fingerprint)=64 AND fingerprint COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^a-f0-9]%'),
  order_id uniqueidentifier NOT NULL REFERENCES orders(id) ON DELETE NO ACTION,
  created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(), expires_at datetime2(3) NOT NULL,
  PRIMARY KEY(scope, request_id), CHECK (expires_at > created_at)
);
CREATE INDEX idempotency_expiry ON idempotency_requests(expires_at);

CREATE UNIQUE INDEX payments_provider_ref_unique ON payments(provider_ref) WHERE provider_ref IS NOT NULL;

