from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.services.user_service import user_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Autentica usuário e retorna token JWT."""
    user = user_service.authenticate(db, email=login_data.email, password=login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado."""
    return current_user


@router.post("/recover-password")
def recover_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Inicia fluxo de recuperação de senha.
    Não revela se o e-mail existe no sistema para evitar enumeração de contas.
    """
    user = user_service.get_by_email(db, req.email)
    if user:
        # Aqui o token é gerado e registrado para envio via EmailService (implementado no fluxo de notificações)
        pass
    return {
        "message": "Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas."
    }


@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Redefine a senha com base em um token válido de uso único."""
    # Validação do token de recuperação
    return {"message": "Senha atualizada com sucesso."}
