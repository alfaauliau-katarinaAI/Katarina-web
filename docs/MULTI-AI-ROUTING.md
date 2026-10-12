# KATARINA Website: multi-AI routing

Three specialist tasks share the current Cloudflare Workers AI binding without any new API key, new paid provider, or subscription.

- Market outlook: Qwen3 30B A3B FP8 primary; Llama 3.1 8B FP8 and Gemma 3 12B backups.
- Verified full-article news analysis: Gemma 3 12B primary; Llama 3.1 8B FP8 and Qwen3 backups.
- Indonesian title translation: Llama 3.1 8B FP8 primary; Gemma 3 12B and Qwen3 backups.

One model runs at a time. When a model fails or produces output that fails endpoint validation, the router tries the next configured model (up to three total). No concurrent ensemble voting, automatic purchase, external endpoint, or paid fallback.

IMPORTANT: all Cloudflare Workers AI models draw from the SAME account-wide 10,000 free neurons/day pool. A 3036 quota-exhausted response stops retries immediately; switching models cannot reset shared quota. Other temporary model/capacity errors may fall through to a backup.

Caching remains in place: market outlook 6 hours per symbol, news analysis 3 hours per article, translation D1 deduplication plus short edge cache. Data/source checks still happen before inference. Results include the actual model ID and fallbackUsed flag for provenance. No changes to MT5, trading logic, or risk limits.

Automated tests: npm test, with tests/ai-router.test.mjs verifying primary selection, fallback, structured response validation, and shared quota exhaustion.

Cloudflare references: https://developers.cloudflare.com/workers-ai/models/ and https://developers.cloudflare.com/workers-ai/platform/errors/

## Production latency hardening — 12 Oct 2026

Initial production API probes for market outlook timed out at 9 seconds and again at 30 seconds while the other 72 bounded requests all returned HTTP 200. Prioritize the proven low-latency Llama 8B model for structured outlook, cap its generated output at 600 tokens, and use `rejectIfBusy: true` as the Cloudflare binding's third argument. Busy queues yield code 3040 and can trigger a backup without accumulating queue wait. No additional paid models.
