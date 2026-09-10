Frontend
React
Vite
TypeScript
Tailwind CSS
Recharts or TradingView Lightweight Charts
React Router
Zustand or Redux Toolkit
Backend
Python
FastAPI
SQLAlchemy
PostgreSQL
Redis
WebSockets
Authentication & Security
JWT
Refresh tokens
Two-factor authentication
Email verification
Password hashing
Rate limiting
Device/session management
Crypto/Market Data

The first version should use external exchange APIs for real market data, rather than trying to operate as an actual exchange immediately.
For example:

Market Data API
        ↓
Python FastAPI Backend
        ↓
WebSocket / REST API
        ↓
React Dashboard
        ↓
User