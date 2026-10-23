from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.product import ItemType, Product
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductImageResponse,
    ImageReorderRequest,
)
from app.services.product_service import product_service
from app.services.storage_service import storage_service

router = APIRouter()


def _enrich_product_response(product: Product) -> ProductResponse:
    """Calcula URLs de imagens e enriquece a resposta do schema."""
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
    return resp


@router.get("", response_model=List[ProductResponse])
def list_products(
    item_type: Optional[ItemType] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista itens cadastrados (produtos acabados, insumos, etc.) com filtros."""
    products = product_service.list_products(
        db,
        item_type=item_type,
        category_id=category_id,
        search=search,
        active_only=active_only,
        skip=skip,
        limit=limit,
    )
    return [_enrich_product_response(p) for p in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra um novo item (produto acabado, matéria-prima, embalagem ou material auxiliar)."""
    product = product_service.create_product(db, product_in)
    return _enrich_product_response(product)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retorna detalhes de um item por ID."""
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado.",
        )
    return _enrich_product_response(product)


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
    return _enrich_product_response(updated)


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
    return _enrich_product_response(product)


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
