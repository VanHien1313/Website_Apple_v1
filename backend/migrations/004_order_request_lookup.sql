-- Keep cross-session retry checks bounded without scanning every idempotency scope.
CREATE INDEX IX_idempotency_request_id ON idempotency_requests(request_id) INCLUDE(scope);
