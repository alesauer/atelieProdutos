from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ItemTypeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nome de exibição do tipo (ex.: Acessório)")
    code: Optional[str] = Field(None, max_length=50, description="Código identificador único (ex.: ACESSORIO)")
    description: Optional[str] = Field(None, max_length=255, description="Descrição opcional")
    is_active: bool = True


class ItemTypeCreate(ItemTypeBase):
    pass


class ItemTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ItemTypeResponse(ItemTypeBase):
    id: int
    code: str
    is_system: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
