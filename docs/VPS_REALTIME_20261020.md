# Live Katarina VPS integration — 20 October 2026

Production website: https://katarina-research.pages.dev, repository Katarina-web.
The website and VPS engine are separate deployments. The home page links to and
embeds the same-origin `/katarina-live` visualization. Its `/api/runtime` Pages
Function reads the existing public, sanitized VPS relay. No credentials are in
the frontend, repository or query strings; no new Cloudflare binding is needed.

The public relay URL is https://katarina-ai-runtime.safetune5.chatgpt.site/public-status.
Cloudflare re-applies the existing public field allowlist. It rejects responses
over 128 KiB, redirects, snapshots older than 20 seconds, mismatched process IDs,
stale activity or execution-enabled data. Requests and responses are not cached.
The browser polls every second while visible; VPS research reports refresh in
three-second batches. This is near-real-time polling, not a direct MT5 stream.

The small, light Katarina core follows actual worker activity gently. Camera
rotation shows a fresh process; colored work pulses and node births remain tied
to real events and persisted results. MT5 data/history phases are named explicitly.
Reports distinguish rejected, insufficient, blocked, pending-cost-review and
historical candidates that still require prospective testing. LIVE remains OFF.

Website-native news, analysis, D1 and AI features remain separate sources; their
existing status does not prove the private VPS engine is connected. The live
runtime panel is the explicit source for VPS activity and experiment reports.
