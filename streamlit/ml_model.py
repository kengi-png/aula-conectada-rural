# -*- coding: utf-8 -*-
"""
Módulo de Inteligencia Artificial — Random Forest Multiclase (Scikit-Learn)
Incluye TIENE_EQUIPO_RED y TIENE_SOPORTE_ENERGIA como variables predictoras de
infraestructura tecnológica junto a cómputo y ruralidad, optimizado para 69,642+
locales escolares de dbo.vw_Dashboard_ACR.
"""

from typing import Any, Dict, List

import numpy as np
import pandas as pd
import streamlit as st
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

NUMERIC_FEATURES = [
    "COMPUTADORAS_TOTAL",
    "COMPUTADORAS_OPERATIVAS",
    "PCT_OPERATIVIDAD",
    "BRECHA_EQUIPOS",
    "TIENE_EQUIPO_RED",
    "TIENE_SOPORTE_ENERGIA",
]

CATEGORICAL_FEATURES = ["GRADIENTE_RURALIDAD"]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

LEAKAGE_EXCLUDED_COLUMNS = [
    "TASA_DESERCION_PRIMARIA",
    "TASA_DESERCION_SECUNDARIA",
    "TASA_DESERCION_PROM_DEC",
]

RURALIDAD_ORDEN = ["Rural 3", "Rural 2", "Rural 1", "Urbano"]

RURALIDAD_DESCRIPTIONS: Dict[str, str] = {
    "Rural 3": "Rural 3: Alta dispersión territorial y aislamiento extremo (mayor vulnerabilidad).",
    "Rural 2": "Rural 2: Dispersión territorial intermedia.",
    "Rural 1": "Rural 1: Cercanía moderada a capital distrital / accesibilidad intermedia.",
    "Urbano": "Urbano: Zona urbana consolidada.",
}

FEATURE_LABELS = {
    "COMPUTADORAS_TOTAL": "Computadoras Totales del Local (P91_RECTEC)",
    "COMPUTADORAS_OPERATIVAS": "Computadoras Operativas del Local (P91_RECTEC)",
    "PCT_OPERATIVIDAD": "% Equipos Operativos del Local",
    "BRECHA_EQUIPOS": "Equipos Inoperativos (Total - Operativas)",
    "TIENE_EQUIPO_RED": "Equipamiento de Red / Conectividad (P93)",
    "TIENE_SOPORTE_ENERGIA": "Respaldo Energético UPS / Panel Solar (P3239)",
    "GRADIENTE_RURALIDAD_Rural 3": "Rural 3 (Alta dispersión / aislamiento extremo)",
    "GRADIENTE_RURALIDAD_Rural 2": "Rural 2 (Dispersión territorial intermedia)",
    "GRADIENTE_RURALIDAD_Rural 1": "Rural 1 (Cercanía moderada a capital distrital)",
    "GRADIENTE_RURALIDAD_Urbano": "Urbano (Zona urbana consolidada)",
}


def describe_ruralidad(gradiente: str) -> str:
    """Retorna la definición oficial del MINEDU para el gradiente de ruralidad."""
    clean = str(gradiente).strip()
    return RURALIDAD_DESCRIPTIONS.get(
        clean,
        f"{clean}: Gradiente territorial registrado en el padrón MINEDU.",
    )


def prepare_ml_features(df: pd.DataFrame) -> pd.DataFrame:
    """Genera las variables derivadas exclusivamente desde las columnas reales de infraestructura."""
    out = df.copy()
    total = out["COMPUTADORAS_TOTAL"].astype(float).clip(lower=0.0)
    oper = out["COMPUTADORAS_OPERATIVAS"].astype(float).clip(lower=0.0)
    out["PCT_OPERATIVIDAD"] = np.where(total > 0.0, (oper / total) * 100.0, 0.0)
    out["BRECHA_EQUIPOS"] = (total - oper).clip(lower=0.0)
    out["TIENE_EQUIPO_RED"] = (
        pd.to_numeric(out["TIENE_EQUIPO_RED"], errors="coerce")
        .fillna(0)
        .clip(lower=0, upper=1)
        .astype(int)
    )
    out["TIENE_SOPORTE_ENERGIA"] = (
        pd.to_numeric(out["TIENE_SOPORTE_ENERGIA"], errors="coerce")
        .fillna(0)
        .clip(lower=0, upper=1)
        .astype(int)
    )
    out["GRADIENTE_RURALIDAD"] = (
        out["GRADIENTE_RURALIDAD"].fillna("Rural 2").astype(str).str.strip()
    )

    if "SEMAFORO" not in out.columns:
        tasa_prom = (
            out["TASA_DESERCION_PRIMARIA"].astype(float)
            + out["TASA_DESERCION_SECUNDARIA"].astype(float)
        ) / 2.0
        out["SEMAFORO"] = np.where(
            tasa_prom > 0.025,
            "Rojo",
            np.where(tasa_prom >= 0.015, "Amarillo", "Verde"),
        )
    return out


