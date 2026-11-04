"""Pydantic schemas for every AI response. Nothing leaves the service unvalidated."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

PriorityLiteral = Literal["low", "medium", "high", "critical"]
LanguageLiteral = Literal["en", "kn", "hi", "other"]
NextActionLiteral = Literal[
    "ASK_LOCATION", "ASK_CATEGORY", "ASK_CONFIRM", "CLARIFY",
    "EMERGENCY", "SMALLTALK", "REGISTER",
]


class Entities(BaseModel):
    """Extracted civic-grievance entities. Missing values stay null, never invented."""

    model_config = ConfigDict(extra="allow")

    district: Optional[str] = None
    taluk: Optional[str] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    landmark: Optional[str] = None
    local_body: Optional[str] = None
    road_type: Optional[Literal["urban", "highway", "rural"]] = None
    duration_days: Optional[int] = Field(default=None, ge=0, le=3650)
    problem_type: Optional[str] = None
    safety_details: Optional[str] = None


class CategoryLabel(BaseModel):
    en: str
    kn: str
    hi: str


class AIUnderstanding(BaseModel):
    """Structured classification returned for a complaint text."""

    original_text: str
    detected_language: str
    normalized_description: str
    category: str
    category_label: Dict[str, str]
    entities: Entities = Field(default_factory=Entities)
    priority: PriorityLiteral = "medium"
    safety_risk: bool = False
    emergency: bool = False
    recommended_department: str = ""
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    reasoning: str = ""
    requires_manual_review: bool = False
    ai_provider: str = "demo"
    # How the category was decided: "rules", "rules+ml-agree", "ml", "default"
    classification_method: str = "unknown"


# ---------------------------------------------------------------- language ----
class DetectLanguageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class DetectLanguageResponse(BaseModel):
    language: LanguageLiteral
    confidence: float = Field(ge=0.0, le=1.0)
    supported: bool


# ------------------------------------------------------------ classify --------
class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: Optional[LanguageLiteral] = None


class ExtractEntitiesRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: Optional[LanguageLiteral] = None


class ExtractEntitiesResponse(BaseModel):
    entities: Entities


# ----------------------------------------------------------- translate --------
class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    target_language: LanguageLiteral
    source_language: Optional[LanguageLiteral] = None


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    provider: str


# ------------------------------------------------------------ priority --------
class AssessPriorityRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: Optional[LanguageLiteral] = None
    entities: Optional[Entities] = None
    safety_risk: Optional[bool] = None


class AssessPriorityResponse(BaseModel):
    priority: PriorityLiteral
    score: float = Field(ge=0.0, le=1.0)
    factors: List[str]


# ------------------------------------------------------------- routing --------
class RecommendDepartmentRequest(BaseModel):
    category: str
    entities: Optional[Entities] = None
    district: Optional[str] = None


class RecommendDepartmentResponse(BaseModel):
    recommended_department: str
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)


# ----------------------------------------------------------------- chat -------
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ConversationState(BaseModel):
    """Stateful slot tracker maintained by Node.js and interpreted here."""

    model_config = ConfigDict(extra="allow")

    slots: Dict[str, Any] = Field(default_factory=dict)
    missing: List[str] = Field(default_factory=list)
    understanding: Optional[AIUnderstanding] = None
    turn: int = 0
    emergencyHandled: bool = False
    awaitingConfirmation: bool = False
    askedCategories: bool = False
    askedRoadType: bool = False
    askedLocationTimes: int = 0


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    language: Optional[LanguageLiteral] = None
    history: List[ChatTurn] = Field(default_factory=list, max_length=20)
    state: ConversationState = Field(default_factory=ConversationState)


class EmergencyInfo(BaseModel):
    is_emergency: bool = False
    guidance: Optional[str] = None
    call_number: str = "112"


class ChatResponse(BaseModel):
    detected_language: LanguageLiteral
    language_confidence: float = Field(ge=0.0, le=1.0)
    reply: str
    understanding: Optional[AIUnderstanding] = None
    slots: Dict[str, Any] = Field(default_factory=dict)
    # Full updated conversation state (turn counters + flags) so the backend
    # can persist it verbatim and reloads never lose progress.
    state: "ConversationState" = Field(default_factory=lambda: ConversationState())
    missing_slots: List[str] = Field(default_factory=list)
    next_action: NextActionLiteral
    needs_confirmation: bool = False
    confirmation_summary: Optional[str] = None
    emergency: EmergencyInfo = Field(default_factory=EmergencyInfo)
    suggested_replies: List[str] = Field(default_factory=list)
    ai_provider: str = "demo"


class HealthResponse(BaseModel):
    status: str = "ok"
    provider: str
    models: List[str]


class ErrorBody(BaseModel):
    code: str
    message: str
    details: List[Any] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorBody
