# -*- coding: utf-8 -*-
"""
Generador de Reportes Ejecutivos y Territoriales en PDF mediante ReportLab (BytesIO).
Proyecto: AULA CONECTADA RURAL — Universidad César Vallejo / MINEDU
"""

from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List

import pandas as pd
from reportlab.graphics.shapes import Drawing, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from peru_geo import iter_department_outer_rings, normalize_department_name


def _risk_color_for_rate(rate: float) -> colors.Color:
    if rate > 2.5:
        return colors.HexColor("#DC2626")
    if rate >= 1.5:
        return colors.HexColor("#D97706")
    return colors.HexColor("#16A34A")


def _build_peru_heatmap_drawing(dept_rates: Dict[str, float], width: float = 480.0, height: float = 255.0) -> Drawing:
    """
    Genera una representación vectorial estática del Mapa de Calor del Perú por
    departamentos junto con el recuadro de leyenda 'MAPA DE CALOR'.
    """
    drawing = Drawing(width, height)
    drawing.add(Rect(0, 0, width, height, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#CBD5E1"), strokeWidth=0.75))

    # Proyección lineal centrada a la derecha del cuadro de leyenda
    min_lon, max_lon = -81.45, -68.55
    min_lat, max_lat = -18.45, 0.05
    map_x0 = 185.0
    map_w = width - map_x0 - 20.0
    map_y0 = 14.0
    map_h = height - 28.0

    scale = min(map_w / (max_lon - min_lon), map_h / (max_lat - min_lat))
    offset_x = map_x0 + (map_w - (max_lon - min_lon) * scale) / 2.0
    offset_y = map_y0 + (map_h - (max_lat - min_lat) * scale) / 2.0

    for dept_key, coords in iter_department_outer_rings():
        pts: List[float] = []
        for lon, lat in coords:
            px = offset_x + (lon - min_lon) * scale
            py = offset_y + (lat - min_lat) * scale
            pts.extend([px, py])
        rate = dept_rates.get(dept_key)
        fill = _risk_color_for_rate(rate) if rate is not None else colors.HexColor("#E2E8F0")
        drawing.add(
            Polygon(
                pts,
                fillColor=fill,
                strokeColor=colors.white,
                strokeWidth=0.5,
            )
        )

    # Recuadro de leyenda fijo en la esquina inferior izquierda: "MAPA DE CALOR"
    leg_x, leg_y, leg_w, leg_h = 12, 12, 165, 84
    drawing.add(
        Rect(
            leg_x,
            leg_y,
            leg_w,
            leg_h,
            fillColor=colors.white,
            strokeColor=colors.HexColor("#94A3B8"),
            strokeWidth=0.75,
        )
    )
    drawing.add(String(leg_x + 8, leg_y + leg_h - 15, "MAPA DE CALOR", fontName="Helvetica-Bold", fontSize=8.5, fillColor=colors.HexColor("#0F2D52")))

    legend_items = [
        ("#16A34A", "Verde: Riesgo Bajo (< 1.5%)"),
        ("#D97706", "Ambar: Riesgo Moderado (1.5% - 2.5%)"),
        ("#DC2626", "Rojo Intenso: Riesgo Critico (> 2.5%)"),
    ]
    for idx, (hex_col, text_label) in enumerate(legend_items):
        row_y = leg_y + leg_h - 33 - idx * 18
        drawing.add(Rect(leg_x + 8, row_y, 9, 9, fillColor=colors.HexColor(hex_col), strokeColor=None))
        drawing.add(String(leg_x + 22, row_y + 1.5, text_label, fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#1E293B")))

    return drawing


def generate_executive_pdf(
    filtros: Dict[str, str],
    kpis: Dict[str, Any],
    df_ranked: pd.DataFrame,
) -> bytes:
    """Reporte Ejecutivo PDF para la pestaña Panel Analítico (ReportLab BytesIO)."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=42,
        bottomMargin=42,
        title="AULA CONECTADA RURAL - Reporte Ejecutivo",
    )

    styles = getSampleStyleSheet()
    usable_width = doc.width

    title_style = ParagraphStyle(
        "ACRTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F2D52"),
        spaceAfter=6,
    )
    meta_right_style = ParagraphStyle(
        "ACRMetaRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14,
    )
    subtitle_style = ParagraphStyle(
        "ACRSubtitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#0F2D52"),
        spaceBefore=8,
        spaceAfter=6,
    )
    body_justify_style = ParagraphStyle(
        "ACRBodyJustify",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8,
    )
    cell_left_style = ParagraphStyle(
        "ACRCellLeft",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#0F172A"),
    )
    cell_center_style = ParagraphStyle(
        "ACRCellCenter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F172A"),
    )
    kpi_header_style = ParagraphStyle(
        "ACRKpiHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F172A"),
    )
    kpi_value_style = ParagraphStyle(
        "ACRKpiValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F2D52"),
    )

    elements = [
        Paragraph("AULA CONECTADA RURAL - Reporte Ejecutivo", title_style),
        Paragraph(
            f"Fecha de generaci&oacute;n: {datetime.now().strftime('%d/%m/%Y %H:%M')}<br/>"
            "Base de datos Proyecto_ACR, vista dbo.vw_Dashboard_ACR",
            meta_right_style,
        ),
        Paragraph("Filtros Activos", subtitle_style),
    ]

    filtros_data = [
        [
            Paragraph(f"<b>Departamento:</b> {filtros.get('departamento', 'Todos')}", cell_left_style),
            Paragraph(f"<b>Provincia/UGEL:</b> {filtros.get('provincia_ugel', 'Todas')}", cell_left_style),
        ],
        [
            Paragraph(f"<b>Nivel Educativo:</b> {filtros.get('nivel_educativo', 'Todos')}", cell_left_style),
            Paragraph(f"<b>Gradiente de Ruralidad:</b> {filtros.get('ruralidad', 'Todas')}", cell_left_style),
        ],
    ]
    filtros_table = Table(filtros_data, colWidths=[usable_width * 0.50, usable_width * 0.50])
    filtros_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    elements.append(filtros_table)
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Indicadores Clave (KPIs)", subtitle_style))

    kpi_table = Table(
        [
            [
                Paragraph("Tasa de Deserci&oacute;n", kpi_header_style),
                Paragraph("Porcentaje de Equipos Operativos", kpi_header_style),
                Paragraph("Promedio PCs Operativas / Local", kpi_header_style),
                Paragraph("Distritos en Alerta Roja", kpi_header_style),
            ],
            [
                Paragraph(f"{float(kpis.get('tasa_desercion', 0.0)):.2f}%", kpi_value_style),
                Paragraph(f"{float(kpis.get('equipos_operativos', 0.0)):.1f}%", kpi_value_style),
                Paragraph(f"{float(kpis.get('pcs_operativas_por_local', 0.0)):.1f}", kpi_value_style),
                Paragraph(f"{int(kpis.get('distritos_alerta_roja', 0))}", kpi_value_style),
            ],
        ],
        colWidths=[usable_width * 0.25] * 4,
    )
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(kpi_table)
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Clasificación de Riesgo - Modelo Random Forest", subtitle_style))
    elements.append(
        Paragraph(
            "Listado de los 10 distritos prioritarios ordenados por su tasa promedio de deserci&oacute;n "
            "combinada (Primaria y Secundaria), incorporando el nivel de riesgo clasificado por el modelo "
            "supervisado Random Forest a partir de equipamiento de c&oacute;mputo y ruralidad.",
            body_justify_style,
        )
    )

    rf_rows = [
        [
            Paragraph("<b>Departamento</b>", cell_left_style),
            Paragraph("<b>Distrito</b>", cell_left_style),
            Paragraph("<b>Tasa de Deserci&oacute;n</b>", cell_center_style),
            Paragraph("<b>Nivel de Riesgo</b>", cell_center_style),
        ]
    ]

    if not df_ranked.empty:
        top10 = (
            df_ranked.sort_values(by=["TASA_DESERCION_PCT"], ascending=[False])
            .drop_duplicates(subset=["CODGEO", "DISTRITO"])
            .head(10)
        )
        for _, row in top10.iterrows():
            riesgo = str(row.get("RIESGO_RF") or row.get("SEMAFORO", "Amarillo"))
            color_hex = "#B91C1C" if riesgo == "Rojo" else ("#B45309" if riesgo == "Amarillo" else "#15803D")
            rf_rows.append(
                [
                    Paragraph(str(row["DEPARTAMENTO"]), cell_left_style),
                    Paragraph(str(row["DISTRITO"]), cell_left_style),
                    Paragraph(f"{float(row['TASA_DESERCION_PCT']):.2f}%", cell_center_style),
                    Paragraph(f'<font color="{color_hex}"><b>{riesgo}</b></font>', cell_center_style),
                ]
            )

    rf_table = Table(
        rf_rows,
        colWidths=[usable_width * 0.25, usable_width * 0.35, usable_width * 0.20, usable_width * 0.20],
        repeatRows=1,
    )
    rf_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.append(rf_table)
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_mapa_desercion_pdf(
    toggles_activos: List[str],
    periodo: str,
    departamento_seleccionado: str,
    provincia_seleccionada: str,
    distrito_seleccionado: str,
    nivel_agrupacion: str,
    dept_rates: Dict[str, float],
    df_tabla: pd.DataFrame,
    rurality_breakdown: Dict[str, Any] = None,
) -> bytes:
    """
    Genera en memoria (BytesIO) el reporte territorial del Mapa de Deserción con
    toggles activos, periodo, nivel de agrupación, mapa vectorial + leyenda y tabla exacta.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=38,
        bottomMargin=38,
        title="AULA CONECTADA RURAL - Mapa Territorial de Deserción",
    )

    styles = getSampleStyleSheet()
    usable_width = doc.width

    title_style = ParagraphStyle(
        "MapTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F2D52"),
        spaceAfter=4,
    )
    meta_style = ParagraphStyle(
        "MapMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#475569"),
        spaceAfter=10,
    )
    subtitle_style = ParagraphStyle(
        "MapSub",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#0F2D52"),
        spaceBefore=8,
        spaceAfter=5,
    )
    cell_left = ParagraphStyle("MapCellL", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10.5, alignment=TA_LEFT, textColor=colors.HexColor("#0F172A"))
    cell_right = ParagraphStyle("MapCellR", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10.5, alignment=TA_RIGHT, textColor=colors.HexColor("#0F172A"))
    cell_center = ParagraphStyle("MapCellC", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10.5, alignment=TA_CENTER, textColor=colors.HexColor("#0F172A"))

    elements = [
        Paragraph("AULA CONECTADA RURAL - Mapa Territorial de Deserción", title_style),
        Paragraph(
            f"Fecha de generaci&oacute;n: {datetime.now().strftime('%d/%m/%Y %H:%M')}<br/>"
            "Base de datos Proyecto_ACR, vista dbo.vw_Mapa_Desercion_ACR",
            meta_style,
        ),
        Paragraph("Parámetros de Consulta Activos", subtitle_style),
    ]

    toggles_text = ", ".join(toggles_activos) if toggles_activos else "Ninguno"
    params_table = Table(
        [
            [
                Paragraph(f"<b>Departamento:</b> {departamento_seleccionado}", cell_left),
                Paragraph(f"<b>Provincia:</b> {provincia_seleccionada}", cell_left),
            ],
            [
                Paragraph(f"<b>Distrito:</b> {distrito_seleccionado}", cell_left),
                Paragraph(f"<b>Periodo:</b> {periodo}", cell_left),
            ],
            [
                Paragraph(f"<b>Toggles Activos:</b> {toggles_text}", cell_left),
                Paragraph(f"<b>Nivel de Agrupaci&oacute;n:</b> {nivel_agrupacion}", cell_left),
            ],
        ],
        colWidths=[usable_width * 0.50, usable_width * 0.50],
    )
    params_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.append(params_table)
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Mapa Coroplético Departamental", subtitle_style))

    normalized_rates = {normalize_department_name(k): float(v) for k, v in dept_rates.items()}
    elements.append(_build_peru_heatmap_drawing(normalized_rates, width=usable_width, height=235.0))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Tabla Dinámica Territorial ({nivel_agrupacion})", subtitle_style))

    headers = list(df_tabla.columns)
    n_cols = max(len(headers), 1)
    col_widths = [usable_width * 0.30] + [usable_width * (0.70 / max(n_cols - 1, 1))] * (n_cols - 1)

    table_data = [[Paragraph(f"<b>{h}</b>", cell_center if idx > 0 else cell_left) for idx, h in enumerate(headers)]]
    highlight_rows = []
    for r_idx, (_, row) in enumerate(df_tabla.iterrows(), start=1):
        row_cells = []
        tasa_val = float(row.get("Tasa Total (%)", 0.0))
        if tasa_val > 2.5:
            highlight_rows.append(r_idx)
        for c_idx, col_name in enumerate(headers):
            val = row[col_name]
            if isinstance(val, float):
                txt = f"{val:.2f}%" if "%" in col_name else f"{val:,.0f}"
                row_cells.append(Paragraph(txt, cell_right))
            elif isinstance(val, int):
                row_cells.append(Paragraph(f"{val:,}", cell_right))
            else:
                row_cells.append(Paragraph(str(val), cell_left))
        table_data.append(row_cells)

    data_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for hr in highlight_rows:
        style_cmds.append(("BACKGROUND", (0, hr), (-1, hr), colors.HexColor("#FEE2E2")))

    data_table.setStyle(TableStyle(style_cmds))
    elements.append(data_table)

    if rurality_breakdown:
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Desglose de Instituciones Educativas por Grado de Ruralidad", subtitle_style))
        r_table = Table(
            [
                [
                    Paragraph("<b>Ruralidad Extrema (Rural 1)</b>", cell_center),
                    Paragraph("<b>Ruralidad Intermedia (Rural 2)</b>", cell_center),
                    Paragraph("<b>Ruralidad Menor Dispersi&oacute;n (Rural 3)</b>", cell_center),
                ],
                [
                    Paragraph(str(rurality_breakdown.get("CANT_RURAL_1", 0)), cell_center),
                    Paragraph(str(rurality_breakdown.get("CANT_RURAL_2", 0)), cell_center),
                    Paragraph(str(rurality_breakdown.get("CANT_RURAL_3", 0)), cell_center),
                ],
            ],
            colWidths=[usable_width / 3.0] * 3,
        )
        r_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(r_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_rf_evaluation_pdf(
    rf_artifacts: Dict[str, Any],
    df_high_risk: pd.DataFrame,
) -> bytes:
    """
    Genera en memoria (BytesIO) el reporte ejecutivo de evaluación del Modelo Random Forest
    Multiclase incluyendo métricas de validación (Holdout + 5-Folds CV), tabla de
    Importancia de Variables, Matriz de Confusión y Top 15 de locales/distritos en riesgo alto.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=38,
        bottomMargin=38,
        title="AULA CONECTADA RURAL - Evaluación del Modelo Random Forest",
    )

    styles = getSampleStyleSheet()
    usable_width = doc.width

    title_style = ParagraphStyle(
        "RFTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F2D52"),
        spaceAfter=4,
    )
    meta_style = ParagraphStyle(
        "RFMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#475569"),
        spaceAfter=10,
    )
    subtitle_style = ParagraphStyle(
        "RFSubtitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#0F2D52"),
        spaceBefore=10,
        spaceAfter=5,
    )
    body_style = ParagraphStyle(
        "RFBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )
    cell_left = ParagraphStyle("RFCellL", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10.5, alignment=TA_LEFT, textColor=colors.HexColor("#0F172A"))
    cell_center = ParagraphStyle("RFCellC", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10.5, alignment=TA_CENTER, textColor=colors.HexColor("#0F172A"))
    cell_right = ParagraphStyle("RFCellR", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10.5, alignment=TA_RIGHT, textColor=colors.HexColor("#0F172A"))
    kpi_head = ParagraphStyle("RFKpiH", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10.5, alignment=TA_CENTER, textColor=colors.HexColor("#0F172A"))
    kpi_val = ParagraphStyle("RFKpiV", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=14, alignment=TA_CENTER, textColor=colors.HexColor("#0F2D52"))

    n_train = int(rf_artifacts.get("n_train", 0))
    n_test = int(rf_artifacts.get("n_test", 0))
    cv_folds = int(rf_artifacts.get("cv_folds", 5))
    cv_acc = float(rf_artifacts.get("cv_accuracy_mean", rf_artifacts.get("accuracy", 0.0))) * 100.0
    cv_std = float(rf_artifacts.get("cv_accuracy_std", 0.0)) * 100.0

    elements = [
        Paragraph("AULA CONECTADA RURAL - Evaluaci&oacute;n del Modelo Random Forest", title_style),
        Paragraph(
            f"Fecha de generaci&oacute;n: {datetime.now().strftime('%d/%m/%Y %H:%M')}<br/>"
            "Base de datos Proyecto_ACR, vista dbo.vw_Dashboard_ACR · Auditor&iacute;a Anti-Leakage activa",
            meta_style,
        ),
        Paragraph(
            f"Modelo supervisado multiclase (Rojo, Amarillo, Verde) regularizado para evitar sobreajuste: "
            f"n_estimators={rf_artifacts.get('n_estimators', 100)}, max_depth={rf_artifacts.get('max_depth', 7)}, "
            f"min_samples_leaf={rf_artifacts.get('min_samples_leaf', 25)}, class_weight='balanced', "
            f"partici&oacute;n estratificada 80/20 (n_train={n_train:,}, n_test={n_test:,}).",
            body_style,
        ),
        Paragraph("1. M&eacute;tricas de Validaci&oacute;n", subtitle_style),
    ]

    metrics_table = Table(
        [
            [
                Paragraph("Accuracy (Holdout 20%)", kpi_head),
                Paragraph("F1-Score Macro", kpi_head),
                Paragraph(f"Validaci&oacute;n Cruzada ({cv_folds}-Folds)", kpi_head),
                Paragraph("Muestra Entrenamiento / Prueba", kpi_head),
            ],
            [
                Paragraph(f"{float(rf_artifacts.get('accuracy', 0.0)) * 100:.2f}%", kpi_val),
                Paragraph(f"{float(rf_artifacts.get('f1_macro', 0.0)) * 100:.2f}%", kpi_val),
                Paragraph(f"{cv_acc:.2f}% (&plusmn;{cv_std:.2f}%)", kpi_val),
                Paragraph(f"{n_train:,} / {n_test:,}", kpi_val),
            ],
        ],
        colWidths=[usable_width * 0.25] * 4,
    )
    metrics_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.append(metrics_table)
    elements.append(Spacer(1, 8))

    # 2. Importancia de Variables
    elements.append(Paragraph("2. Tabla de Importancia de Variables (Impureza Gini)", subtitle_style))
    imp_df = rf_artifacts.get("feature_importances", pd.DataFrame())
    imp_rows = [[Paragraph("<b>Variable Predictora</b>", cell_left), Paragraph("<b>Importancia (%)</b>", cell_right)]]
    if isinstance(imp_df, pd.DataFrame) and not imp_df.empty:
        for _, r in imp_df.iterrows():
            imp_rows.append(
                [
                    Paragraph(str(r.get("feature_label", r.get("feature", ""))), cell_left),
                    Paragraph(f"{float(r.get('importance', 0.0)) * 100:.2f}%", cell_right),
                ]
            )
    imp_table = Table(imp_rows, colWidths=[usable_width * 0.75, usable_width * 0.25], repeatRows=1)
    imp_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.append(imp_table)
    elements.append(Spacer(1, 8))

    # 3. Matriz de Confusión
    elements.append(Paragraph("3. Matriz de Confusi&oacute;n Multiclase (Conjunto de Prueba 20%)", subtitle_style))
    labels = rf_artifacts.get("labels", ["Rojo", "Amarillo", "Verde"])
    cm = rf_artifacts.get("confusion_matrix", [[0, 0, 0], [0, 0, 0], [0, 0, 0]])
    cm_rows = [
        [Paragraph("<b>Real \\ Predicho</b>", cell_left)] + [Paragraph(f"<b>{lbl}</b>", cell_center) for lbl in labels]
    ]
    for i, real_lbl in enumerate(labels):
        row_cells = [Paragraph(f"<b>{real_lbl}</b>", cell_left)]
        for j in range(len(labels)):
            val = int(cm[i][j])
            row_cells.append(Paragraph(f"{val:,}", cell_center))
        cm_rows.append(row_cells)

    cm_table = Table(cm_rows, colWidths=[usable_width * 0.28] + [usable_width * 0.24] * 3)
    cm_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for d in range(1, len(labels) + 1):
        cm_styles.append(("BACKGROUND", (d, d), (d, d), colors.HexColor("#EFF6FF")))
    cm_table.setStyle(TableStyle(cm_styles))
    elements.append(cm_table)
    elements.append(Spacer(1, 8))

    # 4. Top 15 Locales / Distritos con Mayor Probabilidad de Riesgo Alto
    elements.append(Paragraph("4. Top 15 Locales y Distritos con Mayor Probabilidad de Riesgo Alto", subtitle_style))
    top15_rows = [
        [
            Paragraph("<b>CODGEO</b>", cell_center),
            Paragraph("<b>CODLOCAL</b>", cell_center),
            Paragraph("<b>Departamento</b>", cell_left),
            Paragraph("<b>Distrito</b>", cell_left),
            Paragraph("<b>Ruralidad</b>", cell_center),
            Paragraph("<b>PCs Op./Tot.</b>", cell_center),
            Paragraph("<b>Prob. Alto</b>", cell_right),
        ]
    ]
    if isinstance(df_high_risk, pd.DataFrame) and not df_high_risk.empty:
        top15 = df_high_risk.head(15)
        for _, r in top15.iterrows():
            op = int(float(r.get("COMPUTADORAS_OPERATIVAS", 0)))
            tot = int(float(r.get("COMPUTADORAS_TOTAL", 0)))
            prob = float(r.get("PROBABILIDAD_RIESGO_ALTO", 0.0))
            top15_rows.append(
                [
                    Paragraph(str(r.get("CODGEO", "")), cell_center),
                    Paragraph(str(r.get("CODLOCAL", "")), cell_center),
                    Paragraph(str(r.get("DEPARTAMENTO", "")), cell_left),
                    Paragraph(str(r.get("DISTRITO", "")), cell_left),
                    Paragraph(str(r.get("GRADIENTE_RURALIDAD", "")), cell_center),
                    Paragraph(f"{op} / {tot}", cell_center),
                    Paragraph(f'<font color="#B91C1C"><b>{prob:.1f}%</b></font>', cell_right),
                ]
            )
    else:
        top15_rows.append(
            [
                Paragraph("Sin registros clasificados en Riesgo Alto", cell_center),
                Paragraph("-", cell_center),
                Paragraph("-", cell_left),
                Paragraph("-", cell_left),
                Paragraph("-", cell_center),
                Paragraph("-", cell_center),
                Paragraph("0.0%", cell_right),
            ]
        )

    top15_table = Table(
        top15_rows,
        colWidths=[
            usable_width * 0.11,
            usable_width * 0.12,
            usable_width * 0.19,
            usable_width * 0.24,
            usable_width * 0.12,
            usable_width * 0.11,
            usable_width * 0.11,
        ],
        repeatRows=1,
    )
    top15_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(top15_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

