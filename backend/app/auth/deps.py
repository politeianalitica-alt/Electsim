from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.auth.schemas import UserOut
from app.core.security import decode_token
from app.db.session import query

bearer = HTTPBearer()


def _get_user_by_id(user_id: int) -> UserOut | None:
    df = query(
        "SELECT id, email, nombre, rol, activo, last_login, created_at "
        "FROM usuarios WHERE id = :id",
        {"id": user_id},
    )
    if df.empty:
        return None
    row = df.iloc[0]
    return UserOut(
        id=int(row["id"]),
        email=row["email"],
        nombre=row.get("nombre"),
        rol=row["rol"],
        activo=bool(row["activo"]),
        last_login=row.get("last_login"),
        created_at=row["created_at"],
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise credentials_exception

    user = _get_user_by_id(user_id)
    if user is None or not user.activo:
        raise credentials_exception
    return user


def require_admin(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user
