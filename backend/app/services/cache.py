"""Caching service for AWS pricing data."""

import time
from typing import Optional, Any, Dict
from functools import wraps
from cachetools import TTLCache
import hashlib
import json

from app.config import get_settings

settings = get_settings()


class PricingCache:
    """Thread-safe cache for AWS pricing data."""
    
    def __init__(self, maxsize: int = None, ttl: int = None):
        self.maxsize = maxsize or settings.cache_max_size
        self.ttl = ttl or settings.cache_ttl
        self._cache: TTLCache = TTLCache(maxsize=self.maxsize, ttl=self.ttl)
        self._stats = {"hits": 0, "misses": 0}
    
    def _generate_key(self, *args, **kwargs) -> str:
        """Generate a unique cache key from arguments."""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        value = self._cache.get(key)
        if value is not None:
            self._stats["hits"] += 1
        else:
            self._stats["misses"] += 1
        return value
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache."""
        self._cache[key] = value
    
    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            del self._cache[key]
            return True
        except KeyError:
            return False
    
    def clear(self) -> None:
        """Clear all cached values."""
        self._cache.clear()
        self._stats = {"hits": 0, "misses": 0}
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self._stats["hits"] + self._stats["misses"]
        hit_rate = (self._stats["hits"] / total * 100) if total > 0 else 0
        return {
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "hit_rate_percent": round(hit_rate, 2),
            "size": len(self._cache),
            "max_size": self.maxsize,
            "ttl_seconds": self.ttl
        }


# Global cache instances
pricing_cache = PricingCache()
instance_types_cache = PricingCache(maxsize=100, ttl=86400)  # 24 hours for instance types


def cached(cache_instance: PricingCache = pricing_cache):
    """Decorator for caching function results."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Skip 'self' for methods
            cache_args = args[1:] if args and hasattr(args[0], '__class__') else args
            key = cache_instance._generate_key(func.__name__, *cache_args, **kwargs)
            
            cached_value = cache_instance.get(key)
            if cached_value is not None:
                return cached_value
            
            result = await func(*args, **kwargs)
            cache_instance.set(key, result)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            cache_args = args[1:] if args and hasattr(args[0], '__class__') else args
            key = cache_instance._generate_key(func.__name__, *cache_args, **kwargs)
            
            cached_value = cache_instance.get(key)
            if cached_value is not None:
                return cached_value
            
            result = func(*args, **kwargs)
            cache_instance.set(key, result)
            return result
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator