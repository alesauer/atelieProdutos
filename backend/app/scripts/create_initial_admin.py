"""
Script para criação segura do primeiro administrador do sistema Casa Luma.
Uso:
    python -m app.scripts.create_initial_admin --email admin@casaluma.com.br --password senha_forte --name "Admin Casa Luma"
"""
import argparse
import sys
from app.core.database import engine, SessionLocal
from app.models import Base
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.user_service import user_service


def create_initial_admin(email: str, password: str, name: str):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = user_service.get_by_email(db, email)
        if existing:
            print(f"[!] Usuário com e-mail '{email}' já existe no banco de dados.")
            if not existing.is_admin:
                existing.is_admin = True
                db.commit()
                print(f"[+] Privilégios de administrador atribuídos a '{email}'.")
            return

        user_in = UserCreate(
            email=email,
            password=password,
            full_name=name,
            is_active=True,
            is_admin=True,
        )
        user = user_service.create_user(db, user_in)
        print(f"[✓] Administrador inicial '{user.full_name}' ({user.email}) criado com sucesso!")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Criar administrador inicial do Casa Luma Estoque")
    parser.add_argument("--email", default="admin@casaluma.com.br", help="E-mail do administrador")
    parser.add_argument("--password", default="admin123", help="Senha do administrador (padrão: admin123)")
    parser.add_argument("--name", default="Administrador Casa Luma", help="Nome completo")

    args = parser.parse_args()
    create_initial_admin(args.email, args.password, args.name)
