CREATE TABLE media_images (
  id uniqueidentifier NOT NULL PRIMARY KEY,
  created_by uniqueidentifier NOT NULL REFERENCES admin_users(id),
  content varbinary(max) NOT NULL,
  width int NOT NULL CHECK (width BETWEEN 1 AND 2400),
  height int NOT NULL CHECK (height BETWEEN 1 AND 2400),
  created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_media_size CHECK (DATALENGTH(content) BETWEEN 1 AND 5242880)
);
