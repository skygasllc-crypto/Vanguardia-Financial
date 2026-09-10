# Implementation Status: Dual Account System & Admin Features

## ✅ COMPLETED

### 1. Database Schema Updates
- **AccountType enum** created with DEMO and REAL values
- **Account model** updated with `account_type` field
- **Position model** updated with `account_type` field
- **Order model** updated with `account_type` field
- **Database migration** successfully applied (all existing data migrated to DEMO)

### 2. Auto-Creation of Dual Accounts on Signup
- **User registration** now creates BOTH accounts:
  - DEMO account: Starts with $100,000 virtual balance
  - REAL account: Starts with $0 balance
- File updated: `/backend/app/services/auth_service.py`

## 🚧 REMAINING WORK

### 3. Trading Service Updates (NOT YET DONE)
**Required Changes:**
- Update `place_order()` function to accept `account_type` parameter
- Update `get_or_create_account()` to filter by account_type
- Add balance validation that checks specific account_type
- Update all trading functions to work with account_type

**Files to Update:**
- `/backend/app/services/trading_service.py`
- `/backend/app/api/v1/endpoints/orders.py`
- `/backend/app/schemas/trading.py`

**Example Implementation:**
```python
# In trading_service.py
async def place_order(
    db: AsyncSession,
    user: User,
    payload: OrderCreate,
    account_type: AccountType = AccountType.DEMO  # NEW PARAMETER
) -> tuple[Order, Trade | None, Position | None]:
    # Get account for specific type
    account = await get_account_by_type(db, user.id, account_type)

    # Check balance for BUY orders
    if payload.side == OrderSide.BUY:
        required_amount = payload.quantity * current_price
        if account.available_balance < required_amount:
            raise TradingError(f"Insufficient balance in {account_type.value} account")

    # Create order with account_type
    order = Order(
        user_id=user.id,
        symbol=asset.symbol,
        account_type=account_type,  # NEW FIELD
        side=payload.side,
        ...
    )
```

### 4. Admin Position Manipulation API (✅ COMPLETED)
**Implemented Features:**
- ✅ Real-time profit/loss manipulation service
- ✅ Admin force profit endpoint
- ✅ Admin force loss endpoint
- ✅ Admin set price endpoint
- ✅ WebSocket real-time updates to users
- ✅ Full audit logging for all admin actions

**Files Created/Updated:**
- ✅ Created: `/backend/app/services/admin_trading_service.py`
- ✅ Updated: `/backend/app/api/v1/endpoints/admin.py` (added endpoints)

**Implemented Endpoints:**
```python
# Admin Live Position Manipulation
POST   /api/v1/admin/positions/{position_id}/force-profit
POST   /api/v1/admin/positions/{position_id}/force-loss
POST   /api/v1/admin/positions/{position_id}/set-price
```

**Example Request:**
```json
POST /api/v1/admin/positions/{position_id}/force-profit
{
  "amount": 500.00,
  "reason": "Admin forcing profit for demo"
}
```

**How It Works:**
1. Admin calls endpoint with target profit/loss amount
2. Service calculates required market price to achieve P&L
3. Updates position in database
4. Records audit trail with admin details
5. Broadcasts WebSocket event to user
6. User sees instant update without page refresh

### 5. Frontend Account Switching (NOT YET DONE)
**Required UI Components:**
- Account type selector toggle (DEMO / REAL)
- Visual indicator showing current account type
- Separate dashboards/data for each account type
- Update all API calls to include account_type

**Files to Create/Update:**
- Create: `/frontend-next/src/components/AccountSwitcher.tsx`
- Update: `/frontend-next/src/stores/accountStore.ts`
- Update: `/frontend-next/src/app/app/trading/page.tsx`
- Update: `/frontend-next/src/app/app/dashboard/page.tsx`

**Example React Component:**
```typescript
export function AccountSwitcher() {
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo')

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Account:</span>
      <Select value={accountType} onValueChange={setAccountType}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="demo">
            Demo Account ($100,000)
          </SelectItem>
          <SelectItem value="real">
            Real Account
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
```

### 6. API Schema Updates (NOT YET DONE)
**Required Updates:**
- Add `account_type` to OrderCreate schema
- Add `account_type` to Position schemas
- Create AdminPositionAdjust schemas

**Files to Update:**
- `/backend/app/schemas/trading.py`
- `/backend/app/schemas/position.py`

## 📋 IMPLEMENTATION CHECKLIST

### Backend Tasks
- [ ] Update trading service to use account_type
- [ ] Add insufficient balance validation
- [ ] Update order placement endpoints
- [x] Create admin position manipulation endpoints ✅
- [ ] Update wallet/portfolio endpoints for account filtering
- [ ] Add account_type to all trading schemas

### Frontend Tasks
- [ ] Create AccountSwitcher component
- [ ] Create account store/context
- [ ] Update trading page to show account type
- [ ] Update dashboard to filter by account type
- [ ] Update all trading API calls to include account_type
- [ ] Add visual indicators for DEMO vs REAL

### Testing Tasks
- [ ] Test user registration creates both accounts
- [ ] Test trading with DEMO account
- [ ] Test trading with REAL account
- [ ] Test insufficient balance error handling
- [ ] Test admin position manipulation
- [ ] Test account switching in frontend

## 🎯 QUICK START GUIDE

### For New Users
1. Register a new account
2. Two accounts are automatically created:
   - **DEMO**: $100,000 practice money
   - **REAL**: $0 (for deposits)
3. By default, users trade with DEMO account
4. (Frontend update needed) Users can switch to REAL account

### For Existing Users
- All existing accounts converted to DEMO
- Need to manually create REAL accounts via SQL:
```sql
INSERT INTO accounts (id, user_id, currency, account_type, available_balance, locked_balance)
SELECT uuid_generate_v4(), user_id, currency, 'real', 0, 0
FROM accounts
WHERE account_type = 'demo';
```

## 📚 DOCUMENTATION UPDATED
- ✅ `/backend/DUAL-ACCOUNT-SYSTEM.md` - System architecture
- ✅ `/backend/IMPLEMENTATION-STATUS.md` - This file

## ⚠️ IMPORTANT NOTES

1. **Database is ready** - Migration applied successfully
2. **User registration is ready** - Creates both accounts automatically
3. **Trading service needs updates** - Currently doesn't use account_type
4. **Frontend needs major updates** - No account switching UI yet
5. **Admin manipulation not implemented** - Needs new endpoints

## 🔧 NEXT DEVELOPER STEPS

To continue implementation:

1. **Update trading service first**
   - Add account_type parameter to all trading functions
   - Implement balance validation per account type

2. **Create admin endpoints**
   - Build position manipulation API
   - Add audit logging

3. **Build frontend components**
   - Account switcher UI
   - Update all trading pages

4. **Test thoroughly**
   - Test both account types
   - Test balance validation
   - Test admin features
