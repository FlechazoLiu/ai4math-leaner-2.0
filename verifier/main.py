from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import uvicorn
from server import AsyncVerifier
from loguru import logger
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from leanproject import LeanProject
load_dotenv()

REPO_URL_OR_PATH = os.getenv("REPO_URL_OR_PATH", "/opt/mathlib4")
LEAN_VERSION = os.getenv("LEAN_VERSION", "v4.22.0")
CPU_COUNT = int(os.getenv("WORKERS") or os.getenv("CPU_COUNT", 1))

if REPO_URL_OR_PATH and os.path.isdir(REPO_URL_OR_PATH):
    # Use image-baked local project directly to avoid runtime setup/network.
    project_path = REPO_URL_OR_PATH
else:
    project = LeanProject(repo_url_or_path=REPO_URL_OR_PATH, revision=LEAN_VERSION)
    project_path = project.project_path

verifier = AsyncVerifier(project=project_path, workers=CPU_COUNT)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    verifier.initialize_worker_pool()
    yield
    # Shutdown
    verifier.shutdown()

app = FastAPI(title="Lean Verifier API", lifespan=lifespan)

class VerificationRequest(BaseModel):
    code: str
    allow_sorry: bool = True

class BatchVerificationRequest(BaseModel):
    codes: List[str]
    allow_sorry: bool = True

class VerificationResponse(BaseModel):
    success: bool
    messages: List[dict]

class SelfTestResponse(BaseModel):
    success: bool
    messages: List[dict]
    sorries: List[dict] = []

class BatchVerificationResponse(BaseModel):
    results: List[VerificationResponse]

@app.post("/verify", response_model=VerificationResponse)
async def verify_code(request: VerificationRequest):
    """
    Verify a single piece of Lean code.

    Args:
        request: The verification request containing the code and allow_sorry flag

    Returns:
        VerificationResponse containing the verification result and messages
    """
    try:
        success, messages = await verifier.verify(
            code=request.code,
            allow_sorry=request.allow_sorry
        )
        return VerificationResponse(success=success, messages=messages)
    except Exception as e:
        logger.error(f"Error verifying code: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify/batch", response_model=BatchVerificationResponse)
async def verify_batch(request: BatchVerificationRequest):
    """
    Verify multiple pieces of Lean code in parallel.

    Args:
        request: The batch verification request containing the list of codes and allow_sorry flag

    Returns:
        BatchVerificationResponse containing the verification results for each code
    """
    try:
        results = await verifier.batched_verify(
            codes=request.codes,
            allow_sorry=request.allow_sorry
        )
        return BatchVerificationResponse(
            results=[
                VerificationResponse(success=is_valid, messages=messages)
                for is_valid, messages in results
            ]
        )
    except Exception as e:
        logger.error(f"Error verifying batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/self-test", response_model=SelfTestResponse)
async def self_test(request: VerificationRequest):
    """
    Self-test endpoint: verify Lean code and return proof state goals (sorries).

    Unlike /verify which is used for submission verification,
    this endpoint also returns sorries with proof state goals for
    interactive self-testing in the editor. Does NOT store results.
    """
    try:
        success, messages, sorries = await verifier.verify_with_goals(
            code=request.code,
            allow_sorry=request.allow_sorry
        )
        return SelfTestResponse(success=success, messages=messages, sorries=sorries)
    except Exception as e:
        logger.error(f"Error in self-test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    """Health check endpoint. Returns 200 if the worker pool is initialized."""
    if verifier.is_initialized:
        return {"status": "healthy", "workers": verifier.workers}
    return {"status": "initializing", "workers": verifier.workers}


def main():
    """Main entry point for the serve_verifier script."""
    uvicorn.run(app, host="0.0.0.0", port=8030)

if __name__ == "__main__":
    main()
