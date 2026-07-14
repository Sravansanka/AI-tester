"""OpenAI-based query rewriting: generate alternate phrasings before retrieval."""

import json

from openai import OpenAI

from app.config import settings

_client = None

SYSTEM_PROMPT = (
    "You rewrite a user's search query into 2 alternate phrasings that preserve the "
    "original intent but vary vocabulary and structure, to improve recall in a hybrid "
    "(dense + sparse) retrieval system over a corpus of QA/testing test cases for the "
    "product VWO (a CRO / A-B-testing SaaS). Return ONLY JSON of the form "
    '{"rewrites": ["...", "..."]} with exactly 2 strings.'
)


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def rewrite_query(query: str) -> list[str]:
    client = get_client()
    response = client.chat.completions.create(
        model=settings.openai_rewrite_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content.strip()
    try:
        parsed = json.loads(content)
        rewrites = [str(s) for s in parsed.get("rewrites", [])][:2]
    except (json.JSONDecodeError, AttributeError):
        rewrites = []
    return rewrites
