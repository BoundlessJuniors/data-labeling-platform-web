ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'payment_pending';

ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'disputed';

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'released';