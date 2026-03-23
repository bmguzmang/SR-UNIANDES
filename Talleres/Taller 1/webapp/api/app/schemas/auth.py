from pydantic import BaseModel


class LoginRequest(BaseModel):
    userKey: str


class LoginResponse(BaseModel):
    token: str
    user: dict
