"""OpenAI gpt-4o answer generation, streamed, grounded in reranked test cases."""

from openai import OpenAI

from app.config import settings

_client = None

SYSTEM_PROMPT = (
    "You are a QA assistant answering questions about VWO (a CRO / A-B-testing product) "
    "test cases. Answer ONLY using the provided test case context below — never invent "
    "test cases or facts. Every claim must cite the relevant Test Case Key(s) inline, "
    "e.g. (VWO-AB-POS-0001). If the context doesn't contain the answer, say so plainly."
)


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def build_context(test_cases: list[dict]) -> str:
    blocks = []
    for tc in test_cases:
        blocks.append(
            f"[{tc['key']}] {tc['summary']}\n"
            f"Component: {tc['component']} | Priority: {tc['priority']}\n"
            f"Preconditions: {tc.get('preconditions', '')}\n"
            f"Steps: {tc.get('test_steps', '')}\n"
            f"Expected Result: {tc.get('expected_result', '')}"
        )
    return "\n\n---\n\n".join(blocks)


def stream_answer(query: str, test_cases: list[dict]):
    """Yields text chunks as they arrive from OpenAI."""
    client = get_client()
    context = build_context(test_cases)
    stream = client.chat.completions.create(
        model=settings.openai_generation_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n\n{context}\n\nQuestion: {query}"},
        ],
        temperature=0.2,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
