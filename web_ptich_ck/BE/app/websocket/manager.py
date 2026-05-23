"""WebSocket manager stub — will be implemented later for realtime data."""

import structlog

logger = structlog.get_logger()


class WebSocketManager:
    """Placeholder WebSocket manager."""

    async def start(self) -> None:
        logger.info("WebSocket manager started (stub)")

    async def stop(self) -> None:
        logger.info("WebSocket manager stopped (stub)")


ws_manager = WebSocketManager()
