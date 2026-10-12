# Production performance check — 12 October 2026

Validation runs **after successful Pages deployment**, on free GitHub Actions runner.

- Unit tests cover Cloudflare AI model role assignment, sequential fallback, free-quota stop and public KV cache.
- Script `scripts/cloudflare-capacity-check.mjs` attempts read-only Cloudflare GraphQL analytics for workers and AI inference using **existing** secrets, never exposing tokens or account IDs. If the API token lacks Analytics Read permission, it reports unavailable; does not invent usage counts.
- Script `scripts/production-probe.mjs` sends a deliberately **small** test of at most 78 GET requests, concurrency 2 → 4 → 8, against public API endpoints plus one Workers AI query. This is a canary/smoke test, **not** a claim the free tier can handle high visitor counts.
- Stop the burst stage early if the failure rate rises above 30% after at least 10 samples. A 429/503 does not trigger automatic retries. No added paid Cloudflare plan or external service.
- GitHub Actions job summary and the sanitized 7-day artifact provide p50/p95, HTTP status distribution, and observed AI model/fallback flag.

The use of multiple AI models does not create additional free Workers AI neurons: they share the same daily account quota. `@cf/google/gemma-3-12b-it` was retired May 30, 2026; this update replaces it with active Cloudflare-hosted models.
