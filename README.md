# Transaction Ledger API

A lightweight backend service for a double-entry transaction ledger system built with Node.js, Express, TypeScript, and SQLite (`better-sqlite3`).

## Features
- **Accounts**: Create accounts with enforced zero initial balance and retrieve real-time balances.
- **Transactions**: Atomic credit and debit transactions with negative-balance prevention.
- **Idempotency**: Composite unique constraint on `(account_id, reference_id)` prevents accidental duplicate postings.
- **Transfers**: Inter-account fund transfers executed atomically with automatic rollback on failure.
- **History & Pagination**: Filter transactions by type (`credit`/`debit`) and page through history sorted latest-first.
- **Precision**: Monetary values are stored as integer cents in SQLite to avoid IEEE-754 floating point errors.
- **Zero External Dependencies**: Uses embedded SQLite with WAL mode enabled.

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation
```bash
git clone https://github.com/akshitravula/confluencer.git
cd confluencer
npm install
```

### Running Locally
```bash
# Development mode with live reload
npm run dev

# Or compile and run production build
npm run build
npm start
```
The server will start at `http://localhost:3000`.

- **Swagger UI**: `http://localhost:3000/docs`
- **Health Check**: `http://localhost:3000/health`
- **OpenAPI JSON**: `http://localhost:3000/openapi.json`

### Running Tests
```bash
# Run unit and integration tests
npm test

# Run tests with code coverage report
npm run test:coverage
```

---

## API Reference

### Accounts

#### Create Account
```http
POST /api/v1/accounts
Content-Type: application/json

{
  "name": "Alice Smith"
}
```
*Note: Accounts always start with a balance of 0. Passing `balance` in the request body is rejected with `400 Bad Request`.*

#### Get Account Balance
```http
GET /api/v1/accounts/:accountId/balance
```
Response:
```json
{
  "success": true,
  "data": {
    "account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "balance": 150.0
  }
}
```

#### Get Account by ID
```http
GET /api/v1/accounts/:accountId
```

#### List Accounts
```http
GET /api/v1/accounts
```

---

### Transactions

#### Add Transaction
```http
POST /api/v1/accounts/:accountId/transactions
Content-Type: application/json

{
  "type": "credit",
  "amount": 100.0,
  "description": "Initial deposit",
  "reference_id": "DEP-001"
}
```
*Transactions can also be posted directly to `POST /api/v1/transactions` with `account_id` in the body.*

Rules:
- `credit` increases the balance.
- `debit` decreases the balance. If the account has insufficient funds, returns `422 Unprocessable Entity` and leaves the balance unchanged.
- `reference_id` must be unique per account. Re-submitting the same `reference_id` returns `409 Conflict`.
- `amount` must be greater than 0 with at most 2 decimal places.

#### Get Transaction History
```http
GET /api/v1/accounts/:accountId/transactions?type=credit&page=1&limit=10
```
Query parameters:
- `type` (optional): `credit` or `debit`
- `page` (optional): defaults to 1
- `limit` (optional): defaults to 10 (max 100)

Results are always returned latest-first (`created_at DESC`).

---

### Transfers (Bonus)

#### Transfer Funds Between Accounts
```http
POST /api/v1/transfers
Content-Type: application/json

{
  "source_account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
  "destination_account_id": "b7132ef2-5a23-455b-8086-6395ec1ea9f0",
  "amount": 30.0,
  "reference_id": "TRF-001",
  "description": "Split dinner bill"
}
```
The debit from source and credit to destination happen inside a single database transaction. If the source has insufficient balance or either account is missing, the entire transfer is rolled back.

---

## Project Structure

```
confluencer/
├── src/
│   ├── app.ts                  # Express application setup
│   ├── server.ts               # HTTP server bootstrap
│   ├── config/                 # Env configuration & swagger definition
│   ├── database/               # SQLite connection & schema DDL
│   ├── constants/              # Error codes
│   ├── errors/                 # Custom error classes
│   ├── middlewares/            # Validation, error handler, 404
│   ├── modules/
│   │   ├── accounts/           # Accounts controller, service, repository, routes
│   │   ├── transactions/       # Transactions controller, service, repository, routes
│   │   └── transfers/          # Transfers controller, service, repository, routes
│   └── utils/                  # Currency conversions & response helpers
├── tests/
│   ├── setup.ts                # In-memory SQLite setup for test runner
│   ├── unit/                   # Currency precision tests
│   └── integration/            # API integration, transfers, and concurrency tests
├── docs/                       # OpenAPI JSON & Postman collection
├── package.json
└── tsconfig.json
```

---

## Database Design

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    description TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CONSTRAINT uq_account_reference UNIQUE (account_id, reference_id)
);

CREATE TABLE transfers (
    id TEXT PRIMARY KEY,
    source_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    destination_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    reference_id TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CHECK (source_account_id != destination_account_id)
);
```

---

## Assumptions & Design Choices

- **Currency representation**: Balances and transaction amounts are stored in cents as integers (`amount * 100`). The API handles decimal conversions on input/output while guaranteeing zero float-rounding discrepancies.
- **Transaction immutability**: Transactions cannot be updated or deleted via the API. Corrections must be handled through separate compensating transactions.
- **Concurrency**: Write operations run inside SQLite `BEGIN IMMEDIATE` transactions to prevent dirty reads or race conditions during concurrent debits.
- **Reference IDs**: Scoped uniquely per account (`account_id, reference_id`). The same reference ID can exist across different accounts.
