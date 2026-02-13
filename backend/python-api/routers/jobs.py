from fastapi import APIRouter, Depends
from utils.dependencies import get_current_user

router = APIRouter()

@router.get("/jobs")
async def get_jobs(user=Depends(get_current_user)):
    # TODO: implement actual job fetching from database
    return {"jobs": []}

@router.get("/alerts")
async def get_alerts(user=Depends(get_current_user)):
    return {"alerts": []}