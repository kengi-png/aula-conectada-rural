# -*- coding: utf-8 -*-
"""
AULA CONECTADA RURAL — Plataforma Corporativa de Analítica Educativa e IA
Universidad César Vallejo (UCV) | SQL Server: KENGI_YT\khenn / Proyecto_ACR
"""

from datetime import datetime
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from db_connector import load_dashboard_data, load_mapa_desercion_data
from ml_model import (
    ALL_FEATURES,
    LEAKAGE_EXCLUDED_COLUMNS,
    RURALIDAD_ORDEN,
    classify_high_risk_districts,
    describe_ruralidad,
    predict_what_if,
    prepare_ml_features,
    train_random_forest_model,
)
from peru_geo import build_peru_geojson, normalize_department_name
from pdf_exporter import (
    generate_executive_pdf,
    generate_mapa_desercion_pdf,
    generate_rf_evaluation_pdf,
)

# -----------------------------------------------------------------------------
# Configuración de Página e Identidad Institucional Formal
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="AULA CONECTADA RURAL | MINEDU - UCV",
    layout="wide",
    initial_sidebar_state="expanded",
)

if "mapa_periodo" not in st.session_state:
    st.session_state["mapa_periodo"] = "2023-2024"
if "mapa_fullscreen" not in st.session_state:
    st.session_state["mapa_fullscreen"] = False

fullscreen_css = ""
if st.session_state["mapa_fullscreen"]:
    fullscreen_css = """
    section[data-testid="stSidebar"] { display: none !important; }
    .block-container {
        max-width: 100% !important;
        padding-left: 1.5rem !important;
        padding-right: 1.5rem !important;
    }
    """

st.markdown(
    f"""
    <style>
        .stApp {{ background-color: #F8FAFC; }}
        div[data-testid="stMetric"] {{
            background-color: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px 20px;
        }}
        div[data-testid="stMetricValue"] {{
            font-variant-numeric: tabular-nums;
            color: #0F2D52;
        }}
        .section-caption {{
            color: #475569;
            font-size: 0.9rem;
            margin-top: -8px;
            margin-bottom: 16px;
        }}
        .legend-card {{
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-top: 8px;
        }}
        .legend-title {{
            font-size: 0.78rem;
            font-weight: 700;
            color: #0F2D52;
            letter-spacing: 0.04em;
            margin-bottom: 6px;
        }}
        .legend-row {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.8rem;
            color: #1E293B;
            margin-bottom: 3px;
        }}
        .legend-swatch {{
            width: 12px;
            height: 12px;
            border-radius: 2px;
            display: inline-block;
        }}
        div[data-testid="stTabs"],
        div[data-testid="stTabs"] > div,
        div[data-baseweb="tabs"],
        div[data-baseweb="tab-list"],
        div[role="tablist"] {{
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }}
        div[data-testid="stTabs"] *::-webkit-scrollbar,
        div[data-baseweb="tab-list"]::-webkit-scrollbar,
        div[data-baseweb="tab-list"]::-webkit-scrollbar-button {{
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }}
        div[data-baseweb="tab-list"] {{
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 1rem !important;
            width: 100% !important;
            padding: 0.25rem 0.25rem 0 0.25rem !important;
            border-bottom: 1px solid #E2E8F0 !important;
        }}
        button[data-baseweb="tab"] {{
            white-space: nowrap !important;
            flex-shrink: 0 !important;
            padding: 0.6rem 1.1rem !important;
            border-radius: 8px 8px 0 0 !important;
            font-size: 0.92rem !important;
            font-weight: 500 !important;
            color: #475569 !important;
            background-color: transparent !important;
            transition: background-color 150ms ease, color 150ms ease !important;
        }}
        button[data-baseweb="tab"]:hover {{
            color: #0F2D52 !important;
            background-color: #F1F5F9 !important;
        }}
        button[data-baseweb="tab"][aria-selected="true"] {{
            color: #0F2D52 !important;
            font-weight: 700 !important;
            background-color: #EFF6FF !important;
        }}
        div[data-baseweb="tab-highlight"] {{
            background-color: #0F2D52 !important;
            height: 3px !important;
        }}
        {fullscreen_css}
    </style>
    """,
    unsafe_allow_html=True,
)

# -----------------------------------------------------------------------------
# Carga de Vistas Oficiales desde SQL Server (Proyecto_ACR)
# -----------------------------------------------------------------------------
df_raw = load_dashboard_data()
df_mapa_raw = load_mapa_desercion_data()

# -----------------------------------------------------------------------------
# Barra Lateral Izquierda: Filtros para Panel Analítico
# -----------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### Filtros Territoriales")
    st.caption("Servidor: KENGI_YT\\khenn · Base: Proyecto_ACR")

    departamentos = ["Todos"] + sorted([d for d in df_raw["DEPARTAMENTO"].dropna().unique().tolist() if d])
    sel_departamento = st.selectbox("Departamento", departamentos, index=0)

    df_step1 = (
        df_raw
        if sel_departamento == "Todos"
        else df_raw[df_raw["DEPARTAMENTO"] == sel_departamento]
    )

    ugeles = ["Todas"] + sorted([u for u in df_step1["PROVINCIA_UGEL"].dropna().unique().tolist() if u])
    sel_ugel = st.selectbox("Provincia / UGEL", ugeles, index=0)

    sel_nivel = st.selectbox("Nivel Educativo", ["Todos", "Primaria", "Secundaria"], index=0)

    ruralidades = ["Todas"] + sorted([r for r in df_raw["GRADIENTE_RURALIDAD"].dropna().unique().tolist() if r])
    sel_ruralidad = st.selectbox("Gradiente de Ruralidad", ruralidades, index=0)

    st.divider()
    st.caption("Conexión activa: Autenticación de Windows")


def _classify_accion_sugerida(row: pd.Series) -> str:
    total = float(row["COMPUTADORAS_TOTAL"])
    oper = float(row["COMPUTADORAS_OPERATIVAS"])
    red = int(row.get("TIENE_EQUIPO_RED", 0))
    if total == 0:
        return "Dotar"
    if total > 0 and oper == 0:
        return "Reponer"
    if oper < total and oper > 0:
        return "Reparar"
    if oper > 0 and red == 0:
        return "Conectividad / Red"
    return "Adecuado"


