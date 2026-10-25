from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ColorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    hex_code: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class ColorCreate(ColorBase):
    pass


class ColorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=60)
    hex_code: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class ColorResponse(ColorBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
