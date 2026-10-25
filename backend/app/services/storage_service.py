import io
import os
import uuid
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps

from app.core.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".jfif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StorageService:
    def __init__(self, media_dir: str = settings.MEDIA_DIR):
        self._media_dir = media_dir

    @property
    def media_dir(self) -> str:
        dir_path = settings.MEDIA_DIR or self._media_dir
        os.makedirs(dir_path, exist_ok=True)
        return dir_path

    async def save_image(self, file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Valida, otimiza e armazena uma imagem no sistema de arquivos.
        Retorna: (file_path_relativo, original_filename, file_size, mime_type)
        """
        # 1. Validar extensão do nome original
        original_filename = file.filename or "upload.jpg"
        ext = os.path.splitext(original_filename)[1].lower()
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de arquivo não suportado ({ext}). Formatos permitidos: JPG, PNG, WEBP.",
            )

        # 2. Ler conteúdo em memória para validação
        content = await file.read()
        file_size = len(content)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O arquivo enviado está vazio.",
            )

        # 3. Validar tamanho máximo em MB
        max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo excede o tamanho máximo permitido de {settings.MAX_IMAGE_SIZE_MB} MB.",
            )

        # 4. Validar integridade e formato estrutural real da imagem com PIL
        try:
            with Image.open(io.BytesIO(content)) as img:
                format_name = (img.format or "").upper()
                if format_name not in ("JPEG", "JPG", "PNG", "WEBP"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Tipo de imagem não suportado ({format_name or ext}). Permitidos: JPG, PNG, WEBP.",
                    )

                if format_name in ("JPEG", "JPG"):
                    mime_type = "image/jpeg"
                    out_ext = ".jpg"
                elif format_name == "PNG":
                    mime_type = "image/png"
                    out_ext = ".png"
                else:
                    mime_type = "image/webp"
                    out_ext = ".webp"

                # 5. Corrigir orientação EXIF (fotos tiradas em smartphones)
                try:
                    img = ImageOps.exif_transpose(img)
                except Exception:
                    pass

                # 6. Redimensionar se exceder dimensão máxima para manter alta performance
                max_dimension = 1920
                if img.width > max_dimension or img.height > max_dimension:
                    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

                # 7. Gerar nome de arquivo único e seguro (UUID v4)
                safe_filename = f"{uuid.uuid4().hex}{out_ext}"
                destination_path = os.path.join(self.media_dir, safe_filename)

                # 8. Persistir otimizada no storage
                if format_name in ("JPEG", "JPG"):
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")
                    img.save(destination_path, format="JPEG", quality=88, optimize=True)
                elif format_name == "PNG":
                    img.save(destination_path, format="PNG", optimize=True)
                else:
                    img.save(destination_path, format="WEBP", quality=88, method=6)

                saved_size = os.path.getsize(destination_path)
                return safe_filename, original_filename, saved_size, mime_type

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo corrompido ou imagem ilegível.",
            )

    def delete_file(self, filename: str) -> bool:
        """Exclui o arquivo físico do storage."""
        try:
            safe_basename = os.path.basename(filename)
            file_path = os.path.join(self.media_dir, safe_basename)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception:
            pass
        return False


storage_service = StorageService()
