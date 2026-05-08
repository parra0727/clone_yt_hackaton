import json
import functools
from typing import Any, Callable
from app.core.redis_client import redis_client

def cache_response(key: str, ttl: int = 30):
    """
    Decorator para cachear respuestas JSON en Redis.
    ttl: segundos que dura el caché
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = key
            for k, v in kwargs.items():
                if k not in ('video_service', 'comment_service', 'user_service', 'subscription_service'):
                    cache_key += f":{k}={v}"

            try:
                cached = redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass

            result = func(*args, **kwargs)

            try:
                redis_client.setex(cache_key, ttl, json.dumps(result, default=str))
            except Exception:
                pass

            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """Invalida todas las keys que matcheen el patrón."""
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except Exception:
        pass