# Enriquecer DataFrame con cálculos dinámicos derivados únicamente de columnas reales
df_enriched = df_raw.copy()
df_enriched["ACCION_SUGERIDA"] = df_enriched.apply(_classify_accion_sugerida, axis=1)
df_enriched["TASA_PRIMARIA_PCT"] = df_enriched["TASA_DESERCION_PRIMARIA"] * 100.0
df_enriched["TASA_SECUNDARIA_PCT"] = df_enriched["TASA_DESERCION_SECUNDARIA"] * 100.0
df_enriched["TASA_DESERCION_DEC"] = (
    df_enriched["TASA_DESERCION_PRIMARIA"] + df_enriched["TASA_DESERCION_SECUNDARIA"]
) / 2.0
df_enriched["TASA_DESERCION_PCT"] = df_enriched["TASA_DESERCION_DEC"] * 100.0
df_enriched["SEMAFORO"] = df_enriched["TASA_DESERCION_DEC"].apply(
    lambda v: "Rojo" if v > 0.025 else ("Amarillo" if v >= 0.015 else "Verde")
)

# Aplicar filtros en cascada para Pestaña 1
df_filtered = df_enriched.copy()
if sel_departamento != "Todos":
    df_filtered = df_filtered[df_filtered["DEPARTAMENTO"] == sel_departamento]
if sel_ugel != "Todas":
    df_filtered = df_filtered[df_filtered["PROVINCIA_UGEL"] == sel_ugel]
if sel_ruralidad != "Todas":
    df_filtered = df_filtered[df_filtered["GRADIENTE_RURALIDAD"] == sel_ruralidad]

# Ajustar tasa activa según selector de Nivel Educativo
if sel_nivel == "Primaria":
    df_filtered["TASA_ACTIVA_DEC"] = df_filtered["TASA_DESERCION_PRIMARIA"]
elif sel_nivel == "Secundaria":
    df_filtered["TASA_ACTIVA_DEC"] = df_filtered["TASA_DESERCION_SECUNDARIA"]
else:
    df_filtered["TASA_ACTIVA_DEC"] = (
        df_filtered["TASA_DESERCION_PRIMARIA"] + df_filtered["TASA_DESERCION_SECUNDARIA"]
    ) / 2.0
df_filtered["TASA_DESERCION_PCT"] = df_filtered["TASA_ACTIVA_DEC"] * 100.0
df_filtered["SEMAFORO"] = df_filtered["TASA_ACTIVA_DEC"].apply(
    lambda v: "Rojo" if v > 0.025 else ("Amarillo" if v >= 0.015 else "Verde")
)

# Entrenar modelo Random Forest sobre columnas reales de infraestructura (sin fuga de datos)
rf_artifacts = train_random_forest_model(df_enriched)

if not df_filtered.empty:
    # KPI 1: Promedio general combinando TASA_DESERCION_PRIMARIA y TASA_DESERCION_SECUNDARIA (* 100)
    if sel_nivel == "Primaria":
        tasa_desercion_prom = float(df_filtered["TASA_DESERCION_PRIMARIA"].mean()) * 100.0
    elif sel_nivel == "Secundaria":
        tasa_desercion_prom = float(df_filtered["TASA_DESERCION_SECUNDARIA"].mean()) * 100.0
    else:
        combined_rates = pd.concat(
            [df_filtered["TASA_DESERCION_PRIMARIA"], df_filtered["TASA_DESERCION_SECUNDARIA"]],
            ignore_index=True,
        )
        tasa_desercion_prom = float(combined_rates.mean()) * 100.0

    # KPI 2: (COMPUTADORAS_OPERATIVAS.sum() / COMPUTADORAS_TOTAL.sum()) * 100
    total_computadoras = float(df_filtered["COMPUTADORAS_TOTAL"].sum())
    total_operativas = float(df_filtered["COMPUTADORAS_OPERATIVAS"].sum())
    equipos_operativos_pct = (
        (total_operativas / total_computadoras) * 100.0 if total_computadoras > 0.0 else 0.0
    )

    # KPI 3: Promedio de PCs Operativas por Local (COMPUTADORAS_OPERATIVAS.mean())
    pcs_operativas_por_local = float(df_filtered["COMPUTADORAS_OPERATIVAS"].mean())
    total_locales = len(df_filtered)

    # Indicadores de Brecha Digital (TIENE_EQUIPO_RED y TIENE_SOPORTE_ENERGIA)
    pct_equipo_red = float(df_filtered["TIENE_EQUIPO_RED"].mean()) * 100.0
    locales_con_red = int(df_filtered["TIENE_EQUIPO_RED"].sum())
    pct_soporte_energia = float(df_filtered["TIENE_SOPORTE_ENERGIA"].mean()) * 100.0
    locales_con_energia = int(df_filtered["TIENE_SOPORTE_ENERGIA"].sum())

    # KPI 4: Distritos únicos (CODGEO) cuya tasa promedio de deserción sea > 2.5% (0.025 decimal)
    df_dist_rates = (
        df_filtered.groupby("CODGEO", as_index=False)
        .agg(
            TASA_DIST_DEC=("TASA_ACTIVA_DEC", "mean"),
        )
    )
    df_dist_rates["SEMAFORO_DIST"] = df_dist_rates["TASA_DIST_DEC"].apply(
        lambda v: "Rojo" if v > 0.025 else ("Amarillo" if v >= 0.015 else "Verde")
    )
    total_distritos = max(len(df_dist_rates), 1)
    distritos_rojos = int((df_dist_rates["TASA_DIST_DEC"] > 0.025).sum())
    pct_rojos = (distritos_rojos / total_distritos) * 100.0

    df_pdf_source = (
        df_filtered.sort_values(by=["TASA_DESERCION_PCT"], ascending=[False])
        .drop_duplicates(subset=["CODGEO", "DISTRITO"])
        .head(10)
        .copy()
    )
    if not df_pdf_source.empty:
        df_pdf_ml = prepare_ml_features(df_pdf_source)
        df_pdf_source["RIESGO_RF"] = rf_artifacts["pipeline"].predict(df_pdf_ml[ALL_FEATURES])
    else:
        df_pdf_source["RIESGO_RF"] = []
