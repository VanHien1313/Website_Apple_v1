DECLARE @checks nvarchar(max);
SELECT @checks=STRING_AGG(CAST(N'ALTER TABLE '+QUOTENAME(OBJECT_NAME(parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(name)+N';' AS nvarchar(max)),N'') FROM sys.check_constraints
WHERE (parent_object_id=OBJECT_ID('orders') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID('orders'),'payment_method','ColumnId')) OR (parent_object_id=OBJECT_ID('payments') AND parent_column_id=COLUMNPROPERTY(OBJECT_ID('payments'),'method','ColumnId'));
IF @checks IS NOT NULL EXEC sp_executesql @checks;
ALTER TABLE orders ADD CONSTRAINT CK_orders_payment_method CHECK(payment_method IN ('cod','momo','zalopay'));
ALTER TABLE payments ADD CONSTRAINT CK_payments_method CHECK(method IN ('cod','momo','zalopay'));
CREATE TABLE wallet_attempts (
 order_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES orders(id),
 provider varchar(16) NOT NULL CHECK(provider IN ('momo','zalopay')),
 provider_order_id varchar(64) NOT NULL UNIQUE,
 environment varchar(16) NOT NULL CHECK(environment='sandbox'),
 amount bigint NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'CREATING' CHECK(state IN ('CREATING','READY','PAID','REVIEW')),
 pay_url nvarchar(2048) NULL, qr_payload nvarchar(3000) NULL,
 created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 expires_at datetime2 NOT NULL DEFAULT DATEADD(minute,15,SYSUTCDATETIME()),
 checked_at datetime2 NULL
);
