ALTER TABLE orders ADD delivered_at datetime2 NULL,
 receipt_status varchar(16) NOT NULL CONSTRAINT DF_orders_receipt DEFAULT 'WAITING',
 receipt_confirmed_at datetime2 NULL;
EXEC(N'ALTER TABLE orders ADD CONSTRAINT CK_orders_receipt CHECK (receipt_status IN (''WAITING'',''CONFIRMED'',''AUTO'',''REPORTED'',''LEGACY''));');
EXEC(N'UPDATE orders SET delivered_at=COALESCE((SELECT MAX(at) FROM order_events e WHERE e.order_id=orders.id AND e.kind=''status'' AND e.to_state=''DELIVERED''),SYSUTCDATETIME()) WHERE status IN (''DELIVERED'',''COMPLETED'');');
EXEC(N'UPDATE orders SET receipt_status=''LEGACY'',receipt_confirmed_at=COALESCE(completed_at,delivered_at) WHERE status=''COMPLETED'';');
EXEC(N'CREATE INDEX orders_receipt_due ON orders(status,receipt_status,delivered_at);');
