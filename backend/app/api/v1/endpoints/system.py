from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.system_service import system_service
from app.services.storage_service import storage_service

router = APIRouter()


class SettingUpdateRequest(BaseModel):
    value: Any
    description: Optional[str] = None


class ResetDataRequest(BaseModel):
    password: str


@router.get("/settings", response_model=Dict[str, Any])
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todas as configurações do sistema."""
    return system_service.get_all_settings(db)


@router.put("/settings/{key}")
def update_setting(
    key: str,
    payload: SettingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma configuração específica por chave."""
    setting = system_service.update_setting(
        db=db,
        key=key,
        value=payload.value,
        description=payload.description,
    )
    return {"key": setting.key, "updated_at": setting.updated_at.isoformat()}


@router.post("/settings/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faz upload da logomarca do ateliê e atualiza os dados da empresa."""
    rel_path, _, _, _ = await storage_service.save_image(file)
    logo_url = f"{settings.API_V1_PREFIX}/media/{rel_path}"

    all_settings = system_service.get_all_settings(db)
    company_info = all_settings.get("company_info", {})
    if not isinstance(company_info, dict):
        company_info = {}

    company_info["logo_url"] = logo_url
    system_service.update_setting(db, "company_info", company_info, "Dados Oficiais do Ateliê")

    return {"logo_url": logo_url}


@router.get("/backup")
def export_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera e faz o download de um pacote .ZIP contendo dump JSON do banco e todas as imagens de mídia."""
    zip_buffer = system_service.export_backup_zip(db)
    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_casaluma_{now_str}.zip"
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    confirmation_keyword: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restaura um backup a partir de um arquivo .ZIP exportado previamente."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo de backup vazio.",
        )

    result = system_service.restore_backup(
        db=db,
        file_bytes=file_bytes,
        filename=file.filename or "backup.zip",
        confirmation_code=confirmation_keyword,
    )
    return result


@router.get("/export/{resource}")
def export_resource(
    resource: str,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta produtos, clientes, vendas ou estoque em formato XLSX ou CSV."""
    resource_map = {
        "products": system_service.export_products,
        "customers": system_service.export_customers,
        "sales": system_service.export_sales,
        "stock": system_service.export_stock,
    }

    exporter = resource_map.get(resource.lower())
    if not exporter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recurso '{resource}' não suportado para exportação. Use: products, customers, sales, stock.",
        )

    buffer, filename, media_type = exporter(db, export_format=format)
    return Response(
        content=buffer.getvalue(),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/templates/{resource}")
def get_import_template(
    resource: str,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    current_user: User = Depends(get_current_user),
):
    """Gera uma planilha modelo preenchível para importação em massa."""
    buffer, filename, media_type = system_service.get_template(resource, export_format=format)
    return Response(
        content=buffer.getvalue(),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/import/{resource}")
async def import_resource(
    resource: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa produtos ou clientes em lote através de arquivo XLSX ou CSV."""
    file_bytes = await file.read()
    filename = file.filename or "upload.xlsx"

    if resource.lower() == "products":
        return system_service.import_products(db, file_bytes, filename)
    elif resource.lower() == "customers":
        return system_service.import_customers(db, file_bytes, filename)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recurso '{resource}' não suporta importação. Use: products, customers.",
        )


@router.post("/maintenance/clean-orphaned-images")
def clean_orphaned_images(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove arquivos de imagens da pasta de mídia que não estejam associados a nenhum produto cadastrado."""
    return system_service.clean_orphaned_images(db)


@router.post("/maintenance/optimize-database")
def optimize_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executa OPTIMIZE TABLE e ANALYZE TABLE nas tabelas do sistema para desfragmentar índices."""
    return system_service.optimize_database(db)


@router.post("/maintenance/reset-demo-data")
def reset_demo_data(
    payload: ResetDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Zera dados transacionais (vendas, movimentações, produção) mediante confirmação estrita de senha do administrador."""
    return system_service.reset_demo_data(
        db=db,
        admin_password=payload.password,
        current_user_id=current_user.id,
    )


@router.get("/status")
def get_system_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna diagnóstico técnico, status do banco de dados e espaço ocupado em disco."""
    return system_service.get_system_status(db)