def _build_rf_pipeline() -> Pipeline:
    """Construye el Pipeline regularizado anti-overfitting para grandes volúmenes."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", SimpleImputer(strategy="median"), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=7,
        min_samples_leaf=25,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ]
    )


@st.cache_resource(show_spinner="Entrenando Random Forest regularizado (validación 5-folds)...")
def train_random_forest_model(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Entrena RandomForestClassifier multiclase regularizado una única vez por caché
    de recurso, evitando overfitting y garantizando inferencia What-If en milisegundos.
    """
    assert not any(col in ALL_FEATURES for col in LEAKAGE_EXCLUDED_COLUMNS), (
        "Error metodológico: variable de deserción detectada en X."
    )

    df_ml = prepare_ml_features(df)
    X = df_ml[ALL_FEATURES].copy()
    y = df_ml["SEMAFORO"].astype(str).copy()

    class_counts = y.value_counts()
    min_class_count = int(class_counts.min()) if not class_counts.empty else 0
    can_stratify = len(class_counts) > 1 and min_class_count >= 2

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y if can_stratify else None,
        random_state=42,
    )

    eval_pipeline = _build_rf_pipeline()
    eval_pipeline.fit(X_train, y_train)
    y_pred = eval_pipeline.predict(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    labels_order = ["Rojo", "Amarillo", "Verde"]
    cm = confusion_matrix(y_test, y_pred, labels=labels_order)

    cv_splits = min(5, min_class_count) if can_stratify else 0
    if cv_splits >= 2:
        cv = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=42)
        cv_results = cross_validate(
            _build_rf_pipeline(),
            X,
            y,
            cv=cv,
            scoring={"accuracy": "accuracy", "f1_macro": "f1_macro"},
            n_jobs=-1,
        )
        cv_accuracy_mean = float(np.mean(cv_results["test_accuracy"]))
        cv_accuracy_std = float(np.std(cv_results["test_accuracy"]))
        cv_f1_macro_mean = float(np.mean(cv_results["test_f1_macro"]))
    else:
        cv_splits = 1
        cv_accuracy_mean = acc
        cv_accuracy_std = 0.0
        cv_f1_macro_mean = f1

    final_pipeline = _build_rf_pipeline()
    final_pipeline.fit(X, y)

    feature_names_out = final_pipeline.named_steps["preprocessor"].get_feature_names_out()
    importances = final_pipeline.named_steps["classifier"].feature_importances_

    imp_rows = []
    for raw_name, imp_val in zip(feature_names_out, importances):
        clean_name = raw_name.replace("num__", "").replace("cat__", "")
        imp_rows.append(
            {
                "feature": clean_name,
                "feature_label": FEATURE_LABELS.get(clean_name, clean_name),
                "importance": float(imp_val),
            }
        )

    df_imp = pd.DataFrame(imp_rows).sort_values("importance", ascending=False)

    return {
        "pipeline": final_pipeline,
        "accuracy": acc,
        "f1_macro": f1,
        "cv_folds": cv_splits,
        "cv_accuracy_mean": cv_accuracy_mean,
        "cv_accuracy_std": cv_accuracy_std,
        "cv_f1_macro_mean": cv_f1_macro_mean,
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "n_total": int(len(X)),
        "n_estimators": 100,
        "max_depth": 7,
        "min_samples_leaf": 25,
        "confusion_matrix": cm,
        "labels": labels_order,
        "feature_importances": df_imp,
    }


