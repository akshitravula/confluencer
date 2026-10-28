# Assumptions & Design Decisions

### 1. Currency & Monetary Precision
- Balances and transaction amounts are stored in integer cents (`balance_cents INTEGER`, `amount_cents INTEGER`).
- The API accepts numbers or decimals with up to two decimal places (e.g. `100.50`). Inputs with more decimal places are rejected with `400 Bad Request`.
- This ensures exact arithmetic and avoids standard IEEE 754 floating-point inaccuracies.

### 2. Transaction Immutability
- Transactions are append-only. There are no API endpoints to update or delete existing transactions.
- Account balance is always the aggregate result of valid credit and debit transactions.
- Any balance adjustments or reversals should be handled as separate compensating transactions.

### 3. Idempotency & Reference IDs
- `reference_id` is unique within each account (`UNIQUE(account_id, reference_id)`).
- Submitting a duplicate `reference_id` for the same account returns `409 Conflict` and leaves the balance unchanged.
- The same `reference_id` can be used across different accounts.

### 4. Concurrency & Atomicity
- All operations modifying balances run within SQLite transactions using `BEGIN IMMEDIATE`.
- SQLite is configured with WAL mode and `busy_timeout = 5000` ms to serialize concurrent writes safely.
- Database-level check constraints (`balance_cents >= 0` and `amount_cents > 0`) ensure data integrity at the engine level.

### 5. Account Creation
- Accounts always start with a balance of `0.00`.
- Supplying an initial balance in the request body is rejected with `400 Bad Request`.
- Account IDs are generated as UUID v4 strings.

### 6. Transfers
- Transferring money between accounts requires both accounts to exist, distinct source/destination accounts, and sufficient source balance.
- Transfers debit the source account, credit the destination account, and record ledger entries atomically. If any part fails, changes are completely rolled back.
