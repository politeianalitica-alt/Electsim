from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError

from app.auth.deps import get_current_user, require_admin
from app.auth.schemas import (
    LoginRequest, PasswordChange, RefreshRequest,
    TokenResponse, UserCreate, UserOut,
)
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_token, hash_password, verify_password,
)
from app.db.session import execute, query

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_user_row(email: str) -> dict | None:
    df = query(
        "SELECT id, email, password_hash, nombre, rol, activo "
        "FROM usuarios WHERE email = :email",
        {"email": email},
    )
    if df.empty:
        return None
    return df.iloc[0].to_dict()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = _get_user_row(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not user["activo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )
    execute(
        "UPDATE usuarios SET last_login = :ts WHERE id = :id",
        {"ts": datetime.now(timezone.utc), "id": int(user["id"])},
    )
    return TokenResponse(
        access_token=create_access_token(
            int(user["id"]), user["email"], user["rol"]
        ),
        refresh_token=create_refresh_token(int(user["id"])),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        )
    df = query(
        "SELECT id, email, rol, activo FROM usuarios WHERE id = :id",
        {"id": user_id},
    )
    if df.empty or not df.iloc[0]["activo"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario no encontrado")
    row = df.iloc[0]
    return TokenResponse(
        access_token=create_access_token(
            int(row["id"]), row["email"], row["rol"]
        ),
        refresh_token=create_refresh_token(int(row["id"])),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: PasswordChange,
    current_user: UserOut = Depends(get_current_user),
):
    df = query(
        "SELECT password_hash FROM usuarios WHERE id = :id",
        {"id": current_user.id},
    )
    if df.empty or not verify_password(body.current_password, df.iloc[0]["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Contraseña actual incorrecta")
    execute(
        "UPDATE usuarios SET password_hash = :h WHERE id = :id",
        {"h": hash_password(body.new_password), "id": current_user.id},
    )


# ── Gestión de usuarios (solo admin) ─────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_users(admin: UserOut = Depends(require_admin)):
    df = query(
        "SELECT id, email, nombre, rol, activo, last_login, created_at "
        "FROM usuarios ORDER BY created_at DESC"
    )
    return df.to_dict(orient="records")


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, admin: UserOut = Depends(require_admin)):
    existing = query("SELECT id FROM usuarios WHERE email = :e", {"e": body.email})
    if not existing.empty:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    execute(
        "INSERT INTO usuarios (email, password_hash, nombre, rol) "
        "VALUES (:email, :hash, :nombre, :rol)",
        {
            "email": body.email,
            "hash": hash_password(body.password),
            "nombre": body.nombre,
            "rol": body.rol,
        },
    )
    df = query("SELECT id, email, nombre, rol, activo, last_login, created_at "
               "FROM usuarios WHERE email = :e", {"e": body.email})
    return df.iloc[0].to_dict()


@router.patch("/users/{user_id}/toggle", response_model=UserOut)
def toggle_user(user_id: int, admin: UserOut = Depends(require_admin)):
    execute(
        "UPDATE usuarios SET activo = NOT activo WHERE id = :id",
        {"id": user_id},
    )
    df = query("SELECT id, email, nombre, rol, activo, last_login, created_at "
               "FROM usuarios WHERE id = :id", {"id": user_id})
    if df.empty:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return df.iloc[0].to_dict()