else:
    tasa_desercion_prom = 0.0
    total_computadoras = 0.0
    total_operativas = 0.0
    equipos_operativos_pct = 0.0
    pcs_operativas_por_local = 0.0
    total_locales = 0
    pct_equipo_red = 0.0
    locales_con_red = 0
    pct_soporte_energia = 0.0
    locales_con_energia = 0
    distritos_rojos = 0
    total_distritos = 0
    pct_rojos = 0.0
    df_dist_rates = pd.DataFrame(columns=["CODGEO", "TASA_DIST_DEC", "SEMAFORO_DIST"])
    df_pdf_source = df_filtered.copy()
    df_pdf_source["RIESGO_RF"] = []

filtros_activos = {
    "departamento": sel_departamento,
    "provincia_ugel": sel_ugel,
    "nivel_educativo": sel_nivel,
    "ruralidad": sel_ruralidad,
}
kpis_reporte = {
    "tasa_desercion": tasa_desercion_prom,
    "equipos_operativos": equipos_operativos_pct,
    "pcs_operativas_por_local": pcs_operativas_por_local,
    "distritos_alerta_roja": distritos_rojos,
}
pdf_exec_bytes = generate_executive_pdf(
    filtros=filtros_activos,
    kpis=kpis_reporte,
    df_ranked=df_pdf_source,
)

# -----------------------------------------------------------------------------
# Cabecera Principal + Botón "Descargar Reporte PDF"
# -----------------------------------------------------------------------------
header_left, header_right = st.columns([3.4, 1.0], vertical_alignment="center")
with header_left:
    st.title("AULA CONECTADA RURAL")
    st.markdown(
        '<p class="section-caption">'
        "Universidad César Vallejo · Sistema Corporativo de Monitoreo TIC y "
        "Deserción Escolar Rural (MINEDU)</p>",
        unsafe_allow_html=True,
    )
with header_right:
    st.download_button(
        label="Descargar Reporte PDF",
        data=pdf_exec_bytes,
        file_name=f"Reporte_Ejecutivo_ACR_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
        mime="application/pdf",
        disabled=df_filtered.empty,
        use_container_width=True,
    )

COLOR_ACCIONES = {
    "Dotar": "#DC2626",
    "Reponer": "#EA580C",
    "Reparar": "#D97706",
    "Conectividad / Red": "#2563EB",
    "Adecuado": "#16A34A",
}

COLOR_SEMAFORO = {
    "Rojo": "#DC2626",
    "Amarillo": "#D97706",
    "Verde": "#16A34A",
}

# -----------------------------------------------------------------------------
# Navegación Principal (3 Pestañas Corporativas)
# -----------------------------------------------------------------------------
tab_panel, tab_mapa, tab_ia = st.tabs(
    ["Panel Analítico", "Mapa Territorial de Deserción", "Modelo Random Forest"]
)

