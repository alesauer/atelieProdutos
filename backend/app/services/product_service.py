from typing import List, Optional
from sqlalchemy import select, func, delete, case
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status

from decimal import Decimal
from app.core.config import settings
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.color import ProductColor
from app.models.material import ProductMaterial
from app.models.supply import ProductSupply
from app.models.product import Product, ProductImage, ItemType, ProductKitItem
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.unit import UnitCreate, UnitUpdate
from app.schemas.color import ColorCreate, ColorUpdate
from app.schemas.material import MaterialCreate, MaterialUpdate
from app.schemas.supply import SupplyCreate, SupplyUpdate
from app.schemas.product import ProductCreate, ProductUpdate, ImageReorderItem, VariationCreate
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


DEFAULT_INITIAL_MATERIALS = [
    {"name": "Cimento Estrutural", "description": "Concreto / Cimento de alta resistência estrutural"},
    {"name": "Granilite", "description": "Composto de cimento com agregados minerais ou mármore"},
    {"name": "Cimento + Argamassa ACIII", "description": "Mistura especial com polímeros para peças artesanais"},
    {"name": "Cera Vegetal de Coco", "description": "Cera 100% vegetal para velas aromáticas de alta qualidade"},
    {"name": "Cera de Palma", "description": "Cera natural vegetal com textura aveludada"},
    {"name": "Parafina Gel", "description": "Base translúcida para velas decorativas"},
    {"name": "Gesso Cerâmico", "description": "Gesso de alta dureza para peças decorativas"},
    {"name": "Resina Ecológica / Jesmonite", "description": "Composto mineral ecológico à base de água"},
    {"name": "Vidro", "description": "Frascos, potes e recipientes em vidro"},
    {"name": "Cerâmica", "description": "Peças cerâmicas esmaltadas ou queimadas"},
    {"name": "Madeira / Bambu", "description": "Tampas e bases torneadas em madeira ou bambu natural"},
    {"name": "Alumínio / Metal", "description": "Latas, tampas e recipientes metálicos"},
]


DEFAULT_INITIAL_SUPPLIES = [
    {
        "name": "Cimento",
        "category": "Matéria-Prima",
        "unit": "gr",
        "base_quantity": Decimal("100.000"),
        "base_cost": Decimal("3.4400"),
        "unit_cost": Decimal("0.0344"),
        "notes": "R$ 3,44 a cada 100 gramas",
    },
    {
        "name": "Batente Silicone",
        "category": "Material Auxiliar",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("0.1100"),
        "unit_cost": Decimal("0.1100"),
        "notes": "R$ 0,11 cada unidade",
    },
    {
        "name": "Etiqueta Grande",
        "category": "Material Auxiliar",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("0.2500"),
        "unit_cost": Decimal("0.2500"),
        "notes": "R$ 0,25 cada",
    },
    {
        "name": "Etiqueta Pequena",
        "category": "Material Auxiliar",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("0.1300"),
        "unit_cost": Decimal("0.1300"),
        "notes": "R$ 0,13 cada",
    },
    {
        "name": "Papel Seda Estampado",
        "category": "Embalagem",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("0.2900"),
        "unit_cost": Decimal("0.2900"),
        "notes": "R$ 0,29 cada folha",
    },
    {
        "name": "Caixa Papelão P",
        "category": "Embalagem",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("2.8000"),
        "unit_cost": Decimal("2.8000"),
        "notes": "R$ 2,80 cada",
    },
    {
        "name": "Caixa Papelão M",
        "category": "Embalagem",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("2.8000"),
        "unit_cost": Decimal("2.8000"),
        "notes": "R$ 2,80 cada",
    },
    {
        "name": "Caixa Papelão G",
        "category": "Embalagem",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("2.8000"),
        "unit_cost": Decimal("2.8000"),
        "notes": "R$ 2,80 cada",
    },
    {
        "name": "Pavio para Vela 18cm",
        "category": "Matéria-Prima",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("0.5000"),
        "unit_cost": Decimal("0.5000"),
        "notes": "Pavio com ilhós 18cm",
    },
    {
        "name": "Plástico Bolha",
        "category": "Embalagem",
        "unit": "unid",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("0.3500"),
        "unit_cost": Decimal("0.3500"),
        "notes": "R$ 0,35 por pedaço / metro",
    },
    {
        "name": "Comissão Shopee (20%)",
        "category": "Taxas e Marketplaces",
        "unit": "%",
        "base_quantity": Decimal("20.000"),
        "base_cost": Decimal("20.0000"),
        "unit_cost": Decimal("0.2000"),
        "notes": "20% sobre o preço de venda",
    },
    {
        "name": "Taxa Fixa Shopee",
        "category": "Taxas e Marketplaces",
        "unit": "fixo",
        "base_quantity": Decimal("1.000"),
        "base_cost": Decimal("4.0000"),
        "unit_cost": Decimal("4.0000"),
        "notes": "Taxa fixa de R$ 4,00 por venda/pedido",
    },
]


class ProductService:
    # --- Categorias ---
    @staticmethod
    def seed_initial_categories(db: Session) -> None:
        """Garante a existência das categorias iniciais solicitadas se não existirem."""
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
        # Kit como padrão prioritário no topo da lista
        stmt = stmt.order_by(
            case((func.lower(Category.name) == "kit", 0), else_=1),
            Category.name,
        )
        return list(db.execute(stmt).scalars().all())

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
        if "description" in category_in.model_fields_set:
            category.description = category_in.description.strip() if category_in.description else None
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
        if "hex_code" in color_in.model_fields_set:
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

    # --- Materiais dos Produtos ---
    @staticmethod
    def seed_initial_materials(db: Session) -> None:
        """Garante a existência dos materiais padrão se não existirem."""
        count = db.execute(select(func.count(ProductMaterial.id))).scalar() or 0
        if count == 0:
            for item in DEFAULT_INITIAL_MATERIALS:
                existing = ProductService.get_material_by_name(db, item["name"])
                if not existing:
                    new_mat = ProductMaterial(
                        name=item["name"],
                        description=item["description"],
                        is_active=True,
                    )
                    db.add(new_mat)
            db.commit()

    @staticmethod
    def list_materials(db: Session, active_only: bool = False) -> List[ProductMaterial]:
        ProductService.seed_initial_materials(db)
        stmt = select(ProductMaterial)
        if active_only:
            stmt = stmt.where(ProductMaterial.is_active.is_(True))
        return list(db.execute(stmt.order_by(ProductMaterial.name)).scalars().all())

    @staticmethod
    def get_material_by_id(db: Session, material_id: int) -> Optional[ProductMaterial]:
        return db.get(ProductMaterial, material_id)

    @staticmethod
    def get_material_by_name(db: Session, name: str) -> Optional[ProductMaterial]:
        stmt = select(ProductMaterial).where(func.lower(ProductMaterial.name) == name.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def create_material(db: Session, material_in: MaterialCreate) -> ProductMaterial:
        clean_name = material_in.name.strip()
        existing = ProductService.get_material_by_name(db, clean_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um material cadastrado com o nome '{clean_name}'.",
            )
        mat = ProductMaterial(
            name=clean_name,
            description=material_in.description.strip() if material_in.description else None,
            is_active=material_in.is_active,
        )
        db.add(mat)
        db.commit()
        db.refresh(mat)
        return mat

    @staticmethod
    def update_material(db: Session, mat: ProductMaterial, material_in: MaterialUpdate) -> ProductMaterial:
        if material_in.name is not None:
            clean_name = material_in.name.strip()
            existing = ProductService.get_material_by_name(db, clean_name)
            if existing and existing.id != mat.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outro material com o nome '{clean_name}'.",
                )
            mat.name = clean_name
        if "description" in material_in.model_fields_set:
            mat.description = material_in.description.strip() if material_in.description else None
        if material_in.is_active is not None:
            mat.is_active = material_in.is_active
        db.commit()
        db.refresh(mat)
        return mat

    @staticmethod
    def delete_material(db: Session, material_id: int) -> None:
        mat = ProductService.get_material_by_id(db, material_id)
        if not mat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material não encontrado.",
            )
        products_count = db.execute(
            select(func.count(Product.id)).where(func.lower(Product.material) == mat.name.lower())
        ).scalar() or 0
        if products_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir o material '{mat.name}' pois existem {products_count} produto(s) associado(s).",
            )
        db.delete(mat)
        db.commit()

    # --- Insumos / Matérias-Primas de Produção ---
    @staticmethod
    def seed_initial_supplies(db: Session) -> None:
        """Garante a existência dos insumos iniciais de produção se a tabela estiver vazia."""
        count = db.execute(select(func.count(ProductSupply.id))).scalar() or 0
        if count == 0:
            for item in DEFAULT_INITIAL_SUPPLIES:
                existing = ProductService.get_supply_by_name(db, item["name"])
                if not existing:
                    new_sup = ProductSupply(
                        name=item["name"],
                        category=item["category"],
                        unit=item["unit"],
                        base_quantity=item["base_quantity"],
                        base_cost=item["base_cost"],
                        unit_cost=item["unit_cost"],
                        notes=item["notes"],
                        is_active=True,
                    )
                    db.add(new_sup)
            db.commit()

    @staticmethod
    def list_supplies(db: Session, active_only: bool = False) -> List[ProductSupply]:
        ProductService.seed_initial_supplies(db)
        stmt = select(ProductSupply)
        if active_only:
            stmt = stmt.where(ProductSupply.is_active.is_(True))
        return list(db.execute(stmt.order_by(ProductSupply.category, ProductSupply.name)).scalars().all())

    @staticmethod
    def get_supply_by_id(db: Session, supply_id: int) -> Optional[ProductSupply]:
        return db.get(ProductSupply, supply_id)

    @staticmethod
    def get_supply_by_name(db: Session, name: str) -> Optional[ProductSupply]:
        stmt = select(ProductSupply).where(func.lower(ProductSupply.name) == name.lower().strip())
        return db.execute(stmt).scalars().first()

    @staticmethod
    def create_supply(db: Session, supply_in: SupplyCreate) -> ProductSupply:
        clean_name = supply_in.name.strip()
        existing = ProductService.get_supply_by_name(db, clean_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um insumo cadastrado com o nome '{clean_name}'.",
            )
        base_qty = supply_in.base_quantity if supply_in.base_quantity and supply_in.base_quantity > 0 else Decimal("1.000")
        base_c = supply_in.base_cost if supply_in.base_cost is not None else Decimal("0.00")
        calc_unit_cost = (base_c / base_qty) if base_qty > 0 else Decimal("0.00")

        sup = ProductSupply(
            name=clean_name,
            category=supply_in.category.strip() if supply_in.category else None,
            unit=supply_in.unit.strip() if supply_in.unit else "unid",
            base_quantity=base_qty,
            base_cost=base_c,
            unit_cost=supply_in.unit_cost if supply_in.unit_cost is not None and supply_in.unit_cost > 0 else calc_unit_cost,
            notes=supply_in.notes.strip() if supply_in.notes else None,
            is_active=supply_in.is_active,
        )
        db.add(sup)
        db.commit()
        db.refresh(sup)
        return sup

    @staticmethod
    def update_supply(db: Session, sup: ProductSupply, supply_in: SupplyUpdate) -> ProductSupply:
        if supply_in.name is not None:
            clean_name = supply_in.name.strip()
            existing = ProductService.get_supply_by_name(db, clean_name)
            if existing and existing.id != sup.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outro insumo com o nome '{clean_name}'.",
                )
            sup.name = clean_name
        if "category" in supply_in.model_fields_set:
            sup.category = supply_in.category.strip() if supply_in.category else None
        if "unit" in supply_in.model_fields_set and supply_in.unit is not None:
            sup.unit = supply_in.unit.strip() if supply_in.unit else "unid"
        if supply_in.base_quantity is not None:
            sup.base_quantity = supply_in.base_quantity
        if supply_in.base_cost is not None:
            sup.base_cost = supply_in.base_cost
        if supply_in.unit_cost is not None:
            sup.unit_cost = supply_in.unit_cost
        elif supply_in.base_cost is not None or supply_in.base_quantity is not None:
            base_qty = sup.base_quantity if sup.base_quantity > 0 else Decimal("1.000")
            sup.unit_cost = sup.base_cost / base_qty
        if "notes" in supply_in.model_fields_set:
            sup.notes = supply_in.notes.strip() if supply_in.notes else None
        if supply_in.is_active is not None:
            sup.is_active = supply_in.is_active
        db.commit()
        db.refresh(sup)
        return sup

    @staticmethod
    def delete_supply(db: Session, supply_id: int) -> None:
        sup = ProductService.get_supply_by_id(db, supply_id)
        if not sup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Insumo não encontrado.",
            )
        db.delete(sup)
        db.commit()

    # --- Produtos ---
    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.kit_items).selectinload(ProductKitItem.component_product),
                selectinload(Product.variations),
                selectinload(Product.images),
            )
        )
        return db.execute(stmt).scalars().first()

    @staticmethod
    def get_product_by_sku(db: Session, sku: str) -> Optional[Product]:
        stmt = (
            select(Product)
            .where(func.lower(Product.sku) == sku.lower().strip())
            .options(
                selectinload(Product.kit_items).selectinload(ProductKitItem.component_product),
                selectinload(Product.variations),
                selectinload(Product.images),
            )
        )
        return db.execute(stmt).scalars().first()

    @staticmethod
    def list_products(
        db: Session,
        item_type: Optional[str] = None,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        active_only: bool = True,
        catalog_only: bool = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Product]:
        stmt = select(Product).options(
            selectinload(Product.kit_items).selectinload(ProductKitItem.component_product),
            selectinload(Product.variations),
            selectinload(Product.images),
        )
        if active_only:
            stmt = stmt.where(Product.is_active.is_(True))
        if catalog_only:
            # Mostra apenas produtos pais no catálogo principal para não duplicar cards de variações
            stmt = stmt.where(Product.parent_id.is_(None))
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
            size=product_in.size.strip() if product_in.size else None,
            material=product_in.material.strip() if product_in.material else None,
            sale_price=product_in.sale_price,
            weight=product_in.weight,
            min_stock=product_in.min_stock,
            is_active=product_in.is_active,
            is_kit=product_in.is_kit,
            parent_id=product_in.parent_id if product_in.parent_id and product_in.parent_id > 0 else None,
            variation_name=product_in.variation_name.strip() if product_in.variation_name else None,
        )
        db.add(product)
        db.flush()

        if product.is_kit and product_in.kit_items:
            for item in product_in.kit_items:
                if item.component_product_id == product.id:
                    continue
                comp = db.get(Product, item.component_product_id)
                if comp:
                    kit_item = ProductKitItem(
                        kit_product_id=product.id,
                        component_product_id=item.component_product_id,
                        quantity=item.quantity,
                    )
                    db.add(kit_item)

        # Criação de variações se informadas diretamente no cadastro do produto
        if product_in.variations:
            from app.models.stock import StockMovement, MovementType
            for idx, var_in in enumerate(product_in.variations):
                var_color = var_in.color.strip() if var_in.color else (product.color.strip() if (idx == 0 and product.color) else None)
                clean_name = var_in.variation_name.strip() if var_in.variation_name else (var_color or f"Variação {idx+1}")
                
                var_sku = var_in.sku.strip().upper() if var_in.sku else None
                if not var_sku:
                    sku_slug = var_color.upper().replace(' ', '-') if var_color else clean_name.upper().replace(' ', '-')
                    var_sku = f"{product.sku}-{sku_slug}"
                elif var_sku.endswith('-1') and var_color:
                    # Se foi gerado com sufixo genérico '-1', substitui pelo slug da cor
                    var_sku = f"{product.sku}-{var_color.upper().replace(' ', '-')}"

                existing = ProductService.get_product_by_sku(db, var_sku)
                if existing:
                    var_sku = f"{var_sku}-{idx+1}"

                unit_cost = var_in.unit_cost if var_in.unit_cost is not None else product.unit_cost
                sale_price = var_in.sale_price if var_in.sale_price is not None else product.sale_price
                weight = var_in.weight if var_in.weight is not None else product.weight

                variation = Product(
                    sku=var_sku,
                    name=product.name,
                    description=product.description,
                    item_type=product.item_type,
                    category_id=product.category_id,
                    unit_id=product.unit_id,
                    unit_cost=unit_cost,
                    cost_breakdown=product.cost_breakdown,
                    sales_links=product.sales_links,
                    color=var_color,
                    size=var_in.size.strip() if var_in.size else None,
                    material=var_in.material.strip() if var_in.material else product.material,
                    sale_price=sale_price,
                    weight=weight,
                    min_stock=var_in.min_stock if var_in.min_stock is not None else Decimal("0.000"),
                    is_active=True,
                    parent_id=product.id,
                    variation_name=clean_name,
                )
                db.add(variation)
                db.flush()

                if not product.is_kit and var_in.initial_stock and var_in.initial_stock > 0:
                    initial_mov = StockMovement(
                        product_id=variation.id,
                        movement_type=MovementType.ENTRADA_INICIAL,
                        quantity=var_in.initial_stock,
                        unit_cost_at_moment=variation.unit_cost,
                        justification=f"Estoque inicial ao cadastrar variação '{variation.variation_name}'",
                    )
                    db.add(initial_mov)

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
        if "size" in product_in.model_fields_set:
            product.size = product_in.size.strip() if product_in.size else None
        if product_in.material is not None:
            product.material = product_in.material.strip() if product_in.material else None
        if product_in.sale_price is not None:
            product.sale_price = product_in.sale_price
        if "weight" in product_in.model_fields_set:
            product.weight = product_in.weight
        if product_in.min_stock is not None:
            product.min_stock = product_in.min_stock
        if product_in.is_active is not None:
            product.is_active = product_in.is_active
        if product_in.is_kit is not None:
            product.is_kit = product_in.is_kit
        if product_in.parent_id is not None:
            product.parent_id = product_in.parent_id if product_in.parent_id > 0 else None
        if product_in.variation_name is not None:
            product.variation_name = product_in.variation_name.strip() if product_in.variation_name else None

        if product_in.kit_items is not None:
            db.execute(delete(ProductKitItem).where(ProductKitItem.kit_product_id == product.id))
            if product.is_kit:
                for item in product_in.kit_items:
                    if item.component_product_id == product.id:
                        continue
                    comp = db.get(Product, item.component_product_id)
                    if comp:
                        kit_item = ProductKitItem(
                            kit_product_id=product.id,
                            component_product_id=item.component_product_id,
                            quantity=item.quantity,
                        )
                        db.add(kit_item)

        # Atualização/inserção/exclusão de variações se informadas no payload
        if product_in.variations is not None:
            from app.models.stock import StockMovement, MovementType
            from app.services.stock_service import StockService

            incoming_skus = {v.sku.strip().upper() for v in product_in.variations if v.sku}
            incoming_ids = {v.id for v in product_in.variations if v.id is not None}

            # 1. Excluir permanentemente variações que foram removidas pelo usuário da grade
            for existing_var in list(product.variations):
                is_retained = (existing_var.id in incoming_ids) or (existing_var.sku.upper() in incoming_skus)
                if not is_retained:
                    ProductService.delete_product(db, existing_var)

            # Recarrega mapa de variações restantes por id e por sku
            existing_vars_by_id = {v.id: v for v in product.variations}
            existing_vars_by_sku = {v.sku.upper(): v for v in product.variations}

            for idx, var_in in enumerate(product_in.variations):
                var_sku = var_in.sku.strip().upper() if var_in.sku else f"{product.sku}-{var_in.variation_name.strip().upper().replace(' ', '-')}"

                # Localiza se já existe pelo ID ou pelo SKU
                target_var = None
                if var_in.id and var_in.id in existing_vars_by_id:
                    target_var = existing_vars_by_id[var_in.id]
                elif var_sku in existing_vars_by_sku:
                    target_var = existing_vars_by_sku[var_sku]

                if target_var:
                    # Atualiza variação existente
                    target_var.variation_name = var_in.variation_name.strip()
                    if var_in.sku:
                        new_var_sku = var_in.sku.strip().upper()
                        if new_var_sku != target_var.sku:
                            other = ProductService.get_product_by_sku(db, new_var_sku)
                            if other and other.id != target_var.id:
                                new_var_sku = f"{new_var_sku}-{idx+1}"
                            target_var.sku = new_var_sku
                    if var_in.color is not None:
                        target_var.color = var_in.color.strip() if var_in.color else None
                    if var_in.size is not None:
                        target_var.size = var_in.size.strip() if var_in.size else None
                    if var_in.material is not None:
                        target_var.material = var_in.material.strip() if var_in.material else product.material
                    if var_in.sale_price is not None:
                        target_var.sale_price = var_in.sale_price
                    if var_in.unit_cost is not None:
                        target_var.unit_cost = var_in.unit_cost
                    if var_in.weight is not None:
                        target_var.weight = var_in.weight
                    if var_in.min_stock is not None:
                        target_var.min_stock = var_in.min_stock

                    # Atualização de saldo em estoque para variação existente (ignorado para kits)
                    if not product.is_kit and var_in.initial_stock is not None:
                        target_stock = Decimal(str(var_in.initial_stock))
                        current_balance = StockService.get_product_balance(db, target_var.id)
                        stock_diff = target_stock - current_balance
                        if stock_diff != Decimal("0.000"):
                            if current_balance <= Decimal("0.000") and stock_diff > 0:
                                mov_type = MovementType.ENTRADA_INICIAL
                                just = f"Estoque inicial definido na edição da variação '{target_var.variation_name}'"
                            else:
                                mov_type = MovementType.AJUSTE_INVENTARIO
                                just = f"Ajuste de estoque na edição de '{target_var.variation_name}' (de {current_balance} para {target_stock})"
                            StockService.create_movement(
                                db=db,
                                product_id=target_var.id,
                                movement_type=mov_type,
                                quantity=stock_diff,
                                unit_cost_at_moment=target_var.unit_cost,
                                justification=just,
                                reference_type="MANUAL_ADJUSTMENT",
                            )
                else:
                    # Nova variação
                    existing_glob = ProductService.get_product_by_sku(db, var_sku)
                    if existing_glob:
                        var_sku = f"{var_sku}-{idx+1}"

                    var_color = var_in.color.strip() if var_in.color else (product.color.strip() if (idx == 0 and product.color) else None)
                    unit_cost = var_in.unit_cost if var_in.unit_cost is not None else product.unit_cost
                    sale_price = var_in.sale_price if var_in.sale_price is not None else product.sale_price
                    weight = var_in.weight if var_in.weight is not None else product.weight

                    new_var = Product(
                        sku=var_sku,
                        name=product.name,
                        description=product.description,
                        item_type=product.item_type,
                        category_id=product.category_id,
                        unit_id=product.unit_id,
                        unit_cost=unit_cost,
                        cost_breakdown=product.cost_breakdown,
                        sales_links=product.sales_links,
                        color=var_color,
                        size=var_in.size.strip() if var_in.size else None,
                        material=var_in.material.strip() if var_in.material else product.material,
                        sale_price=sale_price,
                        weight=weight,
                        min_stock=var_in.min_stock if var_in.min_stock is not None else Decimal("0.000"),
                        is_active=True,
                        parent_id=product.id,
                        variation_name=var_in.variation_name.strip(),
                    )
                    db.add(new_var)
                    db.flush()

                    if not product.is_kit and var_in.initial_stock and var_in.initial_stock > 0:
                        initial_mov = StockMovement(
                            product_id=new_var.id,
                            movement_type=MovementType.ENTRADA_INICIAL,
                            quantity=var_in.initial_stock,
                            unit_cost_at_moment=new_var.unit_cost,
                            justification=f"Estoque inicial ao adicionar variação '{new_var.variation_name}'",
                        )
                        db.add(initial_mov)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def create_variation(db: Session, parent_id: int, var_in: VariationCreate) -> Product:
        """Cria uma nova variação / subproduto vinculada a um produto pai."""
        parent = ProductService.get_product_by_id(db, parent_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto pai ID {parent_id} não encontrado.",
            )

        clean_sku = var_in.sku.strip().upper() if var_in.sku else f"{parent.sku}-{var_in.variation_name.strip().upper().replace(' ', '-')}"
        existing_sku = ProductService.get_product_by_sku(db, clean_sku)
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O SKU '{clean_sku}' já está em uso por outro produto ou variação.",
            )

        unit_cost = var_in.unit_cost if var_in.unit_cost is not None else parent.unit_cost
        sale_price = var_in.sale_price if var_in.sale_price is not None else parent.sale_price
        weight = var_in.weight if var_in.weight is not None else parent.weight

        variation = Product(
            sku=clean_sku,
            name=parent.name,
            description=parent.description,
            item_type=parent.item_type,
            category_id=parent.category_id,
            unit_id=parent.unit_id,
            unit_cost=unit_cost,
            cost_breakdown=parent.cost_breakdown,
            sales_links=parent.sales_links,
            color=var_in.color.strip() if var_in.color else None,
            size=var_in.size.strip() if var_in.size else None,
            material=var_in.material.strip() if var_in.material else parent.material,
            sale_price=sale_price,
            weight=weight,
            min_stock=var_in.min_stock if var_in.min_stock is not None else Decimal("0.000"),
            is_active=True,
            parent_id=parent.id,
            variation_name=var_in.variation_name.strip(),
        )
        db.add(variation)
        db.flush()

        # Se houver estoque inicial informado, lança movimentação
        if var_in.initial_stock and var_in.initial_stock > 0:
            from app.models.stock import StockMovement, MovementType
            initial_mov = StockMovement(
                product_id=variation.id,
                movement_type=MovementType.ENTRADA_INICIAL,
                quantity=var_in.initial_stock,
                unit_cost_at_moment=variation.unit_cost,
                justification=f"Estoque inicial ao cadastrar variação '{variation.variation_name}'",
            )
            db.add(initial_mov)

        db.commit()
        db.refresh(variation)
        return variation

    @staticmethod
    def link_existing_product_as_variation(
        db: Session, parent_id: int, child_id: int, variation_name: Optional[str] = None
    ) -> Product:
        """Agrupa um produto existente como variação de outro produto pai."""
        if parent_id == child_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Um produto não pode ser variação de si mesmo.",
            )
        parent = ProductService.get_product_by_id(db, parent_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto pai ID {parent_id} não encontrado.",
            )
        child = ProductService.get_product_by_id(db, child_id)
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto a agrupar ID {child_id} não encontrado.",
            )

        clean_var_name = variation_name.strip() if variation_name else (child.color or child.name)
        child.parent_id = parent.id
        child.variation_name = clean_var_name
        db.commit()
        db.refresh(parent)
        return parent

    @staticmethod
    def unlink_variation(db: Session, child_id: int) -> Product:
        """Desvincula uma variação, tornando-a novamente um produto independente no catálogo."""
        child = ProductService.get_product_by_id(db, child_id)
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Variação ID {child_id} não encontrada.",
            )
        child.parent_id = None
        db.commit()
        db.refresh(child)
        return child

    @staticmethod
    def delete_product(db: Session, product: Product, keep_variations: bool = False) -> None:
        """
        Exclui permanentemente um produto do catálogo e limpa registros
        associados (fotos em disco/banco, movimentações de estoque, itens de receitas,
        ordens de produção e itens de vendas associados).
        Se keep_variations=True, desvincula as variações filhas tornando-as produtos independentes
        em vez de excluí-las em cascata.
        """
        from app.models.stock import StockMovement
        from app.models.sale import Sale, SaleItem
        from app.models.production import (
            ProductionRecipe,
            ProductionRecipeItem,
            ProductionOrder,
            ProductionOrderItem,
        )

        if keep_variations and product.variations:
            from sqlalchemy import update
            db.execute(update(Product).where(Product.parent_id == product.id).values(parent_id=None))
            db.commit()
            db.expire_all()
            product = db.get(Product, product.id)
            target_ids = [product.id]
            photos_to_delete_products = [product]
        else:
            # Obter IDs do produto e de todas as suas variações filhas
            target_ids = [product.id] + [v.id for v in product.variations]
            photos_to_delete_products = [product] + list(product.variations)


        # 0. Remover itens de kits onde este produto ou variação participa ou é o kit pai
        from app.models.product import ProductKitItem
        db.execute(delete(ProductKitItem).where(ProductKitItem.component_product_id.in_(target_ids)))
        db.execute(delete(ProductKitItem).where(ProductKitItem.kit_product_id.in_(target_ids)))

        # 1. Remover movimentações de estoque deste produto e de suas variações
        db.execute(delete(StockMovement).where(StockMovement.product_id.in_(target_ids)))

        # 2. Remover itens de ordens de produção onde o produto ou variação é insumo
        db.execute(delete(ProductionOrderItem).where(ProductionOrderItem.component_product_id.in_(target_ids)))

        # 3. Remover ordens de produção onde o produto é o produto acabado principal (e seus itens)
        stmt_orders = select(ProductionOrder).where(ProductionOrder.product_id.in_(target_ids))
        orders = list(db.execute(stmt_orders).scalars().all())
        for order in orders:
            db.delete(order)

        # 4. Remover itens de receitas onde o produto é insumo
        db.execute(delete(ProductionRecipeItem).where(ProductionRecipeItem.component_product_id.in_(target_ids)))

        # 5. Remover receitas onde o produto é o produto acabado principal (e seus itens)
        stmt_recipes = select(ProductionRecipe).where(ProductionRecipe.product_id.in_(target_ids))
        recipes = list(db.execute(stmt_recipes).scalars().all())
        for recipe in recipes:
            db.delete(recipe)

        # 6. Remover itens de venda deste produto ou de suas variações e atualizar vendas vinculadas
        stmt_sales = select(SaleItem.sale_id).where(SaleItem.product_id.in_(target_ids)).distinct()
        affected_sale_ids = list(db.execute(stmt_sales).scalars().all())
        db.execute(delete(SaleItem).where(SaleItem.product_id.in_(target_ids)))

        for s_id in affected_sale_ids:
            sale = db.get(Sale, s_id)
            if sale:
                db.refresh(sale)
                if len(sale.items) == 0:
                    db.delete(sale)
                else:
                    sale.total_amount = sum(it.total_price for it in sale.items)

        # 7. Excluir arquivos físicos de fotos do produto e variações do disco
        for p_item in photos_to_delete_products:
            for img in p_item.images:
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
