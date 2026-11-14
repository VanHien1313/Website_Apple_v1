ALTER TABLE customers ADD shipping_address nvarchar(max) NULL;
EXEC(N'ALTER TABLE customers ADD CONSTRAINT CK_customers_shipping_address CHECK (shipping_address IS NULL OR ISJSON(shipping_address)=1)');
