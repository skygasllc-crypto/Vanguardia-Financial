"""Canonical WebSocket event type names, per the platform's real-time spec."""


class WSEvent:
    MARKET_PRICE_UPDATE = "market.price_update"
    PORTFOLIO_UPDATED = "portfolio.updated"
    POSITION_UPDATED = "position.updated"
    POSITION_PROFIT_LOSS_UPDATED = "position.profit_loss_updated"
    POSITION_CLOSED = "position.closed"
    ORDER_UPDATED = "order.updated"
    TRADE_EXECUTED = "trade.executed"
    ACCOUNT_BALANCE_UPDATED = "account.balance_updated"
    ADMIN_ACCOUNT_UPDATED = "admin.account_updated"
    ADMIN_POSITION_UPDATED = "admin.position_updated"
    ADMIN_PORTFOLIO_UPDATED = "admin.portfolio_updated"
    ADMIN_ACCOUNT_ADJUSTED = "admin.account_adjusted"


def envelope(event_type: str, payload: dict) -> dict:
    return {"type": event_type, "payload": payload}
