"""
LLM client:
- chat_completion        → OpenAI (non-streaming)
- chat_completion_stream → OpenAI Responses API (streaming)
- embed_text             → OpenAI text-embedding-3-small
"""

import httpx
import logging
import asyncio
from typing import AsyncGenerator, Type, TypeVar
from pydantic import BaseModel
from openai import AsyncOpenAI
from app.core.config import get_settings
from contextvars import ContextVar
import os
from dotenv import dotenv_values

settings = get_settings()

model_choice_ctx: ContextVar[str] = ContextVar("model_choice", default="1")

def get_dynamic_model_config(choice: str):
    """Lấy cấu hình model từ .env dựa trên lựa chọn (1, 2, 3...)"""
    if not choice or choice == "primary" or choice == "1":
        choice = "1"
    elif choice == "secondary":
        choice = "2"
        
    suffix = f"_{choice}" if choice != "1" else ""
    
    env_vars = dotenv_values(".env")
    
    api_key = env_vars.get(f"OPENAI_API_KEY{suffix}")
    if api_key is None:
        api_key = os.getenv(f"OPENAI_API_KEY{suffix}")
        
    base_url = env_vars.get(f"OPENAI_BASE_URL{suffix}")
    if base_url is None:
        base_url = os.getenv(f"OPENAI_BASE_URL{suffix}")
        
    model = env_vars.get(f"OPENAI_MODEL{suffix}")
    if model is None:
        model = os.getenv(f"OPENAI_MODEL{suffix}")
    
    if choice == "1":
        finetuned = env_vars.get("OPENAI_FINETUNED_MODEL") or os.getenv("OPENAI_FINETUNED_MODEL")
        if finetuned:
            model = finetuned
            
    # OpenAI client requires a non-empty API key. Local servers accept dummy keys.
    if not api_key and base_url:
        api_key = "dummy-key"
            
    if not api_key and not base_url:
        api_key = settings.OPENAI_API_KEY
        base_url = None
        model = getattr(settings, "OPENAI_FINETUNED_MODEL") or getattr(settings, "OPENAI_MODEL", "gpt-4o")
        
    return api_key, base_url, model or "gpt-4o"

async def chat_completion(
    user_prompt: str,
    system_prompt: str = "",
    temperature: float = 0.0,
    max_tokens: int = 2000,
    retries: int = 3,
) -> str:
    logger = logging.getLogger(__name__)
    
    choice = model_choice_ctx.get()
    
    # Default to OpenAI execution path
    api_key, base_url, model = get_dynamic_model_config(choice)
    
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url
    )

    for attempt in range(max(1, retries)):
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_prompt})

            try:
                # Try the new OpenAI Responses API first with stream=True
                stream = await client.responses.create(
                    model=model,
                    input=messages,
                    stream=True,
                )
                accumulated = []
                async for event in stream:
                    if event.type == "response.output_text.delta":
                        accumulated.append(event.delta)
                content = "".join(accumulated)
            except Exception as responses_exc:
                logger.warning(
                    f"client.responses.create failed: {responses_exc}. "
                    f"Falling back to client.chat.completions.create..."
                )
                res = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_completion_tokens=max_tokens,
                )
                content = res.choices[0].message.content
            
            if content is None:
                raise ValueError("LLM returned None content")
            return content
        except Exception as exc:
            if attempt < retries - 1:
                logger.warning(f"LLM request error: {exc}. Retry {attempt+1}/{retries}")
                await asyncio.sleep(5)
                continue
            raise
                
    raise RuntimeError("LLM chat completion failed after retries")


async def chat_completion_stream(
    user_prompt: str,
    system_prompt: str = "",
    temperature: float = 0.0,
    max_tokens: int = 2000,
) -> AsyncGenerator[str, None]:
    """
    Streaming variant of chat_completion.
    Yields text tokens/chunks as they arrive from the LLM.
    - OpenAI: uses responses.create(stream=True)
    """
    logger = logging.getLogger(__name__)
    
    choice = model_choice_ctx.get()
    
    # ── OpenAI streaming (Responses API) ──────────────────────────────
    api_key, base_url, model = get_dynamic_model_config(choice)
    
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url
    )

    try:
        # Build input messages for Responses API
        input_messages = []
        if system_prompt:
            input_messages.append({"role": "system", "content": system_prompt})
        input_messages.append({"role": "user", "content": user_prompt})

        stream = await client.responses.create(
            model=model,
            input=input_messages,
            stream=True,
        )
        
        async for event in stream:
            if event.type == "response.output_text.delta":
                yield event.delta
                
    except Exception as exc:
        logger.warning(
            f"OpenAI Responses API streaming failed: {exc}. "
            f"Falling back to chat.completions.create streaming..."
        )
        # Fallback: use chat.completions.create with stream=True
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_prompt})
            
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content is not None:
                    yield content
        except Exception as fallback_exc:
            logger.error(f"All streaming attempts failed: {fallback_exc}")
            # Last resort: non-streaming fallback
            result = await chat_completion(
                user_prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            yield result


T = TypeVar("T", bound=BaseModel)

async def chat_completion_structured(
    user_prompt: str,
    response_format: Type[T],
    system_prompt: str = "",
    temperature: float = 0.0,
    max_tokens: int = 2000,
    retries: int = 3,
) -> T:
    """
    Standard structured output utilizing OpenAI parsing.
    """
    logger = logging.getLogger(__name__)
    
    choice = model_choice_ctx.get()
    
    # Default to OpenAI execution path
    api_key, base_url, model = get_dynamic_model_config(choice)
    
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url
    )

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})

    for attempt in range(max(1, retries)):
        try:
            res = await client.beta.chat.completions.parse(
                model=model,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_tokens,
                response_format=response_format,
            )
            parsed = res.choices[0].message.parsed
            if parsed is None:
                raise ValueError("Parsed result is None")
            return parsed
        except Exception as exc:
            if attempt < retries - 1:
                logger.warning(f"LLM structured request error: {exc}. Retry {attempt+1}/{retries}")
                await asyncio.sleep(5)
                continue
            raise
                
    raise RuntimeError("LLM structured chat completion failed after retries")


async def embed_text(text: str) -> list[float]:
    """Embedding sử dụng OpenAI text-embedding-3-small."""
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=[text],
        dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding