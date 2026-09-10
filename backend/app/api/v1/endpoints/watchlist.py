import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.asset import Asset
from app.models.market_price import MarketPrice
from app.models.user import User
from app.models.watchlist import WatchlistItem
from app.schemas.market import AssetSummary
from app.schemas.watchlist import WatchlistAdd, WatchlistItemOut

router = APIRouter()


@router.get("", response_model=list[WatchlistItemOut])
async def list_watchlist(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = (await db.execute(select(WatchlistItem).where(WatchlistItem.user_id == user.id))).scalars().all()
    out = []
    for item in items:
        asset = await db.get(Asset, item.asset_id)
        price = (await db.execute(select(MarketPrice).where(MarketPrice.asset_id == asset.id))).scalar_one_or_none()
        if price is None:
            continue
        out.append(WatchlistItemOut(id=item.id, asset=AssetSummary(
            id=asset.id, symbol=asset.symbol, name=asset.name, icon_url=asset.icon_url,
            current_price=price.current_price, change_24h_pct=price.change_24h_pct,
            market_cap=price.market_cap, volume_24h=price.volume_24h,
            is_trending=asset.is_trending, is_new_listing=asset.is_new_listing,
        )))
    return out


@router.post("", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(payload: WatchlistAdd, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(WatchlistItem).where(WatchlistItem.user_id == user.id, WatchlistItem.asset_id == payload.asset_id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"error": {"code": "ALREADY_WATCHED", "message": "Asset already on watchlist."}})

    asset = await db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ASSET_NOT_FOUND", "message": "Asset not found."}})

    item = WatchlistItem(user_id=user.id, asset_id=payload.asset_id)
    db.add(item)
    await db.commit()
    await db.refresh(item)

    price = (await db.execute(select(MarketPrice).where(MarketPrice.asset_id == asset.id))).scalar_one()
    return WatchlistItemOut(id=item.id, asset=AssetSummary(
        id=asset.id, symbol=asset.symbol, name=asset.name, icon_url=asset.icon_url,
        current_price=price.current_price, change_24h_pct=price.change_24h_pct,
        market_cap=price.market_cap, volume_24h=price.volume_24h,
        is_trending=asset.is_trending, is_new_listing=asset.is_new_listing,
    ))


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(item_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(WatchlistItem, item_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Watchlist item not found."}})
    await db.delete(item)
    await db.commit()
