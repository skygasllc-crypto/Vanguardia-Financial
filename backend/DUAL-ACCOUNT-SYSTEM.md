# Dual Account System Implementation

## Overview

The Vanguard Trading platform now supports **dual account types** for each user:
- **DEMO Account**: For practice trading with virtual funds
- **REAL Account**: For actual trading with real deposits

## Database Changes

### New Enum: AccountType
```python
class AccountType(str, enum.Enum):
    DEMO = "demo"
    REAL = "real"
```

### Updated Models

All trading-related models now include `account_type`:

1. **Account** (`accounts` table)
   - Added: `account_type` column (DEMO | REAL)
   - Unique constraint changed to: `(user_id, currency, account_type)`
   - Each user now has TWO accounts per currency (one DEMO, one REAL)

2. **Position** (`positions` table)
   - Added: `account_type` column
   - Positions are segregated by account type

3. **Order** (`orders` table)
   - Added: `account_type` column
   - Orders are placed against specific account types

## Migration Applied

✅ Migration `3d5ac035bcc8` successfully applied
- Existing data automatically converted to DEMO accounts
- All existing accounts, positions, and orders marked as `account_type = 'demo'`

## Implementation Status

### ✅ Completed
1. Account type enum created
2. Database models updated with `account_type` field
3. Migration applied successfully
4. Existing data migrated to DEMO accounts

### 🚧 Remaining Tasks
The following features are planned but NOT YET IMPLEMENTED:

1. **Auto-creation of Demo and Real Accounts**
   - On user signup, automatically create both DEMO and REAL accounts
   - DEMO account starts with virtual balance (e.g., $100,000)
   - REAL account starts with $0

2. **Insufficient Balance Validation**
   - Prevent trading when account balance is insufficient
   - Return clear error messages when balance is too low
   - Lock funds during pending orders

3. **Admin Position Manipulation**
   - Admins can manually adjust positions for any user
   - Admins can modify profit/loss values
   - Admins can close positions manually
   - Full audit trail of admin actions

4. **Frontend Account Switching**
   - UI toggle to switch between DEMO and REAL accounts
   - Separate dashboards for each account type
   - Clear visual indicators showing current account type

## Next Steps

To complete the dual account implementation:

1. Update user registration to create both accounts
2. Add account switcher to frontend
3. Update trading endpoints to validate balance
4. Create admin position manipulation API
5. Add frontend UI for account switching

## Important Notes

⚠️ **All existing users currently have DEMO accounts only**
- Existing accounts have been migrated to `account_type = 'demo'`
- Real accounts need to be created manually or via updated signup flow
- Admin can create REAL accounts manually via database or API

⚠️ **Trading still works but uses DEMO account by default**
- All current trading operations use DEMO accounts
- No balance validation yet implemented
- Admin manipulation features not yet available
