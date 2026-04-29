# Lifecycle & Regression Checklist

## End-to-End Test Scenarios

### A. pending_payment cancel
- **Action:** Client accepts proposal
- **State:** Contract becomes `pending_payment`
- **Action:** Client cancels before payment
- **Expected:**
  - contract → `cancelled`
  - payment → `expired` if exists
  - listing → `open`
  - proposal → `pending`

### B. payment success
- **Action:** Client mock-pays `pending_payment` contract
- **Expected:**
  - payment → `paid`
  - contract → `active`
  - `startedAt`, `dueAt`, `autoCancelAt` set
  - listing → `in_progress`
  - other pending proposals rejected if PaymentService already handles this

### C. client cancellation after payment
- **Action:** Client cancels `active`/`overdue` contract with reason
- **Expected:**
  - contract → `disputed`
  - payment remains `paid`
  - listing remains `in_progress`
  - no refund ledger is created
  - admin can see dispute buttons

### D. admin resolves dispute as refund_client
- **Action:** Admin resolves dispute, chooses to refund client
- **Expected:**
  - contract → `refunded`
  - payment → `refunded`
  - listing → `open`
  - proposal → `rejected`
  - labeler can re-apply

### E. admin resolves dispute as release_to_labeler
- **Action:** Admin resolves dispute, chooses to release payment to labeler
- **Expected:**
  - contract → `approved`
  - payment → `released`
  - listing → `completed`
  - `release_to_labeler` and `platform_fee` ledger rows created

### F. labeler re-apply after rejected/withdrawn
- **Action:** Labeler re-applies to listing after existing proposal was rejected/withdrawn
- **Expected:**
  - existing proposal row is updated to `pending`
  - no unique constraint error
  - pending/accepted duplicate application still fails

### G. submitted contract cancellation
- **Action:** Client tries to cancel `submitted` contract directly
- **Expected:**
  - direct cancel blocked
  - client must approve/reject/dispute flow
