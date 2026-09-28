import logging
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException

from app.core.config import Settings, get_settings
from app.core.errors import ApiHTTPException
from app.db.session import build_engine, get_engine
from app.modules.ai_tutor.router import router as tutor_router
from app.modules.circuits.router import router as circuits_router
from app.modules.cohorts.router import router as cohorts_router
from app.modules.curriculum.router import router as curriculum_router
from app.modules.experiments.router import router as experiments_router
from app.modules.health.router import router as health_router
from app.modules.identity.router import router as identity_router
from app.modules.jobs.router import router as jobs_router
from app.modules.predictions.router import router as predictions_router

logger = logging.getLogger(__name__)


def error_response(request: Request, status: int, code: str, message: str) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid4()))
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "requestId": request_id}},
        headers={"X-Request-ID": request_id},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings or get_settings()
    # Engine creation is lazy about connections; each ASGI app owns and disposes its pool.
    engine = build_engine(configuration)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        yield
        engine.dispose()

    application = FastAPI(title="QuantumLoop API", version="0.1.0", lifespan=lifespan)
    application.dependency_overrides[get_settings] = lambda: configuration
    application.dependency_overrides[get_engine] = lambda: engine
    application.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "Idempotency-Key",
            "If-Match",
        ],
        expose_headers=["X-Request-ID", "ETag"],
    )

    @application.middleware("http")
    async def request_id(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        candidate = request.headers.get("X-Request-ID", "")
        request.state.request_id = (
            candidate if re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", candidate) else str(uuid4())
        )
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    @application.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        response = error_response(
            request,
            exc.status_code,
            exc.code if isinstance(exc, ApiHTTPException) else f"http_{exc.status_code}",
            str(exc.detail),
        )
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @application.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(request, 422, "validation_error", "Invalid request")

    @application.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_request_error request_id=%s", request.state.request_id)
        return error_response(request, 500, "internal_error", "Internal server error")

    application.include_router(health_router, prefix="/api/v1")
    application.include_router(identity_router, prefix="/api/v1")
    application.include_router(cohorts_router, prefix="/api/v1")
    application.include_router(circuits_router, prefix="/api/v1")
    application.include_router(curriculum_router, prefix="/api/v1")
    application.include_router(experiments_router, prefix="/api/v1")
    application.include_router(jobs_router, prefix="/api/v1")
    application.include_router(predictions_router, prefix="/api/v1")
    application.include_router(tutor_router, prefix="/api/v1")
    return application


app = create_app()
