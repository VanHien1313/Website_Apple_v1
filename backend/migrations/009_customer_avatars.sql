CREATE TABLE customer_avatars (
  customer_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES customers(id),
  content varbinary(max) NOT NULL,
  updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
