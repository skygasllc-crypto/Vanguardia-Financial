users
├── id
├── email
├── password_hash
├── full_name
├── phone
├── is_verified
├── two_factor_enabled
├── created_at

wallets
├── id
├── user_id
├── currency
├── balance
├── available_balance
├── locked_balance

orders
├── id
├── user_id
├── trading_pair
├── type
├── side
├── price
├── quantity
├── status
├── created_at

trades
├── id
├── buyer_id
├── seller_id
├── trading_pair
├── price
├── quantity
├── created_at

transactions
├── id
├── user_id
├── type
├── asset
├── amount
├── status
├── created_at