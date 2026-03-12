from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import companies, memo, query, upload

app = FastAPI(title="Investment Knowledge Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(upload.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(memo.router, prefix="/api")
app.include_router(companies.router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
