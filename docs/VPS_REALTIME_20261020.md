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

## Touch scene revision — 20 October 2026, 05:55 WIB
Remove the node dropdown and button toolbar entirely. Keep tap-to-inspect and
keyboard operation. Replace visible process IDs with a verified connection label;
internal PID checks still prevent mixing runtime snapshots. One finger rotates,
two fingers pinch/translate, double tap resets, and release adds decaying inertia.
Perspective depth and foreground lighting make the existing 3D data clearer.
The old 30 ms frame gate is replaced by a requestAnimationFrame target up to
120 Hz; this is not a measured guarantee of 120 fps on every device. Per-frame
work state is shared across nodes and unchanged text avoids repeated DOM writes.

Process verification is separate from market completeness. The native live dashboard uses all active workers for lane lights; learning is a matched fresh VPS snapshot, not model training. Browser renders at native requestAnimationFrame cadence and displays actual render FPS. Internal Gemini neuron activations are unavailable. Market homepage preserved.

Smooth recovery flow v22: stable incremental 3D layout, eased worker motion, 24 most recent event rows, recovery queue aggregates from the canonical VPS owner. Broker data recovery uses same-source subscription/ticks/candle warmups with bounded retries. No parallel MT5 owners, no fabricated quotes or live execution. Original market homepage unchanged.

Continuous visual bridge v23: local visual motion continues between telemetry packets; updates interpolate into persistent node/edge buffers. Ambient motion is not new work evidence. Telemetry timestamps, actual pulses and expiry checks remain separate. Fixed-height live status, adaptive mobile render scale and deferred detail panels reduce rendering stalls. Phone recording showed 19-30 FPS before this change; new phone performance has not been measured.
