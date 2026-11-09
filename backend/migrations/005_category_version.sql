-- A database-wide rowversion also prevents stale writes after deleting/recreating a category ID.
ALTER TABLE categories ADD version rowversion NOT NULL;
