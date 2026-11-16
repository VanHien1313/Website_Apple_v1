CREATE TABLE customer_social_identities (
  provider varchar(10) NOT NULL CHECK (provider IN ('google', 'zalo')),
  subject nvarchar(200) COLLATE Latin1_General_100_BIN2 NOT NULL,
  customer_id uniqueidentifier NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, subject),
  UNIQUE (customer_id, provider)
);
