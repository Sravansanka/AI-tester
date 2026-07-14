"""Taxonomy data driving the combinatorial VWO test-case generator.

Each component maps to a list of sub-features. The generator takes the
cartesian product of (component, sub_feature, scenario_type, priority)
which comfortably exceeds 5,000 combinations, then deterministically
samples exactly 5,000 of them.
"""

COMPONENTS = {
    "A/B Testing": [
        "variation traffic split", "goal conversion tracking", "test scheduling",
        "winner declaration", "statistical significance calculation",
        "traffic allocation change mid-test", "multi-page test", "test pause/resume",
        "revenue goal tracking", "custom JS variation editor",
    ],
    "Split URL Testing": [
        "URL redirect mapping", "query parameter preservation", "cross-domain redirect",
        "redirect loop prevention", "SEO canonical tag handling", "campaign source tracking",
        "redirect latency", "fallback URL on failure", "device-specific URL targeting",
        "test URL exclusion rules",
    ],
    "Multivariate Testing": [
        "section combination matrix", "full factorial design", "partial factorial design",
        "interaction effect reporting", "section enable/disable", "combination winner report",
        "traffic distribution across combinations", "MVT + audience targeting overlap",
        "minimum sample size warning", "combination preview mode",
    ],
    "Server-Side Testing": [
        "SDK variation assignment", "server-side goal tracking API", "bucketing consistency",
        "feature flag override", "SDK initialization timeout", "server-side audience targeting",
        "SDK retry/backoff behavior", "cross-platform bucketing parity", "SDK offline caching",
        "server-side event batching",
    ],
    "Web Personalization": [
        "audience segment targeting", "personalized content block", "geo-based personalization",
        "behavioral trigger personalization", "returning visitor personalization",
        "personalization priority/conflict rules", "dynamic text replacement",
        "personalization preview by segment", "campaign frequency capping",
        "personalization fallback content",
    ],
    "SmartCode": [
        "async snippet load performance", "flicker prevention (anti-FOUC)",
        "snippet installation validation", "snippet version mismatch handling",
        "custom domain snippet loading", "snippet load failure fallback",
        "single-page-app snippet re-init", "snippet content security policy compatibility",
        "snippet caching behavior", "snippet debug mode logging",
    ],
    "Visual Editor": [
        "drag-and-drop element edit", "CSS style change persistence", "element hide/show toggle",
        "text/image replacement", "responsive breakpoint editing", "undo/redo history",
        "cross-browser rendering preview", "custom CSS/JS injection", "element selector stability",
        "editor autosave",
    ],
    "Goals & Reporting": [
        "pageview goal", "click goal", "custom event goal", "revenue goal aggregation",
        "funnel step drop-off report", "report date range filter", "report export (CSV/PDF)",
        "real-time report refresh", "segment-wise report breakdown", "goal attribution window",
    ],
    "Segmentation": [
        "device-type segment", "geo-location segment", "traffic-source segment",
        "custom JS segment condition", "first-time vs returning visitor segment",
        "cookie-based segment persistence", "segment combination (AND/OR) logic",
        "segment size estimation", "segment exclusion rule", "UTM parameter segment",
    ],
    "Heatmaps & Recordings": [
        "click heatmap accuracy", "scroll depth heatmap", "session recording playback",
        "recording privacy masking", "heatmap device/browser filter", "recording tagging",
        "heatmap sample size threshold", "recording storage retention", "heatmap export",
        "recording search/filter",
    ],
    "Funnel Analysis": [
        "funnel step definition", "funnel drop-off visualization", "funnel segment comparison",
        "funnel goal linkage", "funnel time-to-convert metric", "funnel step reordering",
        "funnel conversion rate accuracy", "multi-path funnel handling",
        "funnel report date comparison", "funnel export",
    ],
    "Integrations": [
        "Google Analytics data sync", "Shopify event sync", "Segment.io integration",
        "Slack notification integration", "webhook delivery on goal completion",
        "CRM contact sync", "integration auth token refresh", "integration rate-limit handling",
        "integration data mapping config", "integration disconnect/cleanup",
    ],
    "Mobile App Testing": [
        "iOS SDK variation rendering", "Android SDK variation rendering",
        "mobile push notification test", "app version targeting", "offline mode variation caching",
        "mobile crash handling during test", "deep link variation targeting",
        "mobile goal tracking", "app store rollout percentage", "mobile SDK update compatibility",
    ],
    "Feature Flags & Rollouts": [
        "flag toggle propagation latency", "percentage rollout targeting", "flag dependency rules",
        "kill-switch immediate rollback", "flag environment scoping (dev/stage/prod)",
        "flag audit log", "gradual rollout ramp-up", "flag default value fallback",
        "flag stale-flag detection", "flag access permission control",
    ],
}

SCENARIO_TYPES = [
    "positive", "negative", "edge", "boundary", "ui",
    "api", "performance", "security", "cross-browser",
]

PRIORITIES = ["Highest", "High", "Medium", "Low"]

SCENARIO_LABELS = {
    "positive": "Positive",
    "negative": "Negative",
    "edge": "Edge Case",
    "boundary": "Boundary",
    "ui": "UI",
    "api": "API",
    "performance": "Performance",
    "security": "Security",
    "cross-browser": "Cross-Browser",
}

COMPONENT_CODES = {
    "A/B Testing": "AB",
    "Split URL Testing": "SURL",
    "Multivariate Testing": "MVT",
    "Server-Side Testing": "SST",
    "Web Personalization": "WP",
    "SmartCode": "SC",
    "Visual Editor": "VE",
    "Goals & Reporting": "GR",
    "Segmentation": "SEG",
    "Heatmaps & Recordings": "HR",
    "Funnel Analysis": "FA",
    "Integrations": "INT",
    "Mobile App Testing": "MAT",
    "Feature Flags & Rollouts": "FF",
}

SCENARIO_CODES = {
    "positive": "POS",
    "negative": "NEG",
    "edge": "EDG",
    "boundary": "BND",
    "ui": "UI",
    "api": "API",
    "performance": "PRF",
    "security": "SEC",
    "cross-browser": "XBR",
}

BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"]
DEVICES = ["Desktop", "Mobile (iOS)", "Mobile (Android)", "Tablet"]
