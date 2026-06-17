import pytest
from unittest.mock import patch, MagicMock
from fastapi import Request, HTTPException
from app.middleware.auth import verify_token


@pytest.mark.asyncio
async def test_missing_token_raises_401():
    request = MagicMock(spec=Request)

    with patch("app.middleware.auth.security") as mock_security:
        mock_security.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await verify_token(request)

        assert exc_info.value.status_code == 401
        assert "Authentication required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    request = MagicMock(spec=Request)
    credentials = MagicMock()
    credentials.credentials = "expired.token.here"

    with (
        patch("app.middleware.auth.security") as mock_security,
        patch("app.middleware.auth.jwt.decode") as mock_decode,
    ):
        mock_security.return_value = credentials
        import jwt as pyjwt

        mock_decode.side_effect = pyjwt.ExpiredSignatureError()

        with pytest.raises(HTTPException) as exc_info:
            await verify_token(request)

        assert exc_info.value.status_code == 401
        assert "Token has expired" in exc_info.value.detail


@pytest.mark.asyncio
async def test_invalid_token_raises_401():
    request = MagicMock(spec=Request)
    credentials = MagicMock()
    credentials.credentials = "invalid.token.here"

    with (
        patch("app.middleware.auth.security") as mock_security,
        patch("app.middleware.auth.jwt.decode") as mock_decode,
    ):
        mock_security.return_value = credentials
        import jwt as pyjwt

        mock_decode.side_effect = pyjwt.InvalidTokenError()

        with pytest.raises(HTTPException) as exc_info:
            await verify_token(request)

        assert exc_info.value.status_code == 401
        assert "Invalid token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_valid_token_attaches_user_to_request_state():
    request = MagicMock(spec=Request)
    request.state = MagicMock()
    credentials = MagicMock()
    credentials.credentials = "valid.jwt.token"

    payload = {"id": "user123", "role": "doctor"}

    with patch("app.middleware.auth.jwt.decode") as mock_decode:
        mock_security.return_value = credentials
        mock_decode.return_value = payload

        result = await verify_token(request)

        assert request.state.user == payload
        assert result is None

    mock_security = MagicMock()
