ALTER TABLE orders ADD guest_receipt_hash varchar(64) NULL;
EXEC(N'ALTER TABLE orders ADD CONSTRAINT CK_order_guest_receipt CHECK (
  guest_receipt_hash IS NULL OR (customer_id IS NULL AND LEN(guest_receipt_hash)=64
    AND guest_receipt_hash COLLATE Latin1_General_100_BIN2 NOT LIKE ''%[^a-f0-9]%'')
);');
