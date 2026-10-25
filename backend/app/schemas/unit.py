from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UnitBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=10)
    name: str = Field(..., min_length=2, max_length=50)
    allows_decimals: bool = True


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    code: str | None = Field(None, min_length=1, max_length=10)
    name: str | None = Field(None, min_length=2, max_length=50)
    allows_decimals: bool | None = None


class UnitResponse(UnitBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
