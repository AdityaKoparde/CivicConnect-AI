"""AI endpoints — language detection, classification, entities, translation,
priority, department recommendation and the stateful chat endpoint.
Python performs ALL of the AI/ML work here; Node.js only calls these.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.api.deps import require_service_key
from app.schemas.ai import (
    AIUnderstanding,
    AssessPriorityRequest,
    AssessPriorityResponse,
    ChatRequest,
    ChatResponse,
    ClassifyRequest,
    DetectLanguageRequest,
    DetectLanguageResponse,
    ExtractEntitiesRequest,
    ExtractEntitiesResponse,
    RecommendDepartmentRequest,
    RecommendDepartmentResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.services.classification import classification_service
from app.services.conversation import conversation_service
from app.services.department_recommendation import department_recommendation_service
from app.services.emergency import emergency_detection_service
from app.services.entity_extraction import entity_extraction_service
from app.services.language_detection import detect_language
from app.services.priority import priority_assessment_service
from app.services.translation import translation_service
from app.services.understanding import understanding_service

logger = logging.getLogger("civicconnect.ai.api")

router = APIRouter(prefix="/api/v1/ai", dependencies=[Depends(require_service_key)])


@router.post("/detect-language", response_model=DetectLanguageResponse)
def detect_language_endpoint(req: DetectLanguageRequest) -> DetectLanguageResponse:
    return detect_language(req.text)


@router.post("/classify-complaint", response_model=AIUnderstanding)
async def classify_complaint_endpoint(req: ClassifyRequest) -> AIUnderstanding:
    return await understanding_service.understand_with_cloud(req.text, req.language)


@router.post("/extract-entities", response_model=ExtractEntitiesResponse)
def extract_entities_endpoint(req: ExtractEntitiesRequest) -> ExtractEntitiesResponse:
    return ExtractEntitiesResponse(
        entities=entity_extraction_service.extract(req.text, req.language)
    )


@router.post("/translate", response_model=TranslateResponse)
async def translate_endpoint(req: TranslateRequest) -> TranslateResponse:
    return await translation_service.translate(
        req.text, req.target_language, req.source_language
    )


@router.post("/assess-priority", response_model=AssessPriorityResponse)
def assess_priority_endpoint(req: AssessPriorityRequest) -> AssessPriorityResponse:
    entities = req.entities or entity_extraction_service.extract(req.text, req.language)
    emergency = emergency_detection_service.detect(req.text)
    safety = (
        req.safety_risk
        if req.safety_risk is not None
        else (emergency.is_emergency or bool(emergency_detection_service.safety_signal(req.text)))
    )
    # category weight improves the score; use the classifier's best guess
    category = classification_service.classify(req.text).category
    result = priority_assessment_service.assess(
        req.text, entities, safety, category, emergency.is_emergency
    )
    return AssessPriorityResponse(
        priority=result.priority, score=result.score, factors=result.factors
    )


@router.post("/recommend-department", response_model=RecommendDepartmentResponse)
def recommend_department_endpoint(req: RecommendDepartmentRequest) -> RecommendDepartmentResponse:
    return department_recommendation_service.recommend(
        req.category, req.entities, req.district
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    response = await conversation_service.chat(req)
    # Log only operational metadata — never the citizen's text (privacy).
    logger.info(
        "chat turn lang=%s action=%s provider=%s emergency=%s",
        response.detected_language,
        response.next_action,
        response.ai_provider,
        response.emergency.is_emergency,
    )
    return response
