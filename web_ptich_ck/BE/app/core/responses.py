import math
import typing
import json
from fastapi.responses import JSONResponse

def sanitize_floats(obj: typing.Any) -> typing.Any:
    """Recursively replaces NaN and Infinity with 0.0 to prevent JSON serialization errors."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_floats(v) for v in obj]
    return obj

class SafeJSONResponse(JSONResponse):
    def render(self, content: typing.Any) -> bytes:
        safe_content = sanitize_floats(content)
        return json.dumps(
            safe_content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")
