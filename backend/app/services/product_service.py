from typing import List, Optional
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.color import ProductColor
from app.models.product import Product, ProductImage, ItemType
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.unit import UnitCreate, UnitUpdate
from app.schemas.color import ColorCreate, ColorUpdate
from app.schemas.product import ProductCreate, ProductUpdate, ImageReorderItem
from app.services.storage_service import storage_service


DEFAULT_INITIAL_CATEGORIES = [
    {
        "name": "Kit",
        "description": "Kits e conjuntos temáticos de produtos",
    },
    {
        "name": "Peças Individuais",
        "description": "Produtos artesanais vendidos separadamente",
    },
    {
        "name": "Peças Únicas",
        "description": "Peças exclusivas, edições limitadas e designs autorais únicos",
    },
]


DEFAULT_INITIAL_UNITS = [
    {"code": "UN", "name": "Unidade", "allows_decimals": False},
    {"code": "KG", "name": "Quilograma", "allows_decimals": True},
    {"code": "G", "name": "Grama", "allows_decimals": True},
    {"code": "L", "name": "Litro", "allows_decimals": True},
    {"code": "ML", "name": "Mililitro", "allows_decimals": True},
    {"code": "CM", "name": "Centímetro", "allows_decimals": True},
    {"code": "M", "name": "Metro", "allows_decimals": True},
    {"code": "PCT", "name": "Pacote", "allows_decimals": False},
    {"code": "CX", "name": "Caixa", "allows_decimals": False},
]


DEFAULT_INITIAL_COLORS = [
    {"name": "Branco", "hex_code": "#ffffff"},
    {"name": "Natural / Off-White", "hex_code": "#f7f4ea"},
    {"name": "Baunilha", "hex_code": "#fef3c7"},
    {"name": "Lavanda", "hex_code": "#d8b4fe"},
    {"name": "Rosa Claro", "hex_code": "#fbcfe8"},
    {"name": "Terracota", "hex_code": "#c86d51"},
    {"name": "Verde Oliva", "hex_code": "#86efac"},
    {"name": "Azul Sereno", "hex_code": "#93c5fd"},
    {"name": "Dourado", "hex_code": "#fde047"},
    {"name": "Preto", "hex_code": "#2c2824"},
    {"name": "Caramelo", "hex_code": "#d97706"},
    {"name": "Âmbar", "hex_code": "#fb923c"},
    {"name": "Cinza", "hex_code": "#d1d5db"},
    {"name": "Vinho", "hex_code": "#991b1b"},
]


class ProductService:
    # --- Categorias ---
    @staticmethod
    def seed_initial_categories(db: Session) -> None:
        """Garante a existência das categorias iniciais solicitadas se não existirem."""
        count = db.execute(select(func.count(Category.id))).scalar() or 0
        if count == 0:
            for item in DEFAULT_INITIAL_CATEGORIES:
                existing = ProductService.get_category_by_name(db, item["name"])
                if not existing:
                    new_cat = Category(
                        name=item["name"],
                        description=item["description"],
                        is_active=True,
                    )
                    db.add(new_cat)
            db.commit()

    @staticmethod
    def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
        return db.get(Category, category_id)

    @staticmethod
    def get_category_by_name(db: Session, name: str) -> Optional[Category]:
        stmt = select(Category).where(func.lower(Category.name) == name.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def list_categories(db: Session, active_only: bool = False) -> List[Category]:
        ProductService.seed_initial_categories(db)
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

    @staticmethod
    def delete_category(db: Session, category_id: int) -> None:
        category = ProductService.get_category_by_id(db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada.",
            )
        db.delete(category)
        db.commit()

    # --- Unidades de Medida ---
    @staticmethod
    def get_unit_by_id(db: Session, unit_id: int) -> Optional[UnitOfMeasure]:
        return db.get(UnitOfMeasure, unit_id)

    @staticmethod
    def get_unit_by_code(db: Session, code: str) -> Optional[UnitOfMeasure]:
        stmt = select(UnitOfMeasure).where(func.lower(UnitOfMeasure.code) == code.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def seed_initial_units(db: Session) -> None:
        """Garante a existência das unidades de medida padrão (UN, KG, G, L, ML, CM, M, PCT, CX)."""
        count = db.execute(select(func.count(UnitOfMeasure.id))).scalar() or 0
        if count == 0:
            for item in DEFAULT_INITIAL_UNITS:
                existing = ProductService.get_unit_by_code(db, item["code"])
                if not existing:
                    new_unit = UnitOfMeasure(
                        code=item["code"],
                        name=item["name"],
                        allows_decimals=item["allows_decimals"],
                    )
                    db.add(new_unit)
            db.commit()

    @staticmethod
    def list_units(db: Session) -> List[UnitOfMeasure]:
        ProductService.seed_initial_units(db)
        from sqlalchemy import case
        is_un = case((UnitOfMeasure.code == "UN", 0), else_=1)
        stmt = select(UnitOfMeasure).order_by(is_un, UnitOfMeasure.name, UnitOfMeasure.code)
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

    @staticmethod
    def update_unit(db: Session, unit: UnitOfMeasure, unit_in: UnitUpdate) -> UnitOfMeasure:
        if unit_in.code is not None:
            clean_code = unit_in.code.upper().strip()
            existing = ProductService.get_unit_by_code(db, clean_code)
            if existing and existing.id != unit.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unidade de medida '{clean_code}' já está cadastrada.",
                )
            unit.code = clean_code
        if unit_in.name is not None:
            unit.name = unit_in.name.strip()
        if unit_in.allows_decimals is not None:
            unit.allows_decimals = unit_in.allows_decimals
        db.commit()
        db.refresh(unit)
        return unit

    @staticmethod
    def delete_unit(db: Session, unit_id: int) -> None:
        unit = ProductService.get_unit_by_id(db, unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unidade de medida não encontrada.",
            )
        products_count = db.execute(
            select(func.count(Product.id)).where(Product.unit_id == unit_id)
        ).scalar() or 0
        if products_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir a unidade '{unit.name}' ({unit.code}) pois existem {products_count} produto(s) associado(s).",
            )
        db.delete(unit)
        db.commit()

    # --- Cores dos Produtos ---
    @staticmethod
    def seed_initial_colors(db: Session) -> None:
        """Garante a existência das cores padrão se não existirem."""
        count = db.execute(select(func.count(ProductColor.id))).scalar() or 0
        if count == 0:
            for item in DEFAULT_INITIAL_COLORS:
                existing = ProductService.get_color_by_name(db, item["name"])
                if not existing:
                    new_color = ProductColor(
                        name=item["name"],
                        hex_code=item["hex_code"],
                        is_active=True,
                    )
                    db.add(new_color)
            db.commit()

    @staticmethod
    def list_colors(db: Session) -> List[ProductColor]:
        ProductService.seed_initial_colors(db)
        stmt = select(ProductColor).order_by(ProductColor.name)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_color_by_id(db: Session, color_id: int) -> Optional[ProductColor]:
        return db.get(ProductColor, color_id)

    @staticmethod
    def get_color_by_name(db: Session, name: str) -> Optional[ProductColor]:
        stmt = select(ProductColor).where(func.lower(ProductColor.name) == name.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def create_color(db: Session, color_in: ColorCreate) -> ProductColor:
        clean_name = color_in.name.strip()
        existing = ProductService.get_color_by_name(db, clean_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma cor cadastrada com o nome '{clean_name}'.",
            )
        color = ProductColor(
            name=clean_name,
            hex_code=color_in.hex_code.strip() if color_in.hex_code else None,
            is_active=color_in.is_active,
        )
        db.add(color)
        db.commit()
        db.refresh(color)
        return color

    @staticmethod
    def update_color(db: Session, color: ProductColor, color_in: ColorUpdate) -> ProductColor:
        if color_in.name is not None:
            clean_name = color_in.name.strip()
            existing = ProductService.get_color_by_name(db, clean_name)
            if existing and existing.id != color.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outra cor com o nome '{clean_name}'.",
                )
            color.name = clean_name
        if color_in.hex_code is not None:
            color.hex_code = color_in.hex_code.strip() if color_in.hex_code else None
        if color_in.is_active is not None:
            color.is_active = color_in.is_active
        db.commit()
        db.refresh(color)
        return color

    @staticmethod
    def delete_color(db: Session, color_id: int) -> None:
        color = ProductService.get_color_by_id(db, color_id)
        if not color:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cor não encontrada.",
            )
        db.delete(color)
        db.commit()

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
            cost_breakdown=product_in.cost_breakdown,
            sales_links=product_in.sales_links,
            color=product_in.color.strip() if product_in.color else None,
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
        if product_in.cost_breakdown is not None:
            product.cost_breakdown = product_in.cost_breakdown
        if product_in.sales_links is not None:
            product.sales_links = product_in.sales_links
        if product_in.color is not None:
            product.color = product_in.color.strip() if product_in.color else None
        if product_in.sale_price is not None:
            product.sale_price = product_in.sale_price
        if product_in.min_stock is not None:
            product.min_stock = product_in.min_stock
        if product_in.is_active is not None:
            product.is_active = product_in.is_active

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete_product(db: Session, product: Product) -> None:
        """
        Exclui permanentemente um produto do catálogo e limpa registros
        associados (fotos em disco/banco, movimentações de estoque, itens de receitas,
        ordens de produção e itens de vendas associados).
        """
        from app.models.stock import StockMovement
        from app.models.sale import Sale, SaleItem
        from app.models.production import (
            ProductionRecipe,
            ProductionRecipeItem,
            ProductionOrder,
            ProductionOrderItem,
        )

        # 1. Remover movimentações de estoque deste produto
        db.execute(delete(StockMovement).where(StockMovement.product_id == product.id))

        # 2. Remover itens de ordens de produção onde o produto é insumo
        db.execute(delete(ProductionOrderItem).where(ProductionOrderItem.component_product_id == product.id))

        # 3. Remover ordens de produção onde o produto é o produto acabado principal (e seus itens)
        stmt_orders = select(ProductionOrder).where(ProductionOrder.product_id == product.id)
        orders = list(db.execute(stmt_orders).scalars().all())
        for order in orders:
            db.delete(order)

        # 4. Remover itens de receitas onde o produto é insumo
        db.execute(delete(ProductionRecipeItem).where(ProductionRecipeItem.component_product_id == product.id))

        # 5. Remover receitas onde o produto é o produto acabado principal (e seus itens)
        stmt_recipes = select(ProductionRecipe).where(ProductionRecipe.product_id == product.id)
        recipes = list(db.execute(stmt_recipes).scalars().all())
        for recipe in recipes:
            db.delete(recipe)

        # 6. Remover itens de venda deste produto e atualizar vendas vinculadas
        stmt_sales = select(SaleItem.sale_id).where(SaleItem.product_id == product.id).distinct()
        affected_sale_ids = list(db.execute(stmt_sales).scalars().all())
        db.execute(delete(SaleItem).where(SaleItem.product_id == product.id))

        for s_id in affected_sale_ids:
            sale = db.get(Sale, s_id)
            if sale:
                db.refresh(sale)
                if len(sale.items) == 0:
                    db.delete(sale)
                else:
                    sale.total_amount = sum(it.total_price for it in sale.items)

        # 7. Excluir arquivos físicos de fotos do produto do disco
        for img in product.images:
            try:
                storage_service.delete_file(img.file_path)
            except Exception:
                pass

        # 8. Sincronizar exclusões intermediárias e remover o produto
        db.flush()
        db.delete(product)
        db.commit()

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
        db.refresh(product)
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
