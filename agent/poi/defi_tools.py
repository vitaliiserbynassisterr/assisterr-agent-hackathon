"""
AgentiPy DeFi Tools - Live Solana DeFi capabilities for PoI agents.

Wraps AgentiPy's SolanaAgentKit to provide:
- Real-time balance queries (SOL + SPL tokens)
- Token price fetching via CoinGecko
- Trending token discovery
- Token safety analysis via RugCheck
- Network TPS monitoring
- DEX swap execution via Jupiter

All operations have safe error handling - failures return structured error dicts
rather than raising exceptions, keeping the agent running.
"""
import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import base58
except ImportError:
    base58 = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

# Lazy imports for AgentiPy (may not be installed in all environments)
_agentipy_available = False
try:
    from agentipy.agent import SolanaAgentKit
    from agentipy.tools.get_balance import BalanceFetcher
    from agentipy.tools.get_tps import SolanaTPS
    _agentipy_available = True
except ImportError:
    logger.warning("AgentiPy not installed - DeFi tools will be unavailable")
    SolanaAgentKit = None

# Optional tool imports (some may require extra API keys)
_has_coingecko = False
_has_rugcheck = False
_has_trade = False
_has_price = False

try:
    from agentipy.tools.use_coingecko import CoingeckoManager
    _has_coingecko = True
except ImportError:
    pass

try:
    from agentipy.tools.rugcheck import RugCheckManager
    _has_rugcheck = True
except ImportError:
    pass

try:
    from agentipy.tools.trade import TradeManager
    _has_trade = True
except ImportError:
    pass

try:
    from agentipy.tools.fetch_price import FetchPriceManager
    _has_price = True
except ImportError:
    pass


def _wallet_json_to_base58(wallet_path: str) -> str:
    """Convert Solana CLI wallet JSON (byte array) to base58-encoded keypair."""
    with open(wallet_path) as f:
        keypair_bytes = json.load(f)
    return base58.b58encode(bytes(keypair_bytes)).decode()


@dataclass
class DeFiToolResult:
    """Standardized result from any DeFi tool operation."""
    success: bool
    tool: str
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    elapsed_ms: float = 0.0


