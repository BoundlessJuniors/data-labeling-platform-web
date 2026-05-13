-- Composite indexes for periodic deadline/payment scans.
-- These match the worker predicates such as:
--   WHERE status = ... AND due_at <= now()
--   WHERE status = ... AND payment_expires_at <= now()

CREATE INDEX "contracts_status_due_at_idx" ON "contracts"("status", "due_at");
CREATE INDEX "contracts_status_auto_cancel_at_idx" ON "contracts"("status", "auto_cancel_at");
CREATE INDEX "contracts_status_review_due_at_idx" ON "contracts"("status", "review_due_at");
CREATE INDEX "contracts_status_revision_due_at_idx" ON "contracts"("status", "revision_due_at");

CREATE INDEX "payments_status_payment_expires_at_idx" ON "payments"("status", "payment_expires_at");
CREATE INDEX "payments_contract_id_status_paid_at_idx" ON "payments"("contract_id", "status", "paid_at");

CREATE INDEX "submissions_contract_id_format_status_idx" ON "submissions"("contract_id", "format", "status");
