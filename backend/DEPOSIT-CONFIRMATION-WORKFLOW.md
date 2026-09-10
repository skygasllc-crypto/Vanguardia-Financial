# Deposit Confirmation Workflow

## Overview

Users can initiate cryptocurrency deposits, but the funds will NOT be automatically credited to their account. Instead, deposits remain in **PENDING** status until an admin manually confirms and approves them.

---

## Deposit Flow

### **Step 1: User Initiates Deposit**

1. User goes to `/app/wallet/add-funds`
2. User selects cryptocurrency (e.g., Bitcoin)
3. User sees the deposit address
4. User sends cryptocurrency to that address
5. User optionally records the deposit in the system

**Status**: `PENDING`

---

### **Step 2: Admin Reviews Deposit**

Admin can view all pending deposits via:

```http
GET /api/v1/deposits/admin/deposits?page=1&per_page=50
Authorization: Bearer <admin_token>
```

Or get only pending deposits count:

```http
GET /api/v1/deposits/admin/deposits/pending/count
Authorization: Bearer <admin_token>
```

---

### **Step 3: Admin Confirms Deposit**

When admin confirms the deposit was received on the blockchain, they call:

```http
POST /api/v1/deposits/admin/deposits/{deposit_id}/confirm
Authorization: Bearer <admin_token>
```

**What happens automatically:**

1. ✅ Deposit status changes to `CREDITED`
2. ✅ User's account balance is increased by the deposit amount
3. ✅ Transaction ledger record is created
4. ✅ Admin notes added: "Confirmed and credited by admin {admin_id}"
5. ✅ `credited_amount` is calculated (amount - network_fee)

**Example:**
- User deposits: 1 BTC
- Network fee: 0.0005 BTC
- Credited amount: 0.9995 BTC
- User's balance increases by 0.9995 BTC

---

### **Step 4: Admin Rejects Deposit (if needed)**

If the deposit is invalid or not received, admin can reject it:

```http
POST /api/v1/deposits/admin/deposits/{deposit_id}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Transaction not found on blockchain"
}
```

**What happens:**

1. ❌ Deposit status changes to `FAILED`
2. ❌ No balance is credited
3. ❌ Admin notes added with rejection reason

---

## API Endpoints

### **Admin Deposit Management**

#### Get All Deposits
```http
GET /api/v1/deposits/admin/deposits
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (default: 1)
- `per_page` (default: 50)

**Response:**
```json
{
  "deposits": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "currency_id": "btc",
      "currency_symbol": "BTC",
      "network": "Bitcoin",
      "deposit_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "transaction_hash": null,
      "amount": "1.0",
      "network_fee": "0.0005",
      "credited_amount": null,
      "status": "pending",
      "confirmations": 0,
      "required_confirmations": 6,
      "admin_notes": null,
      "created_at": "2026-09-06T10:30:00Z",
      "updated_at": "2026-09-06T10:30:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "per_page": 50
}
```

#### Confirm Deposit
```http
POST /api/v1/deposits/admin/deposits/{deposit_id}/confirm
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "id": "uuid",
  "status": "credited",
  "credited_amount": "0.9995",
  "admin_notes": "Confirmed and credited by admin uuid-here"
}
```

#### Reject Deposit
```http
POST /api/v1/deposits/admin/deposits/{deposit_id}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Invalid transaction"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "failed",
  "admin_notes": "Rejected by admin uuid-here: Invalid transaction"
}
```

#### Get Pending Count
```http
GET /api/v1/deposits/admin/deposits/pending/count
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "count": 5
}
```

---

## Deposit Statuses

| Status | Description |
|--------|-------------|
| `pending` | User created deposit, waiting for admin confirmation |
| `confirming` | Deposit detected on blockchain, waiting for confirmations |
| `confirmed` | Blockchain confirmations met, ready to credit |
| `credited` | ✅ **Admin confirmed and balance credited to user** |
| `failed` | ❌ Admin rejected or deposit failed |
| `cancelled` | User cancelled the deposit |

---

## Database Flow

### Before Confirmation

**Deposit Table:**
```
id: uuid
user_id: uuid
amount: 1.0 BTC
status: pending
credited_amount: null
```

**User Account:**
```
available_balance: 10000 USD
```

### After Confirmation

**Deposit Table:**
```
id: uuid
user_id: uuid
amount: 1.0 BTC
status: credited
credited_amount: 0.9995 BTC
admin_notes: "Confirmed and credited by admin abc123"
```

**User Account:**
```
available_balance: 10000 + 0.9995 BTC worth in USD
```

**Transaction Ledger:**
```
transaction_type: DEPOSIT
amount: 0.9995 BTC
balance_before: 10000
balance_after: 10000 + credited_amount
description: "Deposit confirmed: 1.0 BTC via Bitcoin"
```

---

## Security Considerations

1. **Only Admins Can Confirm**
   - Regular users cannot confirm their own deposits
   - Requires admin role and valid JWT token

2. **Cannot Double-Confirm**
   - System prevents confirming already credited deposits
   - Error thrown if deposit already processed

3. **Audit Trail**
   - Admin ID is logged with every confirmation/rejection
   - Transaction ledger maintains complete history
   - All balance changes are immutable records

4. **Network Fee Deduction**
   - Network fees are automatically deducted
   - User receives net amount after fees

---

## Admin Workflow Example

### Using cURL

```bash
# 1. Login as admin
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vanguardtrading.dev",
    "password": "ChangeMe123!"
  }'

# Save the access_token

# 2. Get pending deposits
curl http://localhost:8000/api/v1/deposits/admin/deposits \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# 3. Confirm a deposit
curl -X POST http://localhost:8000/api/v1/deposits/admin/deposits/DEPOSIT_ID/confirm \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check user's balance was updated
curl http://localhost:8000/api/v1/wallet \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## User Experience

### User Side

1. User sees: "Your deposit is pending confirmation"
2. User waits for admin to review
3. User receives notification (future feature) when credited
4. User sees updated balance

### Admin Side

1. Admin sees notification: "5 pending deposits"
2. Admin reviews blockchain transaction
3. Admin clicks "Confirm" button
4. System automatically credits user
5. Admin sees "Deposit confirmed successfully"

---

## Testing

### Test Confirmation

```python
# Create test deposit
deposit = await create_deposit(
    user_id=user_id,
    currency_id="btc",
    amount=Decimal("1.0")
)

# Confirm deposit as admin
confirmed = await confirm_and_credit_deposit(
    db=db,
    deposit_id=deposit.id,
    admin_id=admin.id
)

assert confirmed.status == DepositStatus.CREDITED
assert confirmed.credited_amount == Decimal("0.9995")

# Check user balance increased
account = await get_user_account(user_id)
assert account.available_balance == original_balance + Decimal("0.9995")
```

---

## Next Steps

1. ✅ Backend confirmation API - Complete
2. ⏳ Admin UI for deposit management - In progress
3. ⏳ Email notifications to users
4. ⏳ Blockchain integration for automatic detection
5. ⏳ Webhook notifications

---

**The deposit confirmation system is now fully functional!**

Admins can manually review and approve deposits, and the system will automatically credit user balances with full audit trail.
