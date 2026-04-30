from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    nombre: str | None
    rol: str
    activo: bool
    last_login: datetime | None
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str | None = None
    rol: str = "viewer"


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
