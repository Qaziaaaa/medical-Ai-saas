from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import settings

# FastAPI's built-in bearer token extractor
security = HTTPBearer(auto_error=False)


async def verify_token(request: Request):
    """
    Extracts and validates the JWT from the Authorization header.
    Attaches decoded payload to request.state.user on success.
    Raises 401 if missing or invalid.
    """
    credentials: HTTPAuthorizationCredentials | None = await security(request)

    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        request.state.user = payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
