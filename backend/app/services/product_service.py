from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.product import Product, ProductImage, ItemType
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.unit import UnitCreate
from app.schemas.product import ProductCreate, ProductUpdate, ImageReorderItem
from app.services.storage_service import storage_service


class ProductService:
    # --- Categorias ---
    @staticmethod
    def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
        return db.get(Category, category_id)

    @staticmethod
    def get_category_by_name(db: Session, name: str) -> Optional[Category]:
        stmt = select(Category).where(func.lower(Category.name) == name.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def list_categories(db: Session, active_only: bool = False) -> List[Category]:
        stmt = select(Category)
        if active_only:
            stmt = stmt.where(Category.is_active.is_(True))
        return list(db.execute(stmt.order_by(Category.name)).scalars().all())

    @staticmethod
    def create_category(db: Session, category_in: CategoryCreate) -> Category:
        existing = ProductService.get_category_by_name(db, category_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma categoria cadastrada com o nome '{category_in.name}'.",
            )
        category = Category(
            name=category_in.name.strip(),
            description=category_in.description,
            is_active=category_in.is_active,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update_category(db: Session, category: Category, category_in: CategoryUpdate) -> Category:
        if category_in.name is not None:
            new_name = category_in.name.strip()
            existing = ProductService.get_category_by_name(db, new_name)
            if existing and existing.id != category.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outra categoria com o nome '{new_name}'.",
                )
            category.name = new_name
        if category_in.description is not None:
            category.description = category_in.description
        if category_in.is_active is not None:
            category.is_active = category_in.is_active
        db.commit()
        db.refresh(category)
        return category

    # --- Unidades de Medida ---
    @staticmethod
    def get_unit_by_id(db: Session, unit_id: int) -> Optional[UnitOfMeasure]:
        return db.get(UnitOfMeasure, unit_id)

    @staticmethod
    def get_unit_by_code(db: Session, code: str) -> Optional[UnitOfMeasure]:
        stmt = select(UnitOfMeasure).where(func.lower(UnitOfMeasure.code) == code.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def list_units(db: Session) -> List[UnitOfMeasure]:
        stmt = select(UnitOfMeasure).order_by(UnitOfMeasure.code)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def create_unit(db: Session, unit_in: UnitCreate) -> UnitOfMeasure:
        existing = ProductService.get_unit_by_code(db, unit_in.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unidade de medida '{unit_in.code}' já está cadastrada.",
            )
        unit = UnitOfMeasure(
            code=unit_in.code.upper().strip(),
            name=unit_in.name.strip(),
            allows_decimals=unit_in.allows_decimals,
        )
        db.add(unit)
        db.commit()
        db.refresh(unit)
        return unit

    # --- Produtos ---
    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
        return db.get(Product, product_id)

    @staticmethod
    def get_product_by_sku(db: Session, sku: str) -> Optional[Product]:
        stmt = select(Product).where(func.lower(Product.sku) == sku.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def list_products(
        db: Session,
        item_type: Optional[str] = None,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Product]:
        stmt = select(Product)
        if active_only:
            stmt = stmt.where(Product.is_active.is_(True))
        if item_type:
            stmt = stmt.where(Product.item_type == item_type)
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if search:
            search_term = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                func.lower(Product.name).like(search_term)
                | func.lower(Product.sku).like(search_term)
            )
        stmt = stmt.offset(skip).limit(limit).order_by(Product.name)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def create_product(db: Session, product_in: ProductCreate) -> Product:
        # 1. Validar SKU único
        existing_sku = ProductService.get_product_by_sku(db, product_in.sku)
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O SKU '{product_in.sku}' já está em uso por outro item.",
            )

        # 2. Validar existência da Unidade de Medida
        unit = ProductService.get_unit_by_id(db, product_in.unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unidade de medida ID {product_in.unit_id} não encontrada.",
            )

        # 3. Validar Categoria se informada
        if product_in.category_id:
            cat = ProductService.get_category_by_id(db, product_in.category_id)
            if not cat:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Categoria ID {product_in.category_id} não encontrada.",
                )

        product = Product(
            sku=product_in.sku.strip().upper(),
            name=product_in.name.strip(),
            description=product_in.description,
            item_type=product_in.item_type,
            category_id=product_in.category_id,
            unit_id=product_in.unit_id,
            unit_cost=product_in.unit_cost,
            sale_price=product_in.sale_price,
            min_stock=product_in.min_stock,
            is_active=product_in.is_active,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update_product(db: Session, product: Product, product_in: ProductUpdate) -> Product:
        if product_in.sku is not None:
            new_sku = product_in.sku.strip().upper()
            existing_sku = ProductService.get_product_by_sku(db, new_sku)
            if existing_sku and existing_sku.id != product.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"O SKU '{new_sku}' já está em uso por outro item.",
                )
            product.sku = new_sku

        if product_in.name is not None:
            product.name = product_in.name.strip()
        if product_in.description is not None:
            product.description = product_in.description
        if product_in.item_type is not None:
            product.item_type = product_in.item_type
        if product_in.category_id is not None:
            if product_in.category_id != 0:
                cat = ProductService.get_category_by_id(db, product_in.category_id)
                if not cat:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Categoria ID {product_in.category_id} não encontrada.",
                    )
                product.category_id = product_in.category_id
            else:
                product.category_id = None
        if product_in.unit_id is not None:
            unit = ProductService.get_unit_by_id(db, product_in.unit_id)
            if not unit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unidade de medida ID {product_in.unit_id} não encontrada.",
                )
            product.unit_id = product_in.unit_id
        if product_in.unit_cost is not None:
            product.unit_cost = product_in.unit_cost
        if product_in.sale_price is not None:
            product.sale_price = product_in.sale_price
        if product_in.min_stock is not None:
            product.min_stock = product_in.min_stock
        if product_in.is_active is not None:
            product.is_active = product_in.is_active

        db.commit()
        db.refresh(product)
        return product

    # --- Imagens dos Produtos ---
    @staticmethod
    def add_product_image(
        db: Session,
        product: Product,
        file_path: str,
        original_filename: str,
        file_size: int,
        mime_type: str,
    ) -> ProductImage:
        # Verificar limite máximo de imagens por produto
        current_images_count = len(product.images)
        if current_images_count >= settings.MAX_IMAGES_PER_PRODUCT:
            storage_service.delete_file(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Limite de imagens atingido. O produto já possui {current_images_count} fotos (máximo permitido: {settings.MAX_IMAGES_PER_PRODUCT}).",
            )

        # Se for a primeira imagem, ela é automaticamente a principal
        is_first = current_images_count == 0

        image = ProductImage(
            product_id=product.id,
            file_path=file_path,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
            is_primary=is_first,
            display_order=current_images_count,
        )
        db.add(image)
        db.commit()
        db.refresh(image)
        return image

    @staticmethod
    def set_primary_image(db: Session, product: Product, image_id: int) -> ProductImage:
        target_image = None
        for img in product.images:
            if img.id == image_id:
                img.is_primary = True
                target_image = img
            else:
                img.is_primary = False

        if not target_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Imagem ID {image_id} não pertence a este produto.",
            )

        db.commit()
        db.refresh(target_image)
        return target_image

    @staticmethod
    def reorder_images(db: Session, product: Product, items: List[ImageReorderItem]):
        order_map = {item.image_id: item.display_order for item in items}
        for img in product.images:
            if img.id in order_map:
                img.display_order = order_map[img.id]
        db.commit()

    @staticmethod
    def delete_product_image(db: Session, product: Product, image_id: int):
        target_image = None
        for img in product.images:
            if img.id == image_id:
                target_image = img
                break

        if not target_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Imagem ID {image_id} não encontrada neste produto.",
            )

        # Excluir arquivo físico do disco
        storage_service.delete_file(target_image.file_path)

        was_primary = target_image.is_primary
        db.delete(target_image)
        db.commit()

        # Se a imagem deletada era a principal e ainda restam fotos, definir a primeira restante como principal
        remaining_images = [img for img in product.images if img.id != image_id]
        if was_primary and remaining_images:
            remaining_images[0].is_primary = True
            db.commit()


product_service = ProductService()
