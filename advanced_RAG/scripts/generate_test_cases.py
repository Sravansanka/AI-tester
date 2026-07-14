"""Generate exactly 5,000 unique VWO test cases as a Jira/Zephyr-importable CSV.

Combinatorial, not random-text: the corpus is the cartesian product of
(component, sub_feature, scenario_type, priority), which is deterministically
shuffled (fixed seed) and truncated to 5,000 rows. Content for each row is
rendered through a scenario-type-specific template, so wording varies because
the structural inputs vary, not because text is randomly scrambled.

Usage:
    uv run scripts/generate_test_cases.py
"""

import csv
import itertools
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from vwo_taxonomy import (
    BROWSERS,
    COMPONENT_CODES,
    COMPONENTS,
    DEVICES,
    PRIORITIES,
    SCENARIO_CODES,
    SCENARIO_LABELS,
    SCENARIO_TYPES,
)

SEED = 42
TARGET_ROWS = 5000
OUTPUT_PATH = Path(__file__).parent.parent / "testcase" / "vwo_test_cases.csv"

CSV_COLUMNS = [
    "Issue Type",
    "Test Case Key",
    "Summary",
    "Priority",
    "Component/s",
    "Labels",
    "Test Type",
    "Automation Status",
    "Preconditions",
    "Test Steps",
    "Test Data",
    "Expected Result",
    "Status",
]

TEMPLATES = {
    "positive": {
        "summary": "Verify {sub} works correctly under {component}",
        "preconditions": "User is logged into VWO account; a live {component} campaign exists with {sub} configured.",
        "steps": (
            "1. Navigate to the {component} module in the VWO dashboard.\n"
            "2. Configure {sub} with valid, expected settings.\n"
            "3. Save the configuration and publish the campaign.\n"
            "4. Trigger the flow that exercises {sub} as an end visitor would."
        ),
        "test_data": "Valid campaign config; standard visitor session (no special flags).",
        "expected": "{sub} behaves exactly as configured with no errors, and the result is reflected correctly in VWO reporting.",
    },
    "negative": {
        "summary": "Verify {sub} rejects invalid input under {component}",
        "preconditions": "User is logged into VWO account; a {component} campaign exists in draft state.",
        "steps": (
            "1. Navigate to the {component} module.\n"
            "2. Attempt to configure {sub} using invalid or malformed input (e.g. empty required field, wrong type).\n"
            "3. Attempt to save the configuration.\n"
            "4. Observe system response."
        ),
        "test_data": "Invalid/malformed input for {sub} (empty, wrong format, out-of-range).",
        "expected": "VWO blocks the save with a clear, actionable validation error and does not persist the invalid {sub} configuration.",
    },
    "edge": {
        "summary": "Verify {sub} behaves correctly at an edge condition under {component}",
        "preconditions": "A {component} campaign exists with {sub} active and receiving live traffic.",
        "steps": (
            "1. Put the system into an edge condition relevant to {sub} "
            "(e.g. zero traffic, single-variation test, campaign expiring mid-session).\n"
            "2. Exercise {sub} under this condition.\n"
            "3. Observe behavior and any reporting produced."
        ),
        "test_data": "Edge-condition dataset for {sub} (e.g. 0 visitors, 1 variation, concurrent campaign edit).",
        "expected": "{sub} degrades gracefully with no crash, no data corruption, and an accurate (or clearly empty) report.",
    },
    "boundary": {
        "summary": "Verify {sub} boundary limits under {component}",
        "preconditions": "A {component} campaign exists with {sub} configurable within documented limits.",
        "steps": (
            "1. Set {sub} to its documented minimum allowed value/size and save.\n"
            "2. Set {sub} to its documented maximum allowed value/size and save.\n"
            "3. Attempt to set {sub} one unit beyond the maximum and save."
        ),
        "test_data": "Min, max, and max+1 values for the {sub} configurable field.",
        "expected": "Min and max values are accepted and function correctly; max+1 is rejected with a clear limit-exceeded message.",
    },
    "ui": {
        "summary": "Verify {sub} UI renders and responds correctly under {component}",
        "preconditions": "User is logged into the VWO dashboard on a supported screen resolution.",
        "steps": (
            "1. Open the {component} module and locate the {sub} control.\n"
            "2. Verify layout, labels, tooltips, and iconography render correctly.\n"
            "3. Interact with the {sub} control (click, drag, type) and verify immediate visual feedback.\n"
            "4. Resize the browser window and re-verify layout responsiveness."
        ),
        "test_data": "N/A — visual/interaction verification only.",
        "expected": "{sub} UI renders per design spec at all supported resolutions with no layout breaks or unresponsive controls.",
    },
    "api": {
        "summary": "Verify {sub} REST/SDK API contract under {component}",
        "preconditions": "A valid API key/SDK token is provisioned for a {component} campaign using {sub}.",
        "steps": (
            "1. Call the API/SDK endpoint associated with {sub} with a valid, well-formed request.\n"
            "2. Inspect the response status code, payload schema, and latency.\n"
            "3. Repeat with a missing/invalid auth token.\n"
            "4. Repeat with a malformed request body."
        ),
        "test_data": "Valid request payload; missing-auth request; malformed JSON payload for {sub}.",
        "expected": "Valid requests return 200 with the documented schema; invalid auth returns 401; malformed payloads return 400 with a descriptive error.",
    },
    "performance": {
        "summary": "Verify {sub} performance under load for {component}",
        "preconditions": "A {component} campaign using {sub} is configured on a staging environment with load-testing tooling available.",
        "steps": (
            "1. Baseline single-user latency for {sub}.\n"
            "2. Ramp concurrent simulated visitors to a representative peak load.\n"
            "3. Measure p50/p95/p99 latency and error rate for {sub} throughout the ramp.\n"
            "4. Verify SmartCode/API related to {sub} does not measurably degrade host page load time."
        ),
        "test_data": "Load profile: baseline 1 user, peak concurrent visitor count per capacity plan.",
        "expected": "p95 latency stays within agreed SLA, error rate stays below threshold, and host page load impact stays under the documented budget.",
    },
    "security": {
        "summary": "Verify {sub} enforces access control and input sanitization under {component}",
        "preconditions": "Two accounts exist with different permission levels; a {component} campaign uses {sub}.",
        "steps": (
            "1. As a lower-privilege user, attempt to view/edit {sub} configuration directly via API or deep link.\n"
            "2. Attempt to inject a script/HTML payload into any free-text field related to {sub}.\n"
            "3. Attempt to replay or tamper with a request related to {sub}."
        ),
        "test_data": "Low-privilege session token; XSS payload string; tampered/replayed request.",
        "expected": "Unauthorized access is denied (403), injected payloads are sanitized/escaped and never executed, and tampered requests are rejected.",
    },
    "cross-browser": {
        "summary": "Verify {sub} renders and functions consistently across browsers for {component}",
        "preconditions": "A published {component} campaign with {sub} active is accessible from a cross-browser test grid.",
        "steps": (
            "1. Load the page with the active {sub} on {browser} ({device}).\n"
            "2. Verify variation/feature rendering matches the design across the target combination.\n"
            "3. Verify functional interactions tied to {sub} work identically to the baseline browser."
        ),
        "test_data": "Target combination: {browser} on {device}.",
        "expected": "{sub} renders and functions identically to the baseline browser on {browser}/{device}, with no visual or functional regressions.",
    },
}

