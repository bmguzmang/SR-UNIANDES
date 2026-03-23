from fastapi import APIRouter, HTTPException, Request

from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request):
    store = request.app.state.store

    user = store.get_user_profile(payload.userKey)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    token = f"session-{payload.userKey}"

    return {
        "token": token,
        "user": user,
    }


@router.post("/logout")
def logout():
    return {"message": "logout_ok"}
