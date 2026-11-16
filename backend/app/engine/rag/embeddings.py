import math
import re
import logging
import hashlib
from typing import List, Optional
import httpx
from backend.app.core.config import settings

logger = logging.getLogger("agentos.rag.embeddings")

class EmbeddingService:
    """
    Hybrid Embedding Service supporting:
    1. Google Gemini Cloud Embeddings (text-embedding-004)
    2. Local Ollama Embeddings (nomic-embed-text / llama3)
    3. Deterministic Zero-Dependency Fallback Vectorizer (Sublinear Hashed TF-IDF, 128-dim)
    """
    def __init__(self):
        self.dim = 128

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # 1. Try Gemini Cloud Embeddings if configured
        if settings.GEMINI_API_KEY:
            try:
                vectors = await self._embed_gemini(texts)
                if vectors and len(vectors) == len(texts):
                    return vectors
            except Exception as e:
                logger.debug(f"Gemini embeddings unavailable, falling back: {e}")

        # 2. Try Local Ollama Embeddings
        try:
            vectors = await self._embed_ollama(texts)
            if vectors and len(vectors) == len(texts):
                return vectors
        except Exception as e:
            logger.debug(f"Ollama embeddings unavailable, falling back: {e}")

        # 3. Deterministic Fast Fallback
        return [self._embed_deterministic(t) for t in texts]

    async def _embed_gemini(self, texts: List[str]) -> List[List[float]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={settings.GEMINI_API_KEY}"
        payload = {
            "requests": [
                {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": t[:2000]}]},
                }
                for t in texts
            ]
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                embeddings = data.get("embeddings", [])
                return [e.get("values", []) for e in embeddings]
        raise RuntimeError(f"Gemini embed returned status {res.status_code}")

    async def _embed_ollama(self, texts: List[str]) -> List[List[float]]:
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/embed"
        payload = {
            "model": "nomic-embed-text",
            "input": texts,
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                embeddings = data.get("embeddings", [])
                if embeddings:
                    return embeddings
        raise RuntimeError("Ollama embed returned empty")

    def _embed_deterministic(self, text: str) -> List[float]:
        """
        Sublinear term frequency hashing vectorizer into 128 dimensions.
        L2-normalized for exact cosine similarity calculation.
        """
        vec = [0.0] * self.dim
        tokens = re.findall(r"\b\w{2,}\b", text.lower())
        if not tokens:
            return vec

        for t in tokens:
            h = int(hashlib.md5(t.encode("utf-8")).hexdigest()[:8], 16) % self.dim
            # Sublinear TF: 1 + log(tf)
            vec[h] += 1.0

        for i in range(self.dim):
            if vec[i] > 0:
                vec[i] = 1.0 + math.log(vec[i])

        # L2 Normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

global_embedding_service = EmbeddingService()