# =============================================================================
# PESTAÑA 1: PANEL ANALÍTICO
# =============================================================================
with tab_panel:
    if df_filtered.empty:
        st.warning(
            "No existen registros para la combinación de filtros seleccionada. "
            "Ajuste los criterios en la barra lateral."
        )
    else:
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.metric(
                label="Tasa de Deserción Promedio",
                value=f"{tasa_desercion_prom:.2f}%",
                delta="Promedio Primaria y Secundaria",
                delta_color="off",
            )
        with c2:
            st.metric(
                label="Porcentaje de Equipos Operativos",
                value=f"{equipos_operativos_pct:.1f}%",
                delta=f"{int(total_operativas):,} operativas / {int(total_computadoras):,} total",
                delta_color="off",
            )
        with c3:
            st.metric(
                label="Promedio de PCs Operativas por Local",
                value=f"{pcs_operativas_por_local:.1f}",
                delta=f"{total_locales:,} locales · {int(total_computadoras):,} PCs",
                delta_color="off",
            )
        with c4:
            st.metric(
                label="Distritos Prioritarios (Semáforo Rojo)",
                value=f"{distritos_rojos}",
                delta=f"{pct_rojos:.1f}% de {total_distritos:,} distritos (> 2.5%)",
                delta_color="inverse",
            )

        st.markdown("##### Diagnóstico de Brecha Digital: Conectividad de Red y Respaldo Energético")
        b1, b2 = st.columns(2)
        with b1:
            st.metric(
                label="Locales con Equipamiento de Red / Conectividad (TIENE_EQUIPO_RED)",
                value=f"{pct_equipo_red:.1f}%",
                delta=f"{locales_con_red:,} de {total_locales:,} locales escolares",
                delta_color="off",
            )
        with b2:
            st.metric(
                label="Locales con Respaldo Energético UPS / Panel Solar (TIENE_SOPORTE_ENERGIA)",
                value=f"{pct_soporte_energia:.1f}%",
                delta=f"{locales_con_energia:,} de {total_locales:,} locales escolares",
                delta_color="off",
            )

        st.markdown("---")
        g1, g2, g3 = st.columns([1.1, 1.2, 0.9])

        with g1:
            st.subheader("Locales por Acción Sugerida")
            df_acciones = (
                df_filtered.groupby("ACCION_SUGERIDA", as_index=False)["CODLOCAL"]
                .count()
                .rename(columns={"CODLOCAL": "Locales"})
                .sort_values("Locales", ascending=False)
            )
            fig_bar = px.bar(
                df_acciones,
                x="ACCION_SUGERIDA",
                y="Locales",
                color="ACCION_SUGERIDA",
                color_discrete_map=COLOR_ACCIONES,
                text="Locales",
                labels={"ACCION_SUGERIDA": "Acción Sugerida", "Locales": "Locales (CODLOCAL)"},
            )
            fig_bar.update_traces(textposition="outside", showlegend=False)
            fig_bar.update_layout(
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                margin=dict(t=24, b=24, l=16, r=16),
                height=340,
            )
            st.plotly_chart(fig_bar, use_container_width=True)

        with g2:
            st.subheader("Deserción por Nivel y Gradiente de Ruralidad")
            df_evol = (
                df_filtered.groupby("GRADIENTE_RURALIDAD", as_index=False)[
                    ["TASA_PRIMARIA_PCT", "TASA_SECUNDARIA_PCT"]
                ]
                .mean()
                .sort_values("GRADIENTE_RURALIDAD")
                .melt(
                    id_vars="GRADIENTE_RURALIDAD",
                    value_vars=["TASA_PRIMARIA_PCT", "TASA_SECUNDARIA_PCT"],
                    var_name="Nivel",
                    value_name="Tasa (%)",
                )
            )
            df_evol["Nivel"] = df_evol["Nivel"].map(
                {
                    "TASA_PRIMARIA_PCT": "Primaria",
                    "TASA_SECUNDARIA_PCT": "Secundaria",
                }
            )
            fig_line = px.line(
                df_evol,
                x="GRADIENTE_RURALIDAD",
                y="Tasa (%)",
                color="Nivel",
                markers=True,
                color_discrete_map={"Primaria": "#0F2D52", "Secundaria": "#DC2626"},
                labels={"GRADIENTE_RURALIDAD": "Gradiente de Ruralidad"},
            )
            fig_line.update_layout(
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                margin=dict(t=24, b=24, l=16, r=16),
                height=340,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            )
            st.plotly_chart(fig_line, use_container_width=True)

        with g3:
            st.subheader("Distritos por Semáforo")
            df_sem = (
                df_dist_rates.groupby("SEMAFORO_DIST", as_index=False)["CODGEO"]
                .count()
                .rename(columns={"SEMAFORO_DIST": "Semáforo", "CODGEO": "Distritos"})
            )
            fig_pie = px.pie(
                df_sem,
                names="Semáforo",
                values="Distritos",
                hole=0.48,
                color="Semáforo",
                color_discrete_map=COLOR_SEMAFORO,
            )
            fig_pie.update_traces(textinfo="percent+label")
            fig_pie.update_layout(
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                margin=dict(t=24, b=24, l=16, r=16),
                height=340,
                showlegend=False,
            )
            st.plotly_chart(fig_pie, use_container_width=True)

        st.markdown("---")
        st.subheader("Detalle de Locales Escolares y Distritos Prioritarios")
        df_table = (
            df_filtered.sort_values("TASA_DESERCION_PCT", ascending=False)
            .loc[
                :,
                [
                    "CODGEO",
                    "DEPARTAMENTO",
                    "PROVINCIA",
                    "DISTRITO",
                    "CODLOCAL",
                    "UGEL",
                    "GRADIENTE_RURALIDAD",
                    "COMPUTADORAS_OPERATIVAS",
                    "COMPUTADORAS_TOTAL",
                    "TIENE_EQUIPO_RED",
                    "TIENE_SOPORTE_ENERGIA",
                    "TASA_PRIMARIA_PCT",
                    "TASA_SECUNDARIA_PCT",
                    "TASA_DESERCION_PCT",
                    "ACCION_SUGERIDA",
                    "SEMAFORO",
                ],
            ]
            .rename(
                columns={
                    "CODGEO": "CODGEO",
                    "DEPARTAMENTO": "Departamento",
                    "PROVINCIA": "Provincia",
                    "DISTRITO": "Distrito",
                    "CODLOCAL": "CODLOCAL",
                    "UGEL": "UGEL",
                    "GRADIENTE_RURALIDAD": "Gradiente Ruralidad",
                    "COMPUTADORAS_OPERATIVAS": "PCs Operativas",
                    "COMPUTADORAS_TOTAL": "PCs Total",
                    "TIENE_EQUIPO_RED": "Equipo Red",
                    "TIENE_SOPORTE_ENERGIA": "Soporte Energía",
                    "TASA_PRIMARIA_PCT": "Primaria (%)",
                    "TASA_SECUNDARIA_PCT": "Secundaria (%)",
                    "TASA_DESERCION_PCT": "Deserción Prom. (%)",
                    "ACCION_SUGERIDA": "Acción Sugerida",
                    "SEMAFORO": "Semáforo",
                }
            )
        )
        st.dataframe(df_table, use_container_width=True, hide_index=True)

