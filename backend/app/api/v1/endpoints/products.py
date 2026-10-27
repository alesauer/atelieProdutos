from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.product import ItemType, Product
from app.models.stock import StockMovement
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductImageResponse,
    ProductVariationResponse,
    VariationCreate,
    LinkVariationRequest,
    ImageReorderRequest,
)
from app.services.product_service import product_service
from app.services.stock_service import stock_service
from app.services.storage_service import storage_service

router = APIRouter()


def _enrich_product_response(
    product: Product,
    stock_map: Optional[dict] = None,
    current_stock: Optional[Decimal] = None,
) -> ProductResponse:
    """Calcula URLs de imagens e enriquece a resposta do schema com saldo de estoque real e variações."""
    resp = ProductResponse.model_validate(product)

    enriched_images = []
    primary_url = None

    for img in resp.images:
        url = f"{settings.API_V1_PREFIX}/media/{img.file_path}"
        img.url = url
        enriched_images.append(img)
        if img.is_primary:
            primary_url = url

    if not primary_url and enriched_images:
        primary_url = enriched_images[0].url

    resp.images = enriched_images
    resp.primary_image_url = primary_url

    # Enriquecer variações estilo Shopee (se houver)
    enriched_variations: List[ProductVariationResponse] = []
    for var in product.variations:
        var_resp = ProductVariationResponse.model_validate(var)
        var_stock = stock_map.get(var.id, Decimal("0.00")) if stock_map is not None else Decimal("0.00")
        var_resp.current_stock = round(var_stock, 2)
        if var_resp.unit_cost is not None:
            var_resp.unit_cost = round(var_resp.unit_cost, 2)
        if var_resp.sale_price is not None:
            var_resp.sale_price = round(var_resp.sale_price, 2)
        if var_resp.min_stock is not None:
            var_resp.min_stock = round(var_resp.min_stock, 2)

        v_imgs = []
        v_primary = None
        for v_img in var.images:
            v_url = f"{settings.API_V1_PREFIX}/media/{v_img.file_path}"
            img_r = ProductImageResponse.model_validate(v_img)
            img_r.url = v_url
            v_imgs.append(img_r)
            if v_img.is_primary:
                v_primary = v_url
        if not v_primary and v_imgs:
            v_primary = v_imgs[0].url
        elif not v_primary and primary_url:
            v_primary = primary_url

        var_resp.images = v_imgs
        var_resp.primary_image_url = v_primary
        enriched_variations.append(var_resp)

    resp.variations = enriched_variations

    # Saldo de estoque consolidado
    if enriched_variations:
        resp.current_stock = round(sum((v.current_stock for v in enriched_variations if v.current_stock is not None), Decimal("0.00")), 2)
    elif current_stock is not None:
        resp.current_stock = round(current_stock, 2)
    elif stock_map is not None:
        resp.current_stock = round(stock_map.get(product.id, Decimal("0.00")), 2)
    else:
        resp.current_stock = Decimal("0.00")

    if resp.unit_cost is not None:
        resp.unit_cost = round(resp.unit_cost, 2)
    if resp.sale_price is not None:
        resp.sale_price = round(resp.sale_price, 2)
    if resp.min_stock is not None:
        resp.min_stock = round(resp.min_stock, 2)

    return resp


