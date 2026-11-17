# python-ai-service/app/core/nim_provider.py
"""
Centralized NVIDIA NIM provider (OpenAI-compatible chat completions).
Owns: auth, model resolution via API metadata, retries w/ exponential backoff,
rate-limit handling, timeouts, structured JSON parsing, usage tracking.
Never logs API keys. Never silently swaps models — resolved model is always
reported in provider metadata.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import re
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

MODEL_PREFERENCE = ("nemotron-3-ultra", "nemotron-3-super", "nemotron-3", "nemotron")


class NimProviderError(Exception):
    """Base NIM failure."""


class NimNotConfigured(NimProviderError):
    """No API key present."""


class NimModelUnavailable(NimProviderError):
    """Configured model not present on this NIM account."""


def _parse_json(content: str) -> dict:
    """
    Robust JSON parser for LLM outputs.
    Handles markdown blocks, trailing commas, and truncated strings.
    """
    if not content or not content.strip():
        raise ValueError("Empty content received from LLM")

    # 1. Try direct parse first (fastest path)
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 2. Extract from markdown ```json ... ``` blocks
    md_match = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", content, re.DOTALL | re.IGNORECASE)
    if md_match:
        try:
            return json.loads(md_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Extract the outermost { ... } object
    brace_match = re.search(r"\{.*\}", content, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # 4. Fallback to json_repair (fixes trailing commas, unclosed strings, etc.)
    try:
        import json_repair
        repaired = json_repair.repair_json(content, return_objects=True)
        if isinstance(repaired, (dict, list)):
            return repaired
    except ImportError:
        logger.warning("json-repair not installed. Run: pip install json-repair")
    except Exception as e:
        logger.warning(f"json-repair failed: {e}")

    # 5. Last resort: aggressive regex cleanup
    cleaned = content
    cleaned = re.sub(r",\s*([\]}])", r"\1", cleaned) # Remove trailing commas
    cleaned = re.sub(r"^```json\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Final JSON parse failed. Raw content:\n{content[:500]}")
        raise ValueError(f"Could not parse JSON from LLM: {e}") from e


class NimProvider:
    def __init__(self) -> None:
        s = get_settings()
        self.api_key = s.nvidia_nim_api_key or os.getenv("NVIDIA_API_KEY", "")
        self.base_url = (
            s.nvidia_nim_base_url or "https://integrate.api.nvidia.com/v1"
        ).rstrip("/")
        self.configured_model = s.nvidia_nim_model or os.getenv("NVIDIA_NIM_MODEL", "")
        self.timeout = float(s.nim_timeout_s)
        self.max_retries = int(s.nim_max_retries)
        self._resolved_model: Optional[str] = None
        self._available_models: Optional[List[str]] = None
        self._last_probe: Optional[Dict[str, Any]] = None

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def list_models(self) -> List[str]:
        if not self.enabled:
            raise NimNotConfigured(
                "NVIDIA_NIM_API_KEY is not set. NIM provider disabled."
            )
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{self.base_url}/models", headers=self._headers())
            resp.raise_for_status()
            data = resp.json().get("data", [])
        models = [m.get("id", "") for m in data if isinstance(m, dict) and m.get("id")]
        self._available_models = models
        return models

    async def resolve_model(self, force: bool = False) -> str:
        if self._resolved_model and not force:
            return self._resolved_model
        if not self.enabled:
            raise NimNotConfigured("NVIDIA_NIM_API_KEY is not set.")
        models = await self.list_models()
        lowered = [m.lower() for m in models]

        if self.configured_model:
            if self.configured_model.lower() in lowered:
                self._resolved_model = self.configured_model
            else:
                nemotron = [m for m in models if "nemotron" in m.lower()]
                self._last_probe = {
                    "at": time.time(),
                    "configured": self.configured_model,
                    "available_nemotron": nemotron,
                }
                raise NimModelUnavailable(
                    f"Model '{self.configured_model}' is not available on this NIM "
                    f"account. Nemotron models visible to this key: {nemotron or 'none'}. "
                    f"Set NVIDIA_NIM_MODEL to one of them."
                )
        else:
            for pref in MODEL_PREFERENCE:
                hit = next((m for m in lowered if pref in m), None)
                if hit:
                    self._resolved_model = hit
                    break
            if not self._resolved_model:
                raise NimModelUnavailable(
                    f"No Nemotron model visible to this NIM account. Models: {models[:20]}"
                )
            if "nemotron-3-ultra" not in self._resolved_model:
                logger.warning(
                    "[NIM] Nemotron 3 Ultra not available on this account; "
                    "resolved '%s' instead (reported in provider metadata).",
                    self._resolved_model,
                )
        self._last_probe = {
            "at": time.time(),
            "resolved": self._resolved_model,
            "available_count": len(models),
        }
        logger.info("[NIM] resolved model=%s base=%s", self._resolved_model, self.base_url)
        return self._resolved_model

    async def chat_json(
        self,
        system: str,
        user: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """Returns {'result': parsed_json, 'provider': {...meta incl. model+usage}}"""
        model = await self.resolve_model()
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        delay = 1.0
        last_err: Optional[Exception] = None
        
        for attempt in range(1, self.max_retries + 2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=self._headers(),
                        json=payload,
                    )
                
                if resp.status_code == 429 or resp.status_code >= 500:
                    retry_after = resp.headers.get("retry-after")
                    wait = float(retry_after) if retry_after else delay
                    wait = min(wait, 30.0) + random.uniform(0, 0.5)
                    last_err = NimProviderError(f"NIM HTTP {resp.status_code}")
                    logger.warning(
                        "[NIM] HTTP %s (attempt %d/%d) — retry in %.1fs",
                        resp.status_code, attempt, self.max_retries + 1, wait,
                    )
                    await asyncio.sleep(wait)
                    delay *= 2
                    continue
                
                if resp.status_code != 200:
                    raise NimProviderError(
                        f"NIM HTTP {resp.status_code}: {resp.text[:300]}"
                    )
                
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage") or {}
                
                # ✅ FIX: Catch empty content from NIM and retry instead of crashing
                try:
                    parsed = _parse_json(content)
                except ValueError as err:
                    logger.warning(f"[NIM] Parse failed (attempt {attempt}): {err} - Raw: '{str(content)[:50]}'")
                    if attempt <= self.max_retries:
                        await asyncio.sleep(delay)
                        delay *= 2
                        continue
                    raise NimProviderError(f"Failed to parse NIM JSON after retries: {err}")
                
                return {
                    "result": parsed,
                    "provider": {
                        "provider": "nvidia-nim",
                        "model": model,
                        "fallback": False,
                        "request_id": data.get("id"),
                        "usage": {
                            "prompt_tokens": usage.get("prompt_tokens"),
                            "completion_tokens": usage.get("completion_tokens"),
                            "total_tokens": usage.get("total_tokens"),
                        },
                    },
                }
            
            except (httpx.TimeoutException, httpx.TransportError) as err:
                last_err = NimProviderError(f"NIM transport error: {err}")
                logger.warning(
                    "[NIM] transport error (attempt %d/%d): %s — retry in %.1fs",
                    attempt, self.max_retries + 1, err, delay,
                )
                await asyncio.sleep(delay)
                delay *= 2
                
        raise NimProviderError(
            f"NIM inference failed after {self.max_retries + 1} attempts: {last_err}"
        )

    def health(self) -> Dict[str, Any]:
        return {
            "configured": self.enabled,
            "base_url": self.base_url,
            "configured_model": self.configured_model or None,
            "resolved_model": self._resolved_model,
            "available_models": self._available_models,
            "last_probe": self._last_probe,
        }


_PROVIDER: Optional[NimProvider] = None

def get_nim_provider() -> NimProvider:
    global _PROVIDER
    if _PROVIDER is None:
        _PROVIDER = NimProvider()
    return _PROVIDER