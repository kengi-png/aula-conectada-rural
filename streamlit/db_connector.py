# -*- coding: utf-8 -*-
"""
Conector en la Nube a PostgreSQL (Neon) mediante SQLAlchemy y Pandas.
Consume las tablas vw_dashboard_acr y vw_mapa_desercion_acr.
"""

import os
import pandas as pd
import streamlit as st
from sqlalchemy import create_engine

QUERY_DASHBOARD = "SELECT * FROM vw_dashboard_acr;"
QUERY_MAPA_DESERCION = "SELECT * FROM vw_mapa_desercion_acr;"

EXPECTED_DASHBOARD_COLUMNS = [
    "CODGEO",
    "DEPARTAMENTO",
    "PROVINCIA",
    "DISTRITO",
    "CODLOCAL",
    "UGEL",
    "GRADIENTE_RURALIDAD",
    "TASA_DESERCION_PRIMARIA",
    "TASA_DESERCION_SECUNDARIA",
    "COMPUTADORAS_TOTAL",
    "COMPUTADORAS_OPERATIVAS",
    "TIENE_EQUIPO_RED",
    "TIENE_SOPORTE_ENERGIA",
]


@st.cache_resource
def get_db_engine():
    """Obtiene el motor SQLAlchemy leyendo DATABASE_URL desde st.secrets o variables de entorno."""
    db_url = None
    try:
        if "DATABASE_URL" in st.secrets:
            db_url = st.secrets["DATABASE_URL"]
    except Exception:
        pass

    if not db_url:
        db_url = os.getenv("DATABASE_URL")

    if not db_url:
        raise ValueError(
            "No se encontró 'DATABASE_URL' en st.secrets ni en las variables de entorno. "
            "Configúralo en .streamlit/secrets.toml o en los Secrets de Streamlit Cloud."
        )

    # Asegura compatibilidad con SQLAlchemy + psycopg (v3)
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://") and "+psycopg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return create_engine(db_url, pool_pre_ping=True)


def _normalize_dashboard_schema(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza los nombres de columna sin distinción de mayúsculas/minúsculas
    y valida la presencia exacta de las columnas oficiales.
    """
    df = df.copy()
    df.columns = [str(col).strip().upper() for col in df.columns]

    missing = [col for col in EXPECTED_DASHBOARD_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(
            "La tabla vw_dashboard_acr no devolvió las columnas esperadas: "
            + ", ".join(missing)
        )

    for str_col in [
        "CODGEO",
        "DEPARTAMENTO",
        "PROVINCIA",
        "DISTRITO",
        "CODLOCAL",
        "UGEL",
        "GRADIENTE_RURALIDAD",
    ]:
        df[str_col] = df[str_col].fillna("").astype(str).str.strip()

    # Restauramos ceros a la izquierda por si el CSV/Postgres los leyó como enteros
    df["CODGEO"] = df["CODGEO"].str.replace(r"\.0$", "", regex=True).str.zfill(6)
    df["CODLOCAL"] = df["CODLOCAL"].str.replace(r"\.0$", "", regex=True).str.zfill(6)

    for num_col in [
        "TASA_DESERCION_PRIMARIA",
        "TASA_DESERCION_SECUNDARIA",
        "COMPUTADORAS_TOTAL",
        "COMPUTADORAS_OPERATIVAS",
    ]:
        df[num_col] = pd.to_numeric(df[num_col], errors="coerce").fillna(0.0)

    for bin_col in ["TIENE_EQUIPO_RED", "TIENE_SOPORTE_ENERGIA"]:
        df[bin_col] = (
            pd.to_numeric(df[bin_col], errors="coerce")
            .fillna(0)
            .clip(lower=0, upper=1)
            .astype(int)
        )

    df["PROVINCIA_UGEL"] = df["PROVINCIA"] + " / " + df["UGEL"]
    return df


@st.cache_data(ttl=3600, show_spinner="Consultando vw_dashboard_acr en Neon Cloud...")
def _fetch_dashboard_view() -> pd.DataFrame:
    engine = get_db_engine()
    return pd.read_sql(QUERY_DASHBOARD, engine)


@st.cache_data(ttl=3600, show_spinner="Consultando vw_mapa_desercion_acr en Neon Cloud...")
def _fetch_mapa_desercion_view() -> pd.DataFrame:
    engine = get_db_engine()
    return pd.read_sql(QUERY_MAPA_DESERCION, engine)


def load_dashboard_data() -> pd.DataFrame:
    """Extrae datos reales desde vw_dashboard_acr en PostgreSQL (Neon)."""
    try:
        raw_df = _fetch_dashboard_view()
        return _normalize_dashboard_schema(raw_df)
    except Exception as exc:
        st.error(
            f"Error de conexión a PostgreSQL (Neon) al consultar vw_dashboard_acr.\n\n"
            f"Detalle técnico:\n{exc}"
        )
        st.stop()


def load_mapa_desercion_data() -> pd.DataFrame:
    """Extrae datos reales desde vw_mapa_desercion_acr en PostgreSQL (Neon)."""
    try:
        df = _fetch_mapa_desercion_view()
        df = df.copy()
        df.columns = [str(col).strip().upper() for col in df.columns]

        # Mapeo completo a los nombres exactos que espera streamlit/app.py
        column_aliases = {
            "TIPO_RURALIDAD": "TIPO_DISTRITO",
            "LOCALES_RURALES": "TOTAL_IE_RURALES",
            "TASA_DESERCION_2024": "TASA_TOTAL_2324",
            "PROYECCION_2025_BASE": "TASA_PROY_2025",
            "DESERCION_PRIMARIA_2324": "PRIMARIA_PCT",
            "DESERCION_SECUNDARIA_2324": "SECUNDARIA_PCT",
        }
        for old_name, new_name in column_aliases.items():
            if old_name in df.columns and new_name not in df.columns:
                df = df.rename(columns={old_name: new_name})

        # Aseguramos valores numéricos limpios en las métricas del mapa
        for num_col in [
            "TOTAL_LOCALES",
            "TOTAL_IE_RURALES",
            "LOCALES_SIN_COMPUTO",
            "LOCALES_SIN_RED",
            "PRIMARIA_PCT",
            "SECUNDARIA_PCT",
            "TASA_TOTAL_2324",
            "PROYECCION_2025_OPTIMISTA",
            "TASA_PROY_2025",
            "COMPUTADORAS_TOTAL",
            "COMPUTADORAS_OPERATIVAS",
            "PCT_OPERATIVIDAD",
        ]:
            if num_col in df.columns:
                df[num_col] = pd.to_numeric(df[num_col], errors="coerce").fillna(0.0)

        if "CODGEO" in df.columns:
            df["CODGEO"] = (
                df["CODGEO"]
                .fillna("")
                .astype(str)
                .str.strip()
                .str.replace(r"\.0$", "", regex=True)
                .str.zfill(6)
            )
        return df
    except Exception as exc:
        st.error(
            f"Error de conexión a PostgreSQL (Neon) al consultar vw_mapa_desercion_acr.\n\n"
            f"Detalle técnico:\n{exc}"
        )
        st.stop()