# =============================================================================
# PESTAÑA 2: MAPA TERRITORIAL DE DESERCIÓN (dbo.vw_Mapa_Desercion_ACR)
# =============================================================================
with tab_mapa:
    if "mapa_depto" not in st.session_state:
        st.session_state["mapa_depto"] = "Todos los departamentos"
    if "mapa_prov" not in st.session_state:
        st.session_state["mapa_prov"] = "Todas las provincias"
    if "mapa_dist" not in st.session_state:
        st.session_state["mapa_dist"] = "Todos los distritos"
    if "_last_map_click" not in st.session_state:
        st.session_state["_last_map_click"] = None

    def _on_depto_change():
        st.session_state["mapa_prov"] = "Todas las provincias"
        st.session_state["mapa_dist"] = "Todos los distritos"
        st.session_state["_last_map_click"] = None

    def _on_prov_change():
        st.session_state["mapa_dist"] = "Todos los distritos"

    col_map, col_table = st.columns([1.05, 1.25], gap="large")

    # -------------------------------------------------------------------------
    # COLUMNA IZQUIERDA: Controles 2x2 + Mapa Coroplético + Leyenda MAPA DE CALOR
    # -------------------------------------------------------------------------
    with col_map:
        row1_c1, row1_c2 = st.columns(2)
        with row1_c1:
            toggle_rural = st.toggle("CON PRESENCIA RURAL", value=True, key="tg_rural")
        with row1_c2:
            toggle_urbano = st.toggle("EXCLUSIVAMENTE URBANO", value=False, key="tg_urbano")

        row2_c1, row2_c2 = st.columns(2)
        with row2_c1:
            if st.button(
                "2023-2024",
                type="primary" if st.session_state["mapa_periodo"] == "2023-2024" else "secondary",
                use_container_width=True,
            ):
                st.session_state["mapa_periodo"] = "2023-2024"
                st.rerun()
        with row2_c2:
            if st.button(
                "2025",
                type="primary" if st.session_state["mapa_periodo"] == "2025" else "secondary",
                use_container_width=True,
            ):
                st.session_state["mapa_periodo"] = "2025"
                st.rerun()

        periodo_activo = st.session_state["mapa_periodo"]
        tasa_col = "TASA_TOTAL_2324" if periodo_activo == "2023-2024" else "TASA_TOTAL_2025"
        if tasa_col not in df_mapa_raw.columns and periodo_activo == "2025":
            tasa_base = df_mapa_raw["TASA_TOTAL_2324"].astype(float)
            media_global = float(tasa_base.mean()) if len(tasa_base) else 2.08
            n_ie = df_mapa_raw["TOTAL_IE_RURALES"].astype(float).clip(lower=1.0)
            df_mapa_raw["TASA_TOTAL_2025"] = (
                ((n_ie * tasa_base + 50.0 * media_global) / (n_ie + 50.0)) * 0.97
            ).round(2)

        tipos_seleccionados = []
        if toggle_rural:
            tipos_seleccionados.append("CON PRESENCIA RURAL")
        if toggle_urbano:
            tipos_seleccionados.append("EXCLUSIVAMENTE URBANO")

        if tipos_seleccionados:
            df_mapa_active = df_mapa_raw[
                df_mapa_raw["TIPO_DISTRITO"].astype(str).str.upper().isin(tipos_seleccionados)
            ].copy()
        else:
            df_mapa_active = df_mapa_raw.iloc[0:0].copy()

        # Agregación departamental y sincronización bidireccional con clics en el mapa
        dept_norm_to_name = {}
        if not df_mapa_active.empty:
            df_mapa_active["DEPT_NORM"] = df_mapa_active["DEPARTAMENTO"].apply(normalize_department_name)
            df_dept_map = (
                df_mapa_active.groupby("DEPT_NORM", as_index=False)
                .agg(
                    DEPARTAMENTO=("DEPARTAMENTO", "first"),
                    TASA_PROM=(tasa_col, "mean"),
                    TOTAL_IE_RURALES=("TOTAL_IE_RURALES", "sum"),
                )
            )
            dept_rates_dict = dict(zip(df_dept_map["DEPT_NORM"], df_dept_map["TASA_PROM"]))
            dept_norm_to_name = dict(zip(df_dept_map["DEPT_NORM"], df_dept_map["DEPARTAMENTO"]))
        else:
            df_dept_map = pd.DataFrame(columns=["DEPT_NORM", "DEPARTAMENTO", "TASA_PROM", "TOTAL_IE_RURALES"])
            dept_rates_dict = {}

        # Capturar selección previa del gráfico antes de instanciar los selectboxes en cascada
        chart_event = st.session_state.get("mapa_peru_chart")
        if isinstance(chart_event, dict):
            pts = chart_event.get("selection", {}).get("points", [])
            if pts:
                clicked_loc = pts[0].get("location")
                if clicked_loc and clicked_loc != st.session_state["_last_map_click"]:
                    matched_depto = dept_norm_to_name.get(clicked_loc)
                    if matched_depto:
                        st.session_state["mapa_depto"] = matched_depto
                        st.session_state["mapa_prov"] = "Todas las provincias"
                        st.session_state["mapa_dist"] = "Todos los distritos"
                        st.session_state["_last_map_click"] = clicked_loc

        st.subheader(f"Mapa Coroplético Departamental ({periodo_activo})")
        if periodo_activo == "2025":
            st.caption("Proyección 2025: suavizado empírico k=50 y escenario base -3%")

        peru_geojson = build_peru_geojson()
        fig_map = px.choropleth(
            df_dept_map,
            geojson=peru_geojson,
            locations="DEPT_NORM",
            featureidkey="id",
            color="TASA_PROM",
            hover_name="DEPARTAMENTO",
            hover_data={"DEPT_NORM": False, "TASA_PROM": ":.2f", "TOTAL_IE_RURALES": ":,"},
            color_continuous_scale=[
                [0.0, "#16A34A"],
                [0.375, "#84CC16"],
                [0.50, "#D97706"],
                [0.625, "#EA580C"],
                [1.0, "#DC2626"],
            ],
            range_color=[0.0, 4.0],
            labels={"TASA_PROM": "Tasa (%)", "TOTAL_IE_RURALES": "IE Rurales"},
        )
        fig_map.update_traces(
            marker_line_width=0.9,
            marker_line_color="#FFFFFF",
        )

        # Resaltar frontera del departamento actualmente seleccionado
        sel_depto_actual = st.session_state.get("mapa_depto", "Todos los departamentos")
        if sel_depto_actual != "Todos los departamentos" and not df_dept_map.empty:
            sel_norm = normalize_department_name(sel_depto_actual)
            df_sel = df_dept_map[df_dept_map["DEPT_NORM"] == sel_norm]
            if not df_sel.empty:
                fig_map.add_trace(
                    go.Choropleth(
                        geojson=peru_geojson,
                        locations=df_sel["DEPT_NORM"],
                        z=df_sel["TASA_PROM"],
                        featureidkey="id",
                        colorscale=[[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]],
                        showscale=False,
                        marker_line_color="#0F2D52",
                        marker_line_width=2.6,
                        hoverinfo="skip",
                    )
                )

        fig_map.update_geos(fitbounds="locations", visible=False)
        fig_map.update_layout(
            margin=dict(t=8, b=8, l=8, r=8),
            height=450,
            paper_bgcolor="#FFFFFF",
            plot_bgcolor="#FFFFFF",
            clickmode="event+select",
            coloraxis_colorbar=dict(title="Tasa (%)"),
        )
        st.plotly_chart(
            fig_map,
            use_container_width=True,
            on_select="rerun",
            selection_mode="points",
            key="mapa_peru_chart",
        )

        # Recuadro fijo tipo leyenda en la esquina inferior izquierda: "MAPA DE CALOR"
        st.markdown(
            """
            <div class="legend-card">
                <div class="legend-title">MAPA DE CALOR</div>
                <div class="legend-row">
                    <span class="legend-swatch" style="background-color:#16A34A;"></span>
                    <span><strong>Verde:</strong> Riesgo Bajo (&lt; 1.5%)</span>
                </div>
                <div class="legend-row">
                    <span class="legend-swatch" style="background-color:#D97706;"></span>
                    <span><strong>Ámbar:</strong> Riesgo Moderado (1.5% - 2.5%)</span>
                </div>
                <div class="legend-row">
                    <span class="legend-swatch" style="background-color:#DC2626;"></span>
                    <span><strong>Rojo Intenso:</strong> Riesgo Crítico (&gt; 2.5%)</span>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # -------------------------------------------------------------------------
    # COLUMNA DERECHA: Cascada DEPARTAMENTO -> PROVINCIA -> DISTRITO + Tabla
    # -------------------------------------------------------------------------
    with col_table:
        deptos_disp = ["Todos los departamentos"] + (
            sorted(df_mapa_active["DEPARTAMENTO"].dropna().unique().tolist())
            if not df_mapa_active.empty
            else []
        )
        if st.session_state["mapa_depto"] not in deptos_disp:
            st.session_state["mapa_depto"] = "Todos los departamentos"
            st.session_state["mapa_prov"] = "Todas las provincias"
            st.session_state["mapa_dist"] = "Todos los distritos"

        bar_c0, bar_c1, bar_c2 = st.columns(3)
        with bar_c0:
            sel_departamento = st.selectbox(
                "DEPARTAMENTO",
                deptos_disp,
                key="mapa_depto",
                on_change=_on_depto_change,
            )

        if sel_departamento != "Todos los departamentos" and not df_mapa_active.empty:
            df_depto_scope = df_mapa_active[df_mapa_active["DEPARTAMENTO"] == sel_departamento]
        else:
            df_depto_scope = df_mapa_active

        provincias_disp = ["Todas las provincias"] + (
            sorted(df_depto_scope["PROVINCIA"].dropna().unique().tolist())
            if not df_depto_scope.empty
            else []
        )
        if st.session_state["mapa_prov"] not in provincias_disp:
            st.session_state["mapa_prov"] = "Todas las provincias"
            st.session_state["mapa_dist"] = "Todos los distritos"

        with bar_c1:
            sel_provincia = st.selectbox(
                "PROVINCIA",
                provincias_disp,
                key="mapa_prov",
                on_change=_on_prov_change,
            )

        if sel_provincia != "Todas las provincias" and not df_depto_scope.empty:
            df_prov_scope = df_depto_scope[df_depto_scope["PROVINCIA"] == sel_provincia]
            distritos_disp = ["Todos los distritos"] + sorted(
                df_prov_scope["DISTRITO"].dropna().unique().tolist()
            )
        else:
            df_prov_scope = df_depto_scope
            distritos_disp = ["Todos los distritos"]

        if st.session_state["mapa_dist"] not in distritos_disp:
            st.session_state["mapa_dist"] = "Todos los distritos"

        with bar_c2:
            sel_distrito = st.selectbox(
                "DISTRITO",
                distritos_disp,
                key="mapa_dist",
                disabled=(sel_provincia == "Todas las provincias"),
            )

        act_c1, act_c2 = st.columns(2)
        with act_c2:
            fs_label = "Salir Pantalla Completa" if st.session_state["mapa_fullscreen"] else "Pantalla Completa"
            if st.button(fs_label, use_container_width=True):
                st.session_state["mapa_fullscreen"] = not st.session_state["mapa_fullscreen"]
                st.rerun()

        # Construcción de Tabla Dinámica en 4 Niveles ordenada descendente por Tasa Total
        rurality_info = None
        if df_mapa_active.empty:
            nivel_agrupacion = "Sin registros activos"
            df_display = pd.DataFrame(
                columns=["Ubicación", "IE Rurales", "Primaria (%)", "Secundaria (%)", "Tasa Total (%)"]
            )
        elif sel_departamento == "Todos los departamentos" and sel_provincia == "Todas las provincias":
            nivel_agrupacion = "Nivel 1: Departamental (25 Departamentos)"
            agg_dict = {
                "TOTAL_IE_RURALES": ("TOTAL_IE_RURALES", "sum"),
                "PRIMARIA_PCT": ("PRIMARIA_PCT", "mean"),
                "SECUNDARIA_PCT": ("SECUNDARIA_PCT", "mean"),
                "TASA_TOTAL": (tasa_col, "mean"),
            }
            if periodo_activo == "2025" and "DESERTORES_2025" in df_mapa_active.columns:
                agg_dict["DESERTORES_2025"] = ("DESERTORES_2025", "sum")

            df_display = (
                df_mapa_active.groupby("DEPARTAMENTO", as_index=False)
                .agg(**agg_dict)
                .sort_values("TASA_TOTAL", ascending=False)
                .rename(
                    columns={
                        "DEPARTAMENTO": "Ubicación",
                        "TOTAL_IE_RURALES": "IE Rurales",
                        "PRIMARIA_PCT": "Primaria (%)",
                        "SECUNDARIA_PCT": "Secundaria (%)",
                        "TASA_TOTAL": "Tasa Total (%)",
                        "DESERTORES_2025": "Desertores 2025",
                    }
                )
            )
        elif sel_provincia == "Todas las provincias":
            nivel_agrupacion = f"Nivel 2: Provincias de {sel_departamento}"
            agg_dict = {
                "TOTAL_IE_RURALES": ("TOTAL_IE_RURALES", "sum"),
                "PRIMARIA_PCT": ("PRIMARIA_PCT", "mean"),
                "SECUNDARIA_PCT": ("SECUNDARIA_PCT", "mean"),
                "TASA_TOTAL": (tasa_col, "mean"),
            }
            if periodo_activo == "2025" and "DESERTORES_2025" in df_depto_scope.columns:
                agg_dict["DESERTORES_2025"] = ("DESERTORES_2025", "sum")

            df_display = (
                df_depto_scope.groupby("PROVINCIA", as_index=False)
                .agg(**agg_dict)
                .sort_values("TASA_TOTAL", ascending=False)
                .rename(
                    columns={
                        "PROVINCIA": "Ubicación",
                        "TOTAL_IE_RURALES": "IE Rurales",
                        "PRIMARIA_PCT": "Primaria (%)",
                        "SECUNDARIA_PCT": "Secundaria (%)",
                        "TASA_TOTAL": "Tasa Total (%)",
                        "DESERTORES_2025": "Desertores 2025",
                    }
                )
            )
        elif sel_distrito == "Todos los distritos":
            nivel_agrupacion = f"Nivel 3: Distritos de la Provincia {sel_provincia}"
            cols_sel = ["DISTRITO", "TOTAL_IE_RURALES", "PRIMARIA_PCT", "SECUNDARIA_PCT", tasa_col]
            if periodo_activo == "2025" and "DESERTORES_2025" in df_prov_scope.columns:
                cols_sel.append("DESERTORES_2025")

            df_display = (
                df_prov_scope[cols_sel]
                .sort_values(tasa_col, ascending=False)
                .rename(
                    columns={
                        "DISTRITO": "Ubicación",
                        "TOTAL_IE_RURALES": "IE Rurales",
                        "PRIMARIA_PCT": "Primaria (%)",
                        "SECUNDARIA_PCT": "Secundaria (%)",
                        tasa_col: "Tasa Total (%)",
                        "DESERTORES_2025": "Desertores 2025",
                    }
                )
            )
        else:
            nivel_agrupacion = f"Nivel 4: Detalle del Distrito {sel_distrito}"
            df_sub = df_prov_scope[df_prov_scope["DISTRITO"] == sel_distrito].copy()

            cols_sel = ["DISTRITO", "TOTAL_IE_RURALES", "PRIMARIA_PCT", "SECUNDARIA_PCT", tasa_col]
            if periodo_activo == "2025" and "DESERTORES_2025" in df_sub.columns:
                cols_sel.append("DESERTORES_2025")

            df_display = (
                df_sub[cols_sel]
                .sort_values(tasa_col, ascending=False)
                .rename(
                    columns={
                        "DISTRITO": "Ubicación",
                        "TOTAL_IE_RURALES": "IE Rurales",
                        "PRIMARIA_PCT": "Primaria (%)",
                        "SECUNDARIA_PCT": "Secundaria (%)",
                        tasa_col: "Tasa Total (%)",
                        "DESERTORES_2025": "Desertores 2025",
                    }
                )
            )
            if not df_sub.empty:
                rurality_info = {
                    "CANT_RURAL_1": int(df_sub["CANT_RURAL_1"].sum()) if "CANT_RURAL_1" in df_sub.columns else 0,
                    "CANT_RURAL_2": int(df_sub["CANT_RURAL_2"].sum()) if "CANT_RURAL_2" in df_sub.columns else 0,
                    "CANT_RURAL_3": int(df_sub["CANT_RURAL_3"].sum()) if "CANT_RURAL_3" in df_sub.columns else 0,
                }

        mapa_pdf_bytes = generate_mapa_desercion_pdf(
            toggles_activos=tipos_seleccionados,
            periodo=periodo_activo,
            departamento_seleccionado=sel_departamento,
            provincia_seleccionada=sel_provincia,
            distrito_seleccionado=sel_distrito,
            nivel_agrupacion=nivel_agrupacion,
            dept_rates=dept_rates_dict,
            df_tabla=df_display,
            rurality_breakdown=rurality_info,
        )

        with act_c1:
            st.download_button(
                label="GUARDAR PDF",
                data=mapa_pdf_bytes,
                file_name=f"Mapa_Desercion_ACR_{periodo_activo}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
                mime="application/pdf",
                disabled=df_display.empty,
                use_container_width=True,
            )

        st.markdown(f"**{nivel_agrupacion}**")

        if df_display.empty:
            st.info("Active al menos un filtro de tipo de distrito para visualizar la tabla territorial.")
        else:
            def _highlight_critical(row: pd.Series):
                is_high = float(row.get("Tasa Total (%)", 0.0)) > 2.5
                style = "background-color: #FEE2E2; color: #991B1B; font-weight: 600;" if is_high else ""
                return [style for _ in row]

            format_dict = {
                "IE Rurales": "{:,.0f}",
                "Primaria (%)": "{:.2f}%",
                "Secundaria (%)": "{:.2f}%",
                "Tasa Total (%)": "{:.2f}%",
            }
            if "Desertores 2025" in df_display.columns:
                format_dict["Desertores 2025"] = "{:,.0f}"

            styled_df = df_display.style.apply(_highlight_critical, axis=1).format(format_dict)
            st.dataframe(styled_df, use_container_width=True, hide_index=True, height=430)

            if rurality_info is not None:
                st.markdown("**Desglose de Colegios por Grado de Ruralidad**")
                rc1, rc2, rc3 = st.columns(3)
                rc1.metric("Ruralidad 1 (CANT_RURAL_1)", f"{rurality_info['CANT_RURAL_1']:,}")
                rc2.metric("Ruralidad 2 (CANT_RURAL_2)", f"{rurality_info['CANT_RURAL_2']:,}")
                rc3.metric("Ruralidad 3 (CANT_RURAL_3)", f"{rurality_info['CANT_RURAL_3']:,}")

# =============================================================================
# PESTAÑA 3: MODELO RANDOM FOREST
# =============================================================================
with tab_ia:
    df_high_risk = classify_high_risk_districts(df_enriched, rf_artifacts["pipeline"])
    rf_pdf_bytes = generate_rf_evaluation_pdf(rf_artifacts, df_high_risk)

    rf_head_left, rf_head_right = st.columns([3.2, 1.1], vertical_alignment="center")
    with rf_head_left:
        st.header("Modelo Predictivo Random Forest Multiclase")
        st.caption(
            "Entrenado con caché persistente (@st.cache_resource) e hiperparámetros regularizados "
            "(n_estimators=100, max_depth=7, min_samples_leaf=25, class_weight='balanced'). "
            f"Excluidas contra fuga de información: {', '.join(LEAKAGE_EXCLUDED_COLUMNS)}."
        )
    with rf_head_right:
        st.download_button(
            label="Exportar Evaluación RF (PDF)",
            data=rf_pdf_bytes,
            file_name=f"Evaluacion_RandomForest_ACR_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
            mime="application/pdf",
            use_container_width=True,
        )

    m1, m2, m3, m4 = st.columns(4)
    m1.metric(
        "Accuracy (Holdout 20%)",
        f"{rf_artifacts['accuracy'] * 100:.2f}%",
        delta="test_size=0.2 · stratify=y",
        delta_color="off",
    )
    m2.metric(
        "F1-Score Macro",
        f"{rf_artifacts['f1_macro'] * 100:.2f}%",
        delta="class_weight='balanced'",
        delta_color="off",
    )
    m3.metric(
        f"Validación Cruzada ({rf_artifacts['cv_folds']}-Folds)",
        f"{rf_artifacts['cv_accuracy_mean'] * 100:.2f}%",
        delta=f"±{rf_artifacts['cv_accuracy_std'] * 100:.2f}% · F1 CV {rf_artifacts['cv_f1_macro_mean'] * 100:.1f}%",
        delta_color="off",
    )
    m4.metric(
        "Tamaño Train / Test",
        f"{rf_artifacts['n_train']:,} / {rf_artifacts['n_test']:,}",
        delta=f"{rf_artifacts['n_estimators']} árboles · depth={rf_artifacts['max_depth']} · leaf>={rf_artifacts['min_samples_leaf']}",
        delta_color="off",
    )

    ai_left, ai_right = st.columns([1.05, 0.95], gap="large")

    with ai_left:
        fig_imp = px.bar(
            rf_artifacts["feature_importances"].sort_values("importance", ascending=True),
            x="importance",
            y="feature_label",
            orientation="h",
            labels={"importance": "Importancia Gini", "feature_label": "Variable de Infraestructura"},
            color_discrete_sequence=["#0F2D52"],
        )
        fig_imp.update_layout(
            title="Importancia de Variables de Infraestructura (Gini)",
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
            margin=dict(t=40, b=16, l=16, r=16),
            height=300,
        )
        st.plotly_chart(fig_imp, use_container_width=True)

        st.subheader("Matriz de Confusión Multiclase (Conjunto de Prueba 20%)")
        cm_df = pd.DataFrame(
            rf_artifacts["confusion_matrix"],
            index=[f"Real: {lbl}" for lbl in rf_artifacts["labels"]],
            columns=[f"Pred: {lbl}" for lbl in rf_artifacts["labels"]],
        )
        st.dataframe(cm_df, use_container_width=True)

    with ai_right:
        st.subheader("Simulador de Escenarios What-If")
        observed_ruralidades = [
            r for r in df_raw["GRADIENTE_RURALIDAD"].dropna().unique().tolist() if r
        ]
        ruralidades_sim = [r for r in RURALIDAD_ORDEN if r in observed_ruralidades] or RURALIDAD_ORDEN
        for extra_r in sorted(observed_ruralidades):
            if extra_r not in ruralidades_sim:
                ruralidades_sim.append(extra_r)

        with st.form("what_if_form"):
            in_total = st.slider("Computadoras Totales del Local (COMPUTADORAS_TOTAL)", 0, 80, 18)
            in_oper = st.slider("Computadoras Operativas (COMPUTADORAS_OPERATIVAS)", 0, 80, 8)
            in_ruralidad = st.selectbox("Gradiente de Ruralidad (MINEDU)", ruralidades_sim)
            st.caption(describe_ruralidad(in_ruralidad))
            tg_c1, tg_c2 = st.columns(2)
            with tg_c1:
                in_red = st.toggle("Equipamiento de Red (Router/Módem)", value=True)
            with tg_c2:
                in_energia = st.toggle("Respaldo Energético (UPS/Panel Solar)", value=True)
            st.form_submit_button("Evaluar Riesgo del Local")

        pred = predict_what_if(
            rf_artifacts["pipeline"],
            computadoras_total=in_total,
            computadoras_operativas=min(in_oper, in_total),
            gradiente_ruralidad=in_ruralidad,
            tiene_equipo_red=int(in_red),
            tiene_soporte_energia=int(in_energia),
        )
        st.markdown(f"**Nivel de Riesgo Predicho:** {pred['predicted_class']}")

        prob_df = pd.DataFrame(
            {
                "Clase": list(pred["probabilities"].keys()),
                "Probabilidad (%)": [v * 100 for v in pred["probabilities"].values()],
            }
        )
        fig_prob = go.Figure(
            go.Bar(
                x=prob_df["Probabilidad (%)"],
                y=prob_df["Clase"],
                orientation="h",
                marker_color=[COLOR_SEMAFORO[c] for c in prob_df["Clase"]],
                text=[f"{v:.1f}%" for v in prob_df["Probabilidad (%)"]],
                textposition="auto",
            )
        )
        fig_prob.update_layout(
            height=170,
            margin=dict(t=8, b=8, l=8, r=8),
            xaxis=dict(range=[0, 100]),
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
        )
        st.plotly_chart(fig_prob, use_container_width=True)

        st.markdown("**Factores determinantes detectados:**")
        for driver in pred["risk_drivers"]:
            st.markdown(f"- {driver}")

    st.markdown("---")
    st.subheader("Locales y Distritos Clasificados en Riesgo Alto (Modelo Random Forest)")
    if df_high_risk.empty:
        st.info("No se detectaron registros clasificados en riesgo alto.")
    else:
        st.caption(
            f"Total clasificado en Riesgo Alto (Rojo): {len(df_high_risk):,} locales · "
            "Se visualizan los primeros 200 ordenados por probabilidad de riesgo."
        )
        df_hr_view = (
            df_high_risk.head(200)[
                [
                    "CODGEO",
                    "DEPARTAMENTO",
                    "PROVINCIA_UGEL",
                    "DISTRITO",
                    "CODLOCAL",
                    "GRADIENTE_RURALIDAD",
                    "COMPUTADORAS_OPERATIVAS",
                    "COMPUTADORAS_TOTAL",
                    "TIENE_EQUIPO_RED",
                    "TIENE_SOPORTE_ENERGIA",
                    "PCT_OPERATIVIDAD",
                    "PROBABILIDAD_RIESGO_ALTO",
                    "NIVEL_RIESGO_RF",
                ]
            ].rename(
                columns={
                    "CODGEO": "CODGEO",
                    "DEPARTAMENTO": "Departamento",
                    "PROVINCIA_UGEL": "Provincia / UGEL",
                    "DISTRITO": "Distrito",
                    "CODLOCAL": "CODLOCAL",
                    "GRADIENTE_RURALIDAD": "Gradiente Ruralidad",
                    "COMPUTADORAS_OPERATIVAS": "PCs Operativas",
                    "COMPUTADORAS_TOTAL": "PCs Total",
                    "TIENE_EQUIPO_RED": "Equipo Red",
                    "TIENE_SOPORTE_ENERGIA": "Soporte Energía",
                    "PCT_OPERATIVIDAD": "% Operatividad",
                    "PROBABILIDAD_RIESGO_ALTO": "Prob. Riesgo Alto (%)",
                    "NIVEL_RIESGO_RF": "Clasificación RF",
                }
            )
        )
        st.dataframe(df_hr_view, use_container_width=True, hide_index=True)
