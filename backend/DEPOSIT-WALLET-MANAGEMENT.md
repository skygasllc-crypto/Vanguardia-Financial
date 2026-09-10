# Deposit Wallet Management Guide

## Overview

The Vanguardia Financial platform now has a complete backend API for managing cryptocurrency deposit wallet addresses. Admins can add, update, and manage deposit addresses that users will see when adding funds to their accounts.

---

## Backend API Endpoints

### **Public Endpoints** (for users)

#### Get All Active Deposit Wallets
```http
GET /api/v1/deposits/wallets
```
Returns all active cryptocurrency deposit wallets.

#### Get Specific Deposit Wallet
```http
GET /api/v1/deposits/wallets/{currency_id}
```
Example: `/api/v1/deposits/wallets/btc`

---

### **Admin Endpoints** (requires admin authentication)

#### Get All Deposit Wallets (including inactive)
```http
GET /api/v1/deposits/admin/wallets
Authorization: Bearer <admin_access_token>
```

#### Create New Deposit Wallet
```http
POST /api/v1/deposits/admin/wallets
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "currency_id": "btc",
  "currency_name": "Bitcoin (BTC)",
  "currency_symbol": "BTC",
  "network": "Bitcoin",
  "network_fee": "0.0005 BTC",
  "icon": "₿",
  "wallet_address": "YOUR_REAL_BTC_ADDRESS_HERE",
  "memo_tag": null,
  "is_active": true,
  "minimum_deposit": "0.001 BTC",
  "notes": "Bitcoin mainnet deposit address"
}
```

#### Update Existing Deposit Wallet
```http
PATCH /api/v1/deposits/admin/wallets/{wallet_id}
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "wallet_address": "NEW_REAL_ADDRESS_HERE",
  "is_active": true
}
```

#### Delete Deposit Wallet
```http
DELETE /api/v1/deposits/admin/wallets/{wallet_id}
Authorization: Bearer <admin_access_token>
```

---

## How to Update Wallet Addresses

### **Method 1: Using API (Recommended)**

1. **Login as Admin**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@vanguardtrading.dev",
       "password": "ChangeMe123!"
     }'
   ```

2. **Copy the access_token from the response**

3. **Get List of All Wallets**
   ```bash
   curl http://localhost:8000/api/v1/deposits/admin/wallets \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

4. **Update a Wallet Address**
   ```bash
   curl -X PATCH http://localhost:8000/api/v1/deposits/admin/wallets/WALLET_ID \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "wallet_address": "YOUR_REAL_WALLET_ADDRESS"
     }'
   ```

### **Method 2: Directly in Database**

```sql
-- View all deposit wallets
SELECT currency_symbol, wallet_address, is_active
FROM deposit_wallets
ORDER BY currency_symbol;

-- Update Bitcoin wallet address
UPDATE deposit_wallets
SET wallet_address = 'YOUR_REAL_BTC_ADDRESS',
    updated_at = NOW()
WHERE currency_id = 'btc';

-- Update Ethereum wallet address
UPDATE deposit_wallets
SET wallet_address = 'YOUR_REAL_ETH_ADDRESS',
    updated_at = NOW()
WHERE currency_id = 'eth';
```

---

## Currently Seeded Payment Methods

The following 4 payment methods have been seeded with **PLACEHOLDER** details:

| Payment Method | Symbol | Network | Status |
|----------------|--------|---------|--------|
| Bitcoin | BTC | Bitcoin | ⚠️ PLACEHOLDER |
| Tether USDT (TRC-20) | USDT | Tron | ⚠️ PLACEHOLDER |
| Tron | TRX | Tron | ⚠️ PLACEHOLDER |
| Wire Transfer | USD | Bank Transfer | ⚠️ PLACEHOLDER |

---

## Security Best Practices

1. **Use Hot Wallets for Deposits**
   - Create separate hot wallets for user deposits
   - Never use personal wallets

2. **Regularly Move Funds**
   - Transfer funds from hot wallets to cold storage regularly
   - Keep minimal balance in hot wallets

3. **Monitor Deposit Addresses**
   - Set up blockchain monitoring alerts
   - Track all incoming transactions

4. **Network Validation**
   - Ensure addresses match the specified network
   - Wrong network = permanent loss of funds

5. **Backup Private Keys**
   - Store private keys securely offline
   - Use hardware wallets for cold storage

---

## API Documentation

Full API documentation is available at:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

Look for the "Deposits" section for all deposit-related endpoints.

---

## Admin Panel UI

A React-based admin panel UI for managing deposit wallets will be created next. This will allow admins to:

- View all deposit wallets in a table
- Edit wallet addresses with a form
- Toggle wallet active/inactive status
- Add new cryptocurrency options
- View deposit transaction history

---

## Database Schema

### deposit_wallets table
```sql
CREATE TABLE deposit_wallets (
    id UUID PRIMARY KEY,
    currency_id VARCHAR(20) UNIQUE NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    network VARCHAR(50) NOT NULL,
    network_fee VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    memo_tag VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    minimum_deposit VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### deposits table
```sql
CREATE TABLE deposits (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    currency_id VARCHAR(20) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    network VARCHAR(50) NOT NULL,
    deposit_address VARCHAR(255) NOT NULL,
    transaction_hash VARCHAR(255),
    amount NUMERIC(20, 8) NOT NULL,
    network_fee NUMERIC(20, 8),
    credited_amount NUMERIC(20, 8),
    status depositstatus DEFAULT 'pending',
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 6,
    admin_notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Next Steps

1. ✅ Backend API - Complete
2. ✅ Database models - Complete
3. ✅ Migration scripts - Complete
4. ⏳ Admin panel UI - In progress
5. ⏳ User deposit tracking - In progress

---

## Support

For questions or issues:
- Check API documentation: `/api/docs`
- Review database schema
- Test endpoints with Postman or curl
- Contact development team

---

**⚠️ IMPORTANT**: All current payment method details are PLACEHOLDERS. Admin MUST update these with:
- Real cryptocurrency wallet addresses for BTC, USDT (TRC-20), and TRX
- Real bank account details for Wire Transfer

before going live!