AUTOMATION_STATUSES = ["Automated", "Manual", "To Be Automated"]
STATUSES = ["Approved", "Draft", "Needs Review"]


def build_combinations():
    combos = list(
        itertools.product(
            COMPONENTS.items(),
            SCENARIO_TYPES,
            PRIORITIES,
        )
    )
    expanded = []
    for (component, sub_features), scenario, priority in combos:
        for sub in sub_features:
            expanded.append((component, sub, scenario, priority))
    return expanded


def render_row(component, sub, scenario, priority, seq, rng):
    tpl = TEMPLATES[scenario]
    browser = rng.choice(BROWSERS)
    device = rng.choice(DEVICES)
    ctx = {"component": component, "sub": sub, "browser": browser, "device": device}

    comp_code = COMPONENT_CODES[component]
    scen_code = SCENARIO_CODES[scenario]
    key = f"VWO-{comp_code}-{scen_code}-{seq:04d}"

    summary = tpl["summary"].format(**ctx)
    preconditions = tpl["preconditions"].format(**ctx)
    steps = tpl["steps"].format(**ctx)
    test_data = tpl["test_data"].format(**ctx)
    expected = tpl["expected"].format(**ctx)

    labels = f"vwo;{component.lower().replace(' ', '-').replace('/', '-')};{scenario}"
    test_type = SCENARIO_LABELS[scenario]

    return {
        "Issue Type": "Test",
        "Test Case Key": key,
        "Summary": summary,
        "Priority": priority,
        "Component/s": component,
        "Labels": labels,
        "Test Type": test_type,
        "Automation Status": rng.choice(AUTOMATION_STATUSES),
        "Preconditions": preconditions,
        "Test Steps": steps,
        "Test Data": test_data,
        "Expected Result": expected,
        "Status": rng.choice(STATUSES),
    }


def main():
    rng = random.Random(SEED)
    combos = build_combinations()

    if len(combos) < TARGET_ROWS:
        raise SystemExit(
            f"Combination space ({len(combos)}) is smaller than target ({TARGET_ROWS}); "
            "widen the taxonomy in vwo_taxonomy.py."
        )

    rng.shuffle(combos)
    selected = combos[:TARGET_ROWS]

    rows = []
    seen_keys = set()
    seen_summaries = set()
    seq_by_prefix = {}

    for component, sub, scenario, priority in selected:
        comp_code = COMPONENT_CODES[component]
        scen_code = SCENARIO_CODES[scenario]
        prefix = f"{comp_code}-{scen_code}"
        seq_by_prefix[prefix] = seq_by_prefix.get(prefix, 0) + 1
        seq = seq_by_prefix[prefix]

        row = render_row(component, sub, scenario, priority, seq, rng)

        if row["Test Case Key"] in seen_keys:
            raise SystemExit(f"Duplicate key generated: {row['Test Case Key']}")
        if row["Summary"] in seen_summaries:
            # Structurally identical (same component/sub/scenario) row differing only
            # by priority — disambiguate the summary rather than drop it.
            row["Summary"] = f"{row['Summary']} [{priority} priority]"
        seen_keys.add(row["Test Case Key"])
        seen_summaries.add(row["Summary"])
        rows.append(row)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")
    assert len(rows) == TARGET_ROWS
    assert len(seen_keys) == TARGET_ROWS


if __name__ == "__main__":
    main()
