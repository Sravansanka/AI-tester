STAGES = ["rewrite", "embed", "retrieve", "rerank", "generate"]


def stage_event(stage: str, status: str, detail: dict | None = None) -> dict:
    return {"event": "stage", "data": {"stage": stage, "status": status, "detail": detail or {}}}


def token_event(text: str) -> dict:
    return {"event": "token", "data": {"text": text}}


def done_event() -> dict:
    return {"event": "done", "data": {}}


def error_event(stage: str, message: str) -> dict:
    return {"event": "error", "data": {"stage": stage, "message": message}}
