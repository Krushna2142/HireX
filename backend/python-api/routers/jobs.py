from fastapi import APIRouter, Depends
from utils.dependencies import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
async def get_jobs(user=Depends(get_current_user)):
    return {"jobs": []}


@router.get("/alerts")
async def get_alerts(user=Depends(get_current_user)):
    return {"alerts": []}
