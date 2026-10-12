# Universal News Intelligence

Every indexed dashboard or pair headline can request an individual full-source analysis via the news-intelligence API. It includes the core event, key facts, actual policy stance (including NO_DECISION), expectations if sourced, who benefits/loses and why, price transmission by relevant instrument, near/medium-term scenarios, verbatim evidence, confirmation triggers and remaining uncertainty.

Only URLs already in the approved news feeds can be analyzed, with an exact expected-URL check to prevent an index refresh from presenting another story. Analyses are shared by article URL in existing Cloudflare KV and edge cache.

The free Worker processes unseen global headlines sequentially (max 48 attempts/day), beyond its existing capped central-bank prewarmer. Clicking any listed headline may trigger full-source AI if no cached result exists. These caps and the shared Workers AI neuron pool mean that not every new article is necessarily already processed.

Missing or paywalled full texts, inaccessible official PDFs, AI errors, or quota exhaustion are clearly reported rather than replaced by generic fabricated implications. No automatic trades, fake performance metrics or upgrade to paid Cloudflare.

Planning reads source-grounded macro evidence for forex and, where available, for metals, crypto and indices. Contradictory independently sourced implications can block a conditional H4 plan.

Production checks cover a headline beyond the former top-three cutoff and classify full-text unavailable separately from a validated analysis.
