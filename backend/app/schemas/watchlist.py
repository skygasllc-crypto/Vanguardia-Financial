import uuid

from pydantic import BaseModel

from app.schemas.market import AssetSummary


class WatchlistAdd(BaseModel):
    asset_id: uuid.UUID


class WatchlistItemOut(BaseModel):
    id: uuid.UUID
    asset: AssetSummary

    model_config = {"from_attributes": True}
