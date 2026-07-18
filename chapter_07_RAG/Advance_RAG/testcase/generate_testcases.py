#!/usr/bin/env python3
"""Generate 5,000 realistic VWO test cases as a Jira-import CSV.

Deterministic (seeded) so the corpus is reproducible. Output columns are
Jira-friendly AND RAG-friendly: the text columns (Summary/Description/
Preconditions/Steps/Expected Result) get embedded; the rest become metadata.
"""
import csv
import os
import random

SEED = 20260705
random.seed(SEED)

OUT = os.path.join(os.path.dirname(__file__), "vwo_5000_test_cases.csv")
N = 5000

# VWO product surface — module -> representative features
MODULES = {
    "A/B Testing": ["campaign creation", "variation editor", "traffic allocation", "goal setup", "results dashboard", "statistical significance"],
    "Split URL Testing": ["URL variation", "redirect rules", "traffic split", "goal tracking"],
    "Multivariate Testing": ["section definition", "combination generator", "traffic distribution", "winner analysis"],
    "Heatmaps": ["click map", "scroll map", "attention map", "segment filter", "device breakdown"],
    "Session Recordings": ["recording capture", "playback controls", "rage-click detection", "filters", "privacy masking"],
    "Funnels": ["funnel builder", "step drop-off", "segment comparison", "conversion rate"],
    "Form Analytics": ["field drop-off", "time per field", "error tracking", "submission rate"],
    "Surveys": ["survey builder", "trigger rules", "response export", "NPS scoring"],
    "Personalization": ["audience builder", "campaign targeting", "dynamic content", "schedule"],
    "Feature Rollout": ["flag creation", "percentage rollout", "kill switch", "audience gating"],
    "SmartCode": ["snippet install", "async loading", "data collection", "domain verification"],
    "Goals & Metrics": ["revenue goal", "engagement goal", "custom conversion", "goal editing"],
    "Reports": ["report export", "date range filter", "segment report", "scheduled email"],
    "Integrations": ["Google Analytics sync", "webhook delivery", "Slack alerts", "CRM push"],
    "SDK / Server-Side API": ["auth token", "getVariation call", "track conversion", "rate limiting"],
    "Account & Billing": ["plan upgrade", "invoice download", "seat limit", "payment method"],
    "User Management": ["invite user", "role permissions", "SSO login", "deactivate user"],
}

TYPES = ["Functional", "Negative", "Boundary", "Security", "UI/UX", "Performance", "Regression", "API", "Accessibility"]
TYPE_WEIGHTS = [30, 16, 8, 8, 10, 6, 8, 8, 6]
PRIORITIES = ["Highest", "High", "Medium", "Low"]
PRIORITY_WEIGHTS = [8, 30, 45, 17]
BROWSERS = ["Chrome 148", "Firefox 141", "Safari 19", "Edge 148"]
DEVICES = ["desktop", "mobile (iOS)", "mobile (Android)", "tablet"]
STATUSES = ["Draft", "Ready", "Automated", "Deprecated"]
STATUS_WEIGHTS = [15, 45, 32, 8]

ACTION = {
    "Functional": ["verify", "validate", "confirm", "ensure"],
    "Negative": ["reject invalid input to", "handle failure of", "prevent misuse of"],
    "Boundary": ["test limits of", "check boundary values for"],
    "Security": ["verify access control on", "check authorization for", "test injection defense on"],
    "UI/UX": ["verify layout of", "check responsiveness of", "validate rendering of"],
    "Performance": ["measure load time of", "check throughput of"],
    "Regression": ["re-verify", "regression-check"],
    "API": ["verify API response for", "validate schema of"],
    "Accessibility": ["verify keyboard access to", "check ARIA labels on"],
}

EXPECTED = {
    "Functional": "The {feature} works as specified and the change is saved and reflected in the UI.",
    "Negative": "The system rejects the invalid action, shows a clear inline error, and no data is corrupted.",
    "Boundary": "Values at and beyond the limit are handled correctly with the documented boundary behavior.",
    "Security": "Unauthorized access is denied with HTTP 403 and the attempt is logged; no data leaks.",
    "UI/UX": "The {feature} renders correctly with no overlap or clipping across the tested viewport.",
    "Performance": "The {feature} completes within the agreed SLA under the tested load.",
    "Regression": "Previously fixed behavior for {feature} still holds; no regression is observed.",
    "API": "The endpoint returns HTTP 200 with a response body matching the documented JSON schema.",
    "Accessibility": "The {feature} is fully operable by keyboard and screen reader with correct ARIA roles.",
}

def steps_for(feature, module, ttype, browser, device):
    base = [
        f"Log in to VWO and open the {module} module.",
        f"Navigate to the {feature} screen.",
    ]
    if ttype == "Negative":
        base.append(f"Enter invalid or malformed input for {feature} and submit.")
    elif ttype == "Boundary":
        base.append(f"Set {feature} to its minimum, maximum, and just-beyond-limit values.")
    elif ttype == "Security":
        base.append(f"Attempt the {feature} action as a user without the required permission.")
    elif ttype == "API":
        base.append(f"Send the {feature} request with a valid auth token and inspect the response.")
    elif ttype == "Performance":
        base.append(f"Trigger {feature} repeatedly under concurrent load and record timings.")
    else:
        base.append(f"Perform the {feature} action with valid inputs and save.")
    base.append(f"Observe the result on {device} using {browser}.")
    return " | ".join(f"{i+1}. {s}" for i, s in enumerate(base))

def main():
    rows = []
    module_names = list(MODULES.keys())
    for i in range(1, N + 1):
        module = random.choice(module_names)
        feature = random.choice(MODULES[module])
        ttype = random.choices(TYPES, weights=TYPE_WEIGHTS)[0]
        priority = random.choices(PRIORITIES, weights=PRIORITY_WEIGHTS)[0]
        status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
        browser = random.choice(BROWSERS)
        device = random.choice(DEVICES)
        verb = random.choice(ACTION[ttype])

        key = f"VWO-{1000 + i}"
        summary = f"[{module}] {ttype}: {verb} {feature}".replace("  ", " ")
        summary = summary[0].upper() + summary[1:]
        description = (
            f"As a QA engineer, {verb} the {feature} in the {module} module to make sure it behaves "
            f"correctly for {ttype.lower()} scenarios on {device} ({browser})."
        )
        precond = f"A VWO account with access to {module}; at least one active project; {browser} on {device}."
        steps = steps_for(feature, module, ttype, browser, device)
        expected = EXPECTED[ttype].format(feature=feature)
        labels = f"{module.split('/')[0].strip().replace(' ', '-')} {ttype.replace('/', '-')} regression".lower()

        rows.append({
            "Issue Type": "Test",
            "Issue Key": key,
            "Summary": summary,
            "Description": description,
            "Priority": priority,
            "Component": module,
            "Labels": labels,
            "Test Type": ttype,
            "Preconditions": precond,
            "Steps": steps,
            "Expected Result": expected,
            "Browser": browser,
            "Device": device,
            "Status": status,
        })

    fields = ["Issue Type", "Issue Key", "Summary", "Description", "Priority", "Component",
              "Labels", "Test Type", "Preconditions", "Steps", "Expected Result", "Browser", "Device", "Status"]
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows -> {OUT}")

if __name__ == "__main__":
    main()
