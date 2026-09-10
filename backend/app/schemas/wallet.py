import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import TransactionType


class LedgerEntryOut(BaseModel):
    id: uuid.UUID
    transaction_ref: str
    transaction_type: TransactionType
    amount: Decimal
    currency: str
    balance_before: Decimal
    balance_after: Decimal
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletSummary(BaseModel):
    available_balance: Decimal
    locked_balance: Decimal
    currency: str
    is_simulated: bool = True
