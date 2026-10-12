# KATARINA Web: Policy & News Intelligence

## Changes (12 Oct 2026)

- No more repeated generic regional commentary: news dialogs try to read the actual publisher article and present summary, monetary policy stance, beneficiaries, losers, currency/pair implication, exact evidence excerpt and what would invalidate the interpretation.
- BoJ output gap / government bond holdings are reports, not interest-rate decisions. Without an actual decision and evidence no direction or trading instruction is inferred.
- The selected URL MUST come from existing validated feeds; arbitrary user-supplied URLs are not accepted. Source text must be sufficiently long, reputable and accessible; PDF-only, inaccessible or paywalled content is explicitly labeled insufficient.
- Relative pair sign is deterministic; e.g. strong JPY suggests downward AUDJPY pressure, not a guaranteed future move.
- Completed full-source AI briefs are stored in existing KV plus edge cache. Historical source releases can be explained but only policy evidence less than 72 hours old can affect a live H4 trade plan.
- Weekly plan uses up to six already verified relevant policy briefings, current H4 and COT. Contradictions suspend the plan instead of pretending H4 always dominates; if there is no verified macro briefing, H4 alone is a technical scenario, NOT proven fundamental alignment.
- Existing scheduled Worker can prewarm no more than 8 high-priority briefings each day; same Cloudflare free quota, without extra service, cron or paid plan. Clicking a news item can trigger a briefing separately.
- Mobile browser JS and storage cache versions incremented to surface the new dialog text.

## Limitations

No PDF reader is included. Headlines alone do not establish facts or policy direction. Old releases do not produce current trading bias. Free AI neurons are pooled across all Workers AI models. The scheduled prewarmer is capped, not an exhaustive instant monitor of all publications, and real money trading is never triggered here.
