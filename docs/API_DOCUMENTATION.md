# Transaction Ledger API - Complete API Documentation

Base URL: `http://localhost:3000/api/v1`  
Interactive Swagger UI: `http://localhost:3000/docs`  
OpenAPI JSON Specification: `http://localhost:3000/openapi.json`  
Health Check: `http://localhost:3000/health`

---

## Response Format Standards

### Success Response Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 25,
    "total_pages": 3
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable error description",
    "details": { ... }
  }
}
```

---

## Standard Error Codes and HTTP Statuses

| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `VALIDATION_ERROR` | Request payload fails schema validation, missing fields, or malformed JSON |
| `404 Not Found` | `ACCOUNT_NOT_FOUND` | Account with the specified UUID was not found |
| `404 Not Found` | `SOURCE_ACCOUNT_NOT_FOUND` | Source account in transfer does not exist |
| `404 Not Found` | `DESTINATION_ACCOUNT_NOT_FOUND` | Destination account in transfer does not exist |
| `404 Not Found` | `ROUTE_NOT_FOUND` | Requested URL endpoint does not exist |
| `409 Conflict` | `DUPLICATE_TRANSACTION` | A transaction with this `reference_id` already exists for this account |
| `409 Conflict` | `DUPLICATE_TRANSFER` | A transfer with this `reference_id` already exists |
| `422 Unprocessable Entity` | `INSUFFICIENT_FUNDS` | Account balance is less than requested debit/transfer amount |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected server or database exception |

---

## 1. Accounts API

### 1.1 Create Account
Creates a new account. Initial balance is strictly 0.00. The system generates `id` and `created_at`.

- **Method**: `POST`
- **Path**: `/accounts`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Alice Smith"
  }
  ```
- **Constraints**:
  - `name`: String, required, 1-100 characters.
  - `balance`: Prohibited. If supplied by client, request returns `400 Bad Request`.

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "name": "Alice Smith",
    "balance": 0,
    "created_at": "2026-10-28T17:30:00.000Z"
  }
}
```

---

### 1.2 Get Account by ID
Retrieves full account details.

- **Method**: `GET`
- **Path**: `/accounts/:accountId`

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "name": "Alice Smith",
    "balance": 150.0,
    "created_at": "2026-10-28T17:30:00.000Z"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found with ID: 00000000-0000-4000-8000-000000000000"
  }
}
```

---

### 1.3 Get Account Balance
Fetches the current verified balance of an account.

- **Method**: `GET`
- **Path**: `/accounts/:accountId/balance`

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "balance": 150.0
  }
}
```

---

### 1.4 List All Accounts
Returns a list of all accounts registered in the ledger.

- **Method**: `GET`
- **Path**: `/accounts`

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
      "name": "Alice Smith",
      "balance": 150.0,
      "created_at": "2026-10-28T17:30:00.000Z"
    }
  ]
}
```

---

## 2. Transactions API

### 2.1 Add Transaction
Performs an atomic credit or debit transaction on an account.

- **Method**: `POST`
- **Paths**:
  - Nested: `/accounts/:accountId/transactions`
  - Direct: `/transactions` (requires `account_id` in body)
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "type": "credit",
    "amount": 100.50,
    "description": "Salary deposit",
    "reference_id": "PAYROLL-2026-10"
  }
  ```
- **Validation Rules**:
  - `type`: Must be `"credit"` or `"debit"`.
  - `amount`: Number strictly greater than 0, maximum 2 decimal places.
  - `description`: String, 1-255 characters.
  - `reference_id`: String, 1-100 characters. Unique within the account.

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "f549c490-67c1-4bfe-9892-ea9b69b3f3e0",
    "account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "type": "credit",
    "amount": 100.5,
    "description": "Salary deposit",
    "reference_id": "PAYROLL-2026-10",
    "created_at": "2026-10-28T17:35:00.000Z"
  }
}
```

#### Error: Duplicate Transaction (409 Conflict)
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_TRANSACTION",
    "message": "A transaction with reference_id 'PAYROLL-2026-10' already exists for account 'e22a6320-b8d1-4475-b82b-9276d43e5a59'",
    "details": {
      "existing_transaction": {
        "id": "f549c490-67c1-4bfe-9892-ea9b69b3f3e0",
        "account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
        "type": "credit",
        "amount": 100.5,
        "description": "Salary deposit",
        "reference_id": "PAYROLL-2026-10",
        "created_at": "2026-10-28T17:35:00.000Z"
      }
    }
  }
}
```

#### Error: Insufficient Balance (422 Unprocessable Entity)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Transaction rejected: Insufficient balance. Current balance is 100, but attempted to debit 150",
    "details": {
      "current_balance": 100,
      "attempted_debit": 150
    }
  }
}
```

---

### 2.2 Get Transaction History
Retrieves transactions for an account sorted in latest-first order (`created_at DESC`), with filtering and pagination.

- **Method**: `GET`
- **Path**: `/accounts/:accountId/transactions`
- **Query Parameters**:
  - `type`: (Optional) `"credit"` or `"debit"`. If omitted, returns both types.
  - `page`: (Optional) Integer >= 1, defaults to `1`.
  - `limit`: (Optional) Integer between 1 and 100, defaults to `10`.

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "9ca9e365-c340-4573-89ea-ba6174b1be6b",
      "account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
      "type": "debit",
      "amount": 30.0,
      "description": "Coffee purchase",
      "reference_id": "POS-883",
      "created_at": "2026-10-28T17:40:00.000Z"
    },
    {
      "id": "f549c490-67c1-4bfe-9892-ea9b69b3f3e0",
      "account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
      "type": "credit",
      "amount": 100.0,
      "description": "Initial funding",
      "reference_id": "PAYROLL-2026-10",
      "created_at": "2026-10-28T17:35:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 2,
    "total_pages": 1
  }
}
```

---

## 3. Money Transfer API (Bonus)

### 3.1 Transfer Money Between Accounts
Atomically transfers money from a source account to a destination account. Debits source, credits destination, records individual transactions in both account histories, and registers a transfer record.

- **Method**: `POST`
- **Path**: `/transfers`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "source_account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "destination_account_id": "b7132ef2-5a23-455b-8086-6395ec1ea9f0",
    "amount": 30.00,
    "reference_id": "TRF-2026-901",
    "description": "Lunch split reimbursement"
  }
  ```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "e305e5da-ae0a-4861-a536-f09f0df81e85",
    "source_account_id": "e22a6320-b8d1-4475-b82b-9276d43e5a59",
    "destination_account_id": "b7132ef2-5a23-455b-8086-6395ec1ea9f0",
    "amount": 30,
    "reference_id": "TRF-2026-901",
    "description": "Lunch split reimbursement",
    "source_balance": 70,
    "destination_balance": 80,
    "created_at": "2026-10-28T17:45:00.000Z"
  }
}
```

#### Error: Same Source and Destination (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for incoming request data",
    "details": [
      {
        "field": "destination_account_id",
        "message": "Source and destination accounts cannot be the same",
        "rule": "custom"
      }
    ]
  }
}
```
