import os
import uuid
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from PIL import Image
import puremagic

from app.core.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StorageService:
    def __init__(self, media_dir: str = settings.MEDIA_DIR):
        self.media_dir = media_dir
        os.makedirs(self.media_dir, exist_ok=True)

    async def save_image(self, file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Valida e armazena uma imagem no sistema de arquivos.
        Retorna: (file_path_relativo, original_filename, file_size, mime_type)
        """
        # 1. Validar extensão do nome original
        original_filename = file.filename or "upload.jpg"
        ext = os.path.splitext(original_filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de arquivo não suportado ({ext}). Formatos permitidos: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        # 2. Ler conteúdo em memória para validação
        content = await file.read()
        file_size = len(content)

        # 3. Validar tamanho máximo em MB
        max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo excede o tamanho máximo permitido de {settings.MAX_IMAGE_SIZE_MB} MB.",
            )

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O arquivo enviado está vazio.",
            )

        # 4. Validar tipo MIME real via magic bytes (puremagic)
        try:
            detected_mimes = puremagic.magic_string(content)
            if not detected_mimes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não foi possível identificar o tipo de arquivo real.",
                )
            mime_type = detected_mimes[0].mime_type
            if mime_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tipo de imagem inválido ({mime_type}). Permitidos: {', '.join(ALLOWED_MIME_TYPES)}",
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falha ao verificar integridade binária da imagem.",
            )

        # 5. Validar integridade estrutural da imagem com PIL
        import io
        try:
            with Image.open(io.BytesIO(content)) as img:
                img.verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo corrompido ou imagem ilegível.",
            )

        # 6. Gerar nome de arquivo único e seguro (UUID v4)
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(self.media_dir, safe_filename)

        # 7. Persistir arquivo no storage local
        with open(destination_path, "wb") as f:
            f.write(content)

        return safe_filename, original_filename, file_size, mime_type

    def delete_file(self, filename: str) -> bool:
        """Exclui o arquivo físico do storage."""
        try:
            # Prevenir path traversal sanitizando o nome do arquivo
            safe_basename = os.path.basename(filename)
            file_path = os.path.join(self.media_dir, safe_basename)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception:
            pass
        return False


storage_service = StorageService()