class DeFiToolkit:
    """
    AgentiPy-powered DeFi toolkit for a single agent.

    Provides safe, async wrappers around AgentiPy's SolanaAgentKit
    with caching, error handling, and structured results.
    """

    def __init__(
        self,
        wallet_path: str,
        rpc_url: str = "https://api.devnet.solana.com",
        coingecko_api_key: str = "",
    ):
        self.wallet_path = wallet_path
        self.rpc_url = rpc_url
        self.coingecko_api_key = coingecko_api_key
        self.kit: Optional[Any] = None  # SolanaAgentKit instance
        self._initialized = False
        self._init_error: Optional[str] = None

        # Simple cache for expensive operations
        self._cache: Dict[str, tuple] = {}  # key -> (timestamp, data)
        self._cache_ttl = 60  # seconds

        # Track operations for audit trail
        self.operation_count = 0
        self.operation_history: List[Dict] = []

    async def initialize(self) -> bool:
        """Initialize the AgentiPy SolanaAgentKit. Returns True on success."""
        if not _agentipy_available:
            self._init_error = "AgentiPy package not installed"
            logger.warning(f"DeFi toolkit init failed: {self._init_error}")
            return False

        try:
            private_key_b58 = _wallet_json_to_base58(self.wallet_path)
            self.kit = SolanaAgentKit(
                private_key=private_key_b58,
                rpc_url=self.rpc_url,
                coingecko_api_key=self.coingecko_api_key or None,
            )
            self._initialized = True
            logger.info(f"DeFi toolkit initialized (wallet={self.wallet_path}, rpc={self.rpc_url})")
            return True
        except Exception as e:
            self._init_error = str(e)
            logger.error(f"DeFi toolkit init failed: {e}")
            return False

    def _get_cached(self, key: str) -> Optional[Any]:
        """Return cached result if fresh, else None."""
        if key in self._cache:
            ts, data = self._cache[key]
            if time.monotonic() - ts < self._cache_ttl:
                return data
        return None

    def _set_cached(self, key: str, data: Any):
        """Cache a result."""
        self._cache[key] = (time.monotonic(), data)

    def _record_op(self, result: DeFiToolResult):
        """Record operation in history."""
        self.operation_count += 1
        record = {
            "tool": result.tool,
            "success": result.success,
            "elapsed_ms": result.elapsed_ms,
            "timestamp": time.time(),
        }
        if result.error:
            record["error"] = result.error[:100]
        self.operation_history.append(record)
        if len(self.operation_history) > 100:
            self.operation_history.pop(0)

    @property
    def available(self) -> bool:
        return self._initialized and self.kit is not None

    def get_capabilities(self) -> Dict[str, Any]:
        """Return available DeFi capabilities."""
        return {
            "initialized": self._initialized,
            "init_error": self._init_error,
            "agentipy_available": _agentipy_available,
            "tools": {
                "balance": _agentipy_available,
                "tps": _agentipy_available,
                "coingecko": _has_coingecko,
                "rugcheck": _has_rugcheck,
                "trade": _has_trade,
                "price": _has_price,
            },
            "operation_count": self.operation_count,
            "rpc_url": self.rpc_url,
        }

    async def get_balance(self, token_address: Optional[str] = None) -> DeFiToolResult:
        """Get SOL or SPL token balance."""
        if not self.available:
            return DeFiToolResult(success=False, tool="balance", error=self._init_error or "Not initialized")

        cache_key = f"balance:{token_address or 'sol'}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        t0 = time.monotonic()
        try:
            if token_address:
                balance = await asyncio.to_thread(
                    lambda: asyncio.get_event_loop().run_until_complete(
                        BalanceFetcher.get_balance(self.kit, token_address)
                    )
                )
            else:
                # Run async AgentiPy call
                balance = await BalanceFetcher.get_balance(self.kit)

            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(
                success=True, tool="balance",
                data={"balance": balance, "token": token_address or "SOL", "unit": "lamports" if not token_address else "tokens"},
                elapsed_ms=elapsed,
            )
            self._set_cached(cache_key, result)
            self._record_op(result)
            return result
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(success=False, tool="balance", error=str(e)[:200], elapsed_ms=elapsed)
            self._record_op(result)
            return result

    async def get_tps(self) -> DeFiToolResult:
        """Get current Solana network TPS."""
        if not self.available:
            return DeFiToolResult(success=False, tool="tps", error=self._init_error or "Not initialized")

        cached = self._get_cached("tps")
        if cached:
            return cached

        t0 = time.monotonic()
        try:
            tps = await SolanaTPS.get_tps(self.kit)
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(
                success=True, tool="tps",
                data={"tps": tps, "network": "devnet" if "devnet" in self.rpc_url else "mainnet"},
                elapsed_ms=elapsed,
            )
            self._set_cached("tps", result)
            self._record_op(result)
            return result
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(success=False, tool="tps", error=str(e)[:200], elapsed_ms=elapsed)
            self._record_op(result)
            return result

    async def get_trending_tokens(self) -> DeFiToolResult:
        """Get trending tokens from CoinGecko."""
        if not self.available or not _has_coingecko:
            return DeFiToolResult(success=False, tool="trending", error="CoinGecko not available")

        cached = self._get_cached("trending")
        if cached:
            return cached

        t0 = time.monotonic()
        try:
            trending = await CoingeckoManager.get_trending_tokens(self.kit)
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(
                success=True, tool="trending",
                data={"trending": trending},
                elapsed_ms=elapsed,
            )
            self._set_cached("trending", result)
            self._record_op(result)
            return result
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(success=False, tool="trending", error=str(e)[:200], elapsed_ms=elapsed)
            self._record_op(result)
            return result

    async def get_token_price(self, token_id: str) -> DeFiToolResult:
        """Get token price via CoinGecko."""
        if not self.available or not _has_coingecko:
            return DeFiToolResult(success=False, tool="price", error="CoinGecko not available")

        cache_key = f"price:{token_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        t0 = time.monotonic()
        try:
            price_data = await CoingeckoManager.get_token_price_data(self.kit, [token_id])
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(
                success=True, tool="price",
                data={"token_id": token_id, "price_data": price_data},
                elapsed_ms=elapsed,
            )
            self._set_cached(cache_key, result)
            self._record_op(result)
            return result
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(success=False, tool="price", error=str(e)[:200], elapsed_ms=elapsed)
            self._record_op(result)
            return result

    async def rugcheck(self, token_mint: str) -> DeFiToolResult:
        """Run RugCheck safety analysis on a token."""
        if not self.available or not _has_rugcheck:
            return DeFiToolResult(success=False, tool="rugcheck", error="RugCheck not available")

        cache_key = f"rugcheck:{token_mint}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        t0 = time.monotonic()
        try:
            report = await RugCheckManager.get_token_report(self.kit, token_mint)
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(
                success=True, tool="rugcheck",
                data={"token_mint": token_mint, "report": report},
                elapsed_ms=elapsed,
            )
            self._set_cached(cache_key, result)
            self._record_op(result)
            return result
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(success=False, tool="rugcheck", error=str(e)[:200], elapsed_ms=elapsed)
            self._record_op(result)
            return result

    async def get_token_data(self, token_mint: str) -> DeFiToolResult:
        """Get token metadata and information."""
        if not self.available:
            return DeFiToolResult(success=False, tool="token_data", error=self._init_error or "Not initialized")

        cache_key = f"token_data:{token_mint}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        t0 = time.monotonic()
        try:
            from agentipy.tools.get_token_data import TokenDataManager
            data = await TokenDataManager.get_token_data(self.kit, token_mint)
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(
                success=True, tool="token_data",
                data={"token_mint": token_mint, "token_data": data},
                elapsed_ms=elapsed,
            )
            self._set_cached(cache_key, result)
            self._record_op(result)
            return result
        except Exception as e:
            elapsed = (time.monotonic() - t0) * 1000
            result = DeFiToolResult(success=False, tool="token_data", error=str(e)[:200], elapsed_ms=elapsed)
            self._record_op(result)
            return result

    def get_stats(self) -> Dict[str, Any]:
        """Get toolkit usage statistics."""
        successful = sum(1 for op in self.operation_history if op["success"])
        failed = sum(1 for op in self.operation_history if not op["success"])
        avg_latency = 0
        if self.operation_history:
            avg_latency = sum(op["elapsed_ms"] for op in self.operation_history) / len(self.operation_history)
        return {
            "total_operations": self.operation_count,
            "successful": successful,
            "failed": failed,
            "avg_latency_ms": round(avg_latency, 1),
            "cache_size": len(self._cache),
            "tools_available": sum(1 for v in self.get_capabilities()["tools"].values() if v),
        }
