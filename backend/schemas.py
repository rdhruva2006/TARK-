from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, List, Optional

class EvaluationRequest(BaseModel):
    input: str
    domain: str
    min_blooms_level: int = Field(default=1, ge=1, le=6, description="Bloom's Taxonomy level 1-6")
    bypass_audit: bool = Field(default=False, description="If true, skip scoring and return expert answer")

class LogicAuditResponse(BaseModel):
    logic_score: int = Field(ge=0, le=100, description="Score from 0 to 100")
    feedback: str = Field(description="Socratic critique or expert answer")
    assumptions: List[str] = Field(default_factory=list, description="List of detected flaws")
    domain: Optional[str] = Field(default=None)
    blooms_level: Optional[str] = Field(default=None, description="Achieved Bloom's level label")
    simulation: Optional[str] = Field(default=None)
    analogy: Optional[str] = Field(default=None)
    pot_hash: Optional[str] = Field(default=None)
    final_answer: Optional[str] = Field(default=None, description="Expert reveal for I Give Up bypass")
    mermaid_syntax: Optional[str] = Field(default=None, description="Dynamic flowchart of the audit path")

    model_config = ConfigDict(extra='ignore')

    @field_validator('logic_score', mode='before')
    @classmethod
    def coerce_score_to_int(cls, v: Any) -> int:
        """Coerce LLM string scores like '75' or '75/100' to int."""
        try:
            return min(100, max(0, int(str(v).split('/')[0].strip())))
        except (ValueError, TypeError):
            return 0

    @field_validator('assumptions', mode='before')
    @classmethod
    def coerce_assumptions_to_list(cls, v: Any) -> List[str]:
        """Ensure assumptions is always a list of strings."""
        if v is None:
            return []
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        if isinstance(v, list):
            return [str(item) for item in v]
        return []
