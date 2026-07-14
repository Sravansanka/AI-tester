from typing import Literal, Optional

from pydantic import BaseModel, Field

StageName = Literal["rewrite", "embed", "retrieve", "rerank", "generate"]
StageStatus = Literal["pending", "running", "done", "error"]


class ChatFilters(BaseModel):
    component: Optional[str] = None
    priority: Optional[str] = None
    scenario_type: Optional[str] = None


class ChatRequest(BaseModel):
    query: str = Field(min_length=1)
    filters: ChatFilters = Field(default_factory=ChatFilters)


class Candidate(BaseModel):
    key: str
    score: float
    summary: str
    component: str
    priority: str


class CollectionStats(BaseModel):
    total_points: int
    components: dict[str, int]
    priorities: dict[str, int]
    scenario_types: dict[str, int]