def classify_high_risk_districts(df: pd.DataFrame, pipeline: Pipeline) -> pd.DataFrame:
    """Retorna los locales y distritos clasificados en Riesgo Alto (Rojo) por el modelo."""
    df_scored = prepare_ml_features(df)
    X_eval = df_scored[ALL_FEATURES]
    df_scored["NIVEL_RIESGO_RF"] = pipeline.predict(X_eval)
    proba = pipeline.predict_proba(X_eval)
    classes = list(pipeline.classes_)
    if "Rojo" in classes:
        rojo_idx = classes.index("Rojo")
        df_scored["PROBABILIDAD_RIESGO_ALTO"] = (proba[:, rojo_idx] * 100.0).round(1)
    else:
        df_scored["PROBABILIDAD_RIESGO_ALTO"] = 0.0

    return df_scored[df_scored["NIVEL_RIESGO_RF"] == "Rojo"].sort_values(
        by=["PROBABILIDAD_RIESGO_ALTO", "BRECHA_EQUIPOS"],
        ascending=[False, False],
    )


def predict_what_if(
    pipeline: Pipeline,
    computadoras_total: float,
    computadoras_operativas: float,
    gradiente_ruralidad: str,
    tiene_equipo_red: int = 1,
    tiene_soporte_energia: int = 1,
) -> Dict[str, Any]:
    """Ejecuta inferencia multiclase en vivo para un escenario de equipamiento, red, energía y ruralidad."""
    total = max(float(computadoras_total), 0.0)
    oper = min(max(float(computadoras_operativas), 0.0), total)
    pct_op = (oper / total) * 100.0 if total > 0.0 else 0.0
    brecha = max(total - oper, 0.0)
    red_bin = 1 if int(bool(tiene_equipo_red)) == 1 else 0
    energia_bin = 1 if int(bool(tiene_soporte_energia)) == 1 else 0

    sample = pd.DataFrame(
        [
            {
                "COMPUTADORAS_TOTAL": total,
                "COMPUTADORAS_OPERATIVAS": oper,
                "PCT_OPERATIVIDAD": pct_op,
                "BRECHA_EQUIPOS": brecha,
                "TIENE_EQUIPO_RED": red_bin,
                "TIENE_SOPORTE_ENERGIA": energia_bin,
                "GRADIENTE_RURALIDAD": str(gradiente_ruralidad).strip(),
            }
        ]
    )

    predicted_class = str(pipeline.predict(sample)[0])
    proba_values = pipeline.predict_proba(sample)[0]
    classes = list(pipeline.classes_)

    probabilities = {cls: 0.0 for cls in ["Rojo", "Amarillo", "Verde"]}
    for cls, prob in zip(classes, proba_values):
        probabilities[str(cls)] = float(prob)

    drivers: List[str] = []
    if total == 0:
        drivers.append("Local sin equipamiento de cómputo registrado (COMPUTADORAS_TOTAL = 0).")
    elif oper == 0:
        drivers.append(f"Totalidad de equipos inoperativos (0 operativas de {int(total)} totales).")
    elif pct_op < 60.0:
        drivers.append(f"Operatividad de cómputo limitada ({pct_op:.1f}% operativas).")
    else:
        drivers.append(f"Parque de cómputo con operatividad saludable ({pct_op:.1f}% operativas).")

    if red_bin == 0:
        drivers.append("Sin equipamiento de red / conectividad (TIENE_EQUIPO_RED = 0).")
    else:
        drivers.append("Cuenta con equipamiento de red / router (TIENE_EQUIPO_RED = 1).")

    if energia_bin == 0:
        drivers.append("Sin respaldo energético UPS / panel solar (TIENE_SOPORTE_ENERGIA = 0).")
    else:
        drivers.append("Cuenta con respaldo energético UPS / panel solar (TIENE_SOPORTE_ENERGIA = 1).")

    drivers.append(describe_ruralidad(gradiente_ruralidad))

    return {
        "predicted_class": predicted_class,
        "probabilities": probabilities,
        "risk_drivers": drivers,
    }
