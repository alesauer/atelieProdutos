import re
import unicodedata
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.item_type import ItemTypeModel
from app.models.product import Product
from app.schemas.item_type import ItemTypeCreate, ItemTypeUpdate


DEFAULT_SYSTEM_ITEM_TYPES = [
    {
        "code": "PRODUTO_ACABADO",
        "name": "Produto Acabado",
        "description": "Itens finais manufaturados para venda direta",
        "is_system": True,
    },
    {
        "code": "MATERIA_PRIMA",
        "name": "Matéria-Prima",
        "description": "Insumos base artesanais (ceras, essências, pavios)",
        "is_system": True,
    },
    {
        "code": "EMBALAGEM",
        "name": "Embalagem",
        "description": "Frascos, potes de vidro, latas, caixas e saquinhos",
        "is_system": True,
    },
    {
        "code": "MATERIAL_AUXILIAR",
        "name": "Material Auxiliar",
        "description": "Itens de apoio operacional, tags e etiquetas",
        "is_system": True,
    },
]


def slugify_code(name: str) -> str:
    """Gera um código identificador legível em maiúsculas a partir do nome."""
    normalized = unicodedata.normalize("NFKD", name).encode("ASCII", "ignore").decode("ASCII")
    code = re.sub(r"[^a-zA-Z0-9]+", "_", normalized).strip("_").upper()
    return code[:50] or "TIPO_ITEM"


class ItemTypeService:
    @staticmethod
    def seed_default_types(db: Session) -> None:
        """Garante a existência dos 4 tipos essenciais do ateliê se a tabela estiver vazia."""
        count = db.execute(select(func.count(ItemTypeModel.id))).scalar() or 0
        if count == 0:
            for item in DEFAULT_SYSTEM_ITEM_TYPES:
                new_type = ItemTypeModel(
                    code=item["code"],
                    name=item["name"],
                    description=item["description"],
                    is_system=item["is_system"],
                    is_active=True,
                )
                db.add(new_type)
            db.commit()

    @staticmethod
    def list_item_types(db: Session, active_only: bool = True) -> List[ItemTypeModel]:
        ItemTypeService.seed_default_types(db)
        stmt = select(ItemTypeModel)
        if active_only:
            stmt = stmt.where(ItemTypeModel.is_active.is_(True))
        stmt = stmt.order_by(ItemTypeModel.is_system.desc(), ItemTypeModel.name.asc())
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_by_id(db: Session, item_type_id: int) -> Optional[ItemTypeModel]:
        return db.get(ItemTypeModel, item_type_id)

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[ItemTypeModel]:
        stmt = select(ItemTypeModel).where(func.upper(ItemTypeModel.code) == code.strip().upper())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def create_item_type(db: Session, item_type_in: ItemTypeCreate) -> ItemTypeModel:
        ItemTypeService.seed_default_types(db)

        # Determina o código identificador
        code = item_type_in.code.strip().upper() if item_type_in.code else slugify_code(item_type_in.name)

        # Validação de unicidade
        existing_code = ItemTypeService.get_by_code(db, code)
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um tipo de item com o código '{code}'.",
            )

        existing_name = db.execute(
            select(ItemTypeModel).where(func.lower(ItemTypeModel.name) == item_type_in.name.strip().lower())
        ).scalars().first()
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um tipo de item com o nome '{item_type_in.name}'.",
            )

        item_type = ItemTypeModel(
            code=code,
            name=item_type_in.name.strip(),
            description=item_type_in.description.strip() if item_type_in.description else None,
            is_system=False,
            is_active=item_type_in.is_active,
        )
        db.add(item_type)
        db.commit()
        db.refresh(item_type)
        return item_type

    @staticmethod
    def update_item_type(db: Session, item_type_id: int, item_type_in: ItemTypeUpdate) -> ItemTypeModel:
        item_type = ItemTypeService.get_by_id(db, item_type_id)
        if not item_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tipo de item não encontrado.",
            )

        if item_type_in.name is not None:
            name_clean = item_type_in.name.strip()
            existing_name = db.execute(
                select(ItemTypeModel).where(
                    func.lower(ItemTypeModel.name) == name_clean.lower(),
                    ItemTypeModel.id != item_type_id,
                )
            ).scalars().first()
            if existing_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outro tipo de item cadastrado com o nome '{name_clean}'.",
                )
            item_type.name = name_clean

        if "description" in item_type_in.model_fields_set:
            item_type.description = item_type_in.description.strip() if item_type_in.description else None

        if item_type_in.is_active is not None:
            if item_type.is_system and not item_type_in.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tipos fundamentais do sistema não podem ser desativados.",
                )
            item_type.is_active = item_type_in.is_active

        db.commit()
        db.refresh(item_type)
        return item_type

    @staticmethod
    def delete_item_type(db: Session, item_type_id: int) -> None:
        item_type = ItemTypeService.get_by_id(db, item_type_id)
        if not item_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tipo de item não encontrado.",
            )

        if item_type.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipos de item nativos do sistema não podem ser removidos.",
            )

        # Verifica se há produtos cadastrados com este tipo
        in_use_count = db.execute(
            select(func.count(Product.id)).where(Product.item_type == item_type.code)
        ).scalar() or 0

        if in_use_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir este tipo porque existem {in_use_count} produto(s) vinculado(s) a ele.",
            )

        db.delete(item_type)
        db.commit()


item_type_service = ItemTypeService()
