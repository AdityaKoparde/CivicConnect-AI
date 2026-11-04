"""GrievanceClassificationService — hybrid rule + scikit-learn classifier.

Layer 1: multilingual keyword lexicon scoring (deterministic, explainable).
Layer 2: TF-IDF (char n-gram) + Multinomial Naive Bayes trained at startup on
         the embedded labelled corpus with deterministic augmentation.
The two layers are combined with agreement-aware confidence calibration.
Python owns this intelligence end-to-end; no JS duplication.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from app.services.lexicons import (
    CATEGORIES,
    CATEGORY_KEYWORDS,
    CATEGORY_LABELS,
    CORPUS_PREFIXES,
    TRAINING_CORPUS,
)
from app.utils.text import fold_for_match

logger = logging.getLogger("civicconnect.ai.classification")


@dataclass
class ClassificationResult:
    category: str
    confidence: float
    scores: dict[str, float] = field(default_factory=dict)
    method: str = "default"
    top_keywords: list[str] = field(default_factory=list)
    ml_category: str | None = None
    ml_probability: float = 0.0


class GrievanceClassificationService:
    """Classifies a complaint into one of 15 civic categories."""

    def __init__(self) -> None:
        self._model: Pipeline | None = None

    # -------------------------------------------------------------- training --
    def train(self) -> None:
        """Train the char n-gram NB model on the embedded corpus (fast, <1s)."""
        texts: list[str] = []
        labels: list[str] = []
        for text, label in TRAINING_CORPUS:
            for prefix in CORPUS_PREFIXES:
                texts.append(f"{prefix}{text}" if prefix else text)
                labels.append(label)
        vectorizer = TfidfVectorizer(
            analyzer="char_wb", ngram_range=(2, 5), min_df=1, sublinear_tf=True
        )
        clf = MultinomialNB(alpha=0.1)
        x = vectorizer.fit_transform(texts)
        clf.fit(x, labels)
        self._model = Pipeline([("tfidf", vectorizer), ("nb", clf)])
        logger.info(
            "trained grievance classifier: %d samples, %d categories",
            len(texts), len(set(labels)),
        )

    @property
    def trained(self) -> bool:
        return self._model is not None

    # -------------------------------------------------------------- lexicon ---
    def _lexicon_scores(self, text: str) -> tuple[dict[str, float], list[str]]:
        folded = fold_for_match(text)
        scores: dict[str, float] = {}
        hits: dict[str, list[str]] = {}
        for category, by_lang in CATEGORY_KEYWORDS.items():
            total = 0.0
            matched: list[str] = []
            for keywords in by_lang.values():
                for kw in keywords:
                    if kw in folded:
                        weight = 1.0 + 0.5 * (len(kw.split()) - 1)
                        total += weight
                        matched.append(kw)
            scores[category] = total
            hits[category] = matched
        top_kw = max(hits.items(), key=lambda kv: (len(kv[1]), kv[0]))
        return scores, top_kw[1][:4]

    # ------------------------------------------------------------ classify ----
    def classify(self, text: str) -> ClassificationResult:
        lex_scores, top_keywords = self._lexicon_scores(text)
        lex_best = max(lex_scores, key=lex_scores.get)  # type: ignore[arg-type]
        lex_raw = lex_scores[lex_best]
        lex_strength = min(1.0, lex_raw / 3.0)  # saturating

        ml_best: str | None = None
        ml_prob = 0.0
        ml_margin = 0.0
        if self._model is not None:
            proba = self._model.predict_proba([text])[0]
            classes = list(self._model.classes_)
            order = sorted(range(len(classes)), key=lambda i: proba[i], reverse=True)
            ml_best = classes[order[0]]
            ml_prob = float(proba[order[0]])
            ml_margin = ml_prob - float(proba[order[1]]) if len(order) > 1 else ml_prob

        # An ML signal only counts when the model is both confident AND
        # decisive — diffuse probabilities (gibberish input) must not classify.
        has_lex = lex_raw > 0
        has_ml = (
            ml_best is not None and ml_prob >= 0.55 and ml_margin >= 0.12
        )

        if has_lex and has_ml and lex_best == ml_best:
            conf = 0.55 * min(1.0, lex_strength + 0.2) + 0.45 * ml_prob + 0.10
            category, method = lex_best, "rules+ml-agree"
        elif has_lex and has_ml:  # disagreement → trust the stronger signal
            if lex_strength >= ml_prob:
                category, method = lex_best, "rules+ml-disagree-rules"
                conf = 0.60 * lex_strength + 0.25 * ml_prob
            else:
                category, method = ml_best, "rules+ml-disagree-ml"
                conf = 0.60 * ml_prob + 0.25 * lex_strength
        elif has_lex:
            category, method = lex_best, "rules"
            conf = 0.62 * lex_strength + (0.2 * ml_prob if ml_best else 0.0)
        elif has_ml:
            category, method = ml_best, "ml"  # type: ignore[assignment]
            conf = 0.68 * ml_prob
        else:
            category, method = "other", "default"
            conf = 0.25 + (0.15 * ml_prob if ml_best else 0.0)

        conf = round(min(0.97, max(0.1, conf)), 2)
        if not has_lex and not has_ml:
            category = "other"

        # Scale lexicon scores to 0..1 for reporting
        max_raw = max(lex_scores.values()) or 1.0
        reported = {
            k: round(min(1.0, v / max(max_raw, 3.0)), 3) for k, v in lex_scores.items()
        }
        return ClassificationResult(
            category=category,
            confidence=conf,
            scores=reported,
            method=method,
            top_keywords=top_keywords if has_lex else [],
            ml_category=ml_best,
            ml_probability=round(ml_prob, 3),
        )


# Module-level singleton (trained once at app startup)
classification_service = GrievanceClassificationService()


def category_label(key: str, lang: str = "en") -> dict[str, str]:
    label = CATEGORY_LABELS.get(key, CATEGORY_LABELS["other"])
    return dict(label)


def is_known_category(key: str) -> bool:
    return key in CATEGORY_LABELS