@router.get("", response_model=List[ProductResponse])
def list_products(
    item_type: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    catalog_only: bool = Query(True, description="Se True, traz apenas produtos principais para evitar repetição no catálogo"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista itens cadastrados com filtros e saldo de estoque real consolidado por variações."""
    products = product_service.list_products(
        db,
        item_type=item_type,
        category_id=category_id,
        search=search,
        active_only=active_only,
        catalog_only=catalog_only,
        skip=skip,
        limit=limit,
    )
    all_ids = []
    for p in products:
        all_ids.append(p.id)
        for v in p.variations:
            all_ids.append(v.id)

    stock_map = {}
    if all_ids:
        stock_rows = db.execute(
            select(
                StockMovement.product_id,
                func.coalesce(func.sum(StockMovement.quantity), Decimal("0.000")),
            )
            .where(StockMovement.product_id.in_(all_ids))
            .group_by(StockMovement.product_id)
        ).all()
        stock_map = {row[0]: Decimal(str(row[1])) for row in stock_rows}

    return [_enrich_product_response(p, stock_map=stock_map) for p in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra um novo item (produto acabado, matéria-prima, embalagem ou material auxiliar)."""
    product = product_service.create_product(db, product_in)
    return _enrich_product_response(product, current_stock=Decimal("0.000"))


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retorna detalhes de um item por ID com saldo atual de estoque e suas variações."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    all_ids = [product.id] + [v.id for v in product.variations]
    stock_rows = db.execute(
        select(
            StockMovement.product_id,
            func.coalesce(func.sum(StockMovement.quantity), Decimal("0.000")),
        )
        .where(StockMovement.product_id.in_(all_ids))
        .group_by(StockMovement.product_id)
    ).all()
    stock_map = {row[0]: Decimal(str(row[1])) for row in stock_rows}
    return _enrich_product_response(product, stock_map=stock_map)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados cadastrais, custo fixo ou preço de venda de um item."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    updated = product_service.update_product(db, product, product_in)
    current_stock = stock_service.get_product_balance(db, updated.id)
    return _enrich_product_response(updated, current_stock=current_stock)


@router.put("/{product_id}/status", response_model=ProductResponse)
def toggle_product_status(
    product_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Ativa ou inativa um item no catálogo."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    product.is_active = is_active
    db.commit()
    db.refresh(product)
    current_stock = stock_service.get_product_balance(db, product.id)
    return _enrich_product_response(product, current_stock=current_stock)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui permanentemente um produto do catálogo e limpa registros associados."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    product_service.delete_product(db, product)
    return None


# --- Gestão de Imagens dos Produtos ---

@router.post("/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Realiza upload de imagem para o produto com validação de tipo MIME real,
    tamanho máximo (3MB) e dimensões.
    """
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )

    # Executa validação de formato e armazena fisicamente no filesystem
    safe_filename, original_filename, file_size, mime_type = await storage_service.save_image(file)

    image = product_service.add_product_image(
        db,
        product=product,
        file_path=safe_filename,
        original_filename=original_filename,
        file_size=file_size,
        mime_type=mime_type,
    )

    resp = ProductImageResponse.model_validate(image)
    resp.url = f"{settings.API_V1_PREFIX}/media/{image.file_path}"
    return resp


@router.post("/{product_id}/images/batch", response_model=List[ProductImageResponse], status_code=status.HTTP_201_CREATED)
async def upload_product_images_batch(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Realiza upload em lote de múltiplas fotos para o produto com validação
    individual de tipo MIME e limites.
    """
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )

    results = []
    for file in files:
        safe_filename, original_filename, file_size, mime_type = await storage_service.save_image(file)
        image = product_service.add_product_image(
            db,
            product=product,
            file_path=safe_filename,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
        )
        resp = ProductImageResponse.model_validate(image)
        resp.url = f"{settings.API_V1_PREFIX}/media/{image.file_path}"
        results.append(resp)
    return results


@router.get("/{product_id}/images", response_model=List[ProductImageResponse])
def list_product_images(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista as imagens vinculadas ao produto."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    results = []
    for img in product.images:
        resp = ProductImageResponse.model_validate(img)
        resp.url = f"{settings.API_V1_PREFIX}/media/{img.file_path}"
        results.append(resp)
    return results


@router.put("/{product_id}/images/{image_id}/primary", response_model=ProductImageResponse)
def set_primary_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Define uma imagem como foto de capa principal do produto."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    image = product_service.set_primary_image(db, product, image_id)
    resp = ProductImageResponse.model_validate(image)
    resp.url = f"{settings.API_V1_PREFIX}/media/{image.file_path}"
    return resp


@router.put("/{product_id}/images/reorder", status_code=status.HTTP_200_OK)
def reorder_images(
    product_id: int,
    reorder_in: ImageReorderRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza a ordem de apresentação das fotos do produto."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    product_service.reorder_images(db, product, reorder_in.items)
    return {"message": "Ordem das imagens atualizada com sucesso."}


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui a foto do produto no banco de dados e remove o arquivo físico do disco."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    product_service.delete_product_image(db, product, image_id)
    return None


# --- Variações / Subprodutos (Estilo Shopee) ---
@router.post("/{product_id}/variations", response_model=ProductVariationResponse, status_code=status.HTTP_201_CREATED)
def create_product_variation(
    product_id: int,
    var_in: VariationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cria uma nova variação (subproduto) vinculada a este produto."""
    child = product_service.create_variation(db, parent_id=product_id, var_in=var_in)
    child_stock = stock_service.get_product_balance(db, child.id)
    resp = ProductVariationResponse.model_validate(child)
    resp.current_stock = child_stock
    return resp


@router.post("/{product_id}/link-variation", response_model=ProductResponse)
def link_existing_product_as_variation(
    product_id: int,
    link_in: LinkVariationRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Agrupa um produto já cadastrado como variação deste produto."""
    parent = product_service.link_existing_product_as_variation(
        db, parent_id=product_id, child_id=link_in.child_id, variation_name=link_in.variation_name
    )
    all_ids = [parent.id] + [v.id for v in parent.variations]
    stock_rows = db.execute(
        select(
            StockMovement.product_id,
            func.coalesce(func.sum(StockMovement.quantity), Decimal("0.000")),
        )
        .where(StockMovement.product_id.in_(all_ids))
        .group_by(StockMovement.product_id)
    ).all()
    stock_map = {row[0]: Decimal(str(row[1])) for row in stock_rows}
    return _enrich_product_response(parent, stock_map=stock_map)


@router.delete("/{product_id}/variations/{variation_id}", status_code=status.HTTP_200_OK)
def unlink_product_variation(
    product_id: int,
    variation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Desvincula a variação, tornando-a novamente um produto independente no catálogo."""
    product_service.unlink_variation(db, variation_id)
    return {"message": "Variação desvinculada com sucesso."}
