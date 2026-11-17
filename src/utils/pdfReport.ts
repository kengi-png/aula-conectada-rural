import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PERU_DEPT_POLYGONS,
  projectLonLatToBox,
  riskColorForRate,
} from '../data/peruDepartmentsGeo';
import { RandomForestDistrictModel } from '../ml/randomForestEngine';
import {
  FiltroACR,
  MapaPeriodo,
  MapaTablaRow,
  ModelEvaluation,
  RegistroACR,
  RegistroACREnriquecido,
  TipoDistrito,
} from '../types/acr';

interface ExecutivePdfParams {
  filters: FiltroACR;
  records: RegistroACREnriquecido[];
  fullDataset: RegistroACR[];
}

export interface MapaPdfParams {
  togglesActivos: TipoDistrito[];
  periodo: MapaPeriodo;
  departamento: string;
  provincia: string;
  distrito: string;
  nivelAgrupacion: string;
  deptRates: Record<string, number>;
  rows: MapaTablaRow[];
  ruralityBreakdown: {
    cantRural1: number;
    cantRural2: number;
    cantRural3: number;
  } | null;
}

export function downloadExecutivePdfReport({
  filters,
  records,
  fullDataset,
}: ExecutivePdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const usableWidth = pageWidth - marginX * 2;

  const count = records.length;
  let avgDesercion = 0;
  if (count > 0) {
    if (filters.nivelEducativo === 'Primaria') {
      avgDesercion =
        (records.reduce((s, r) => s + r.tasaDesercionPrimaria, 0) / count) * 100;
    } else if (filters.nivelEducativo === 'Secundaria') {
      avgDesercion =
        (records.reduce((s, r) => s + r.tasaDesercionSecundaria, 0) / count) * 100;
    } else {
      avgDesercion =
        (records.reduce(
          (s, r) => s + r.tasaDesercionPrimaria + r.tasaDesercionSecundaria,
          0
        ) /
          (count * 2)) *
        100;
    }
  }

  const totalComputadoras = records.reduce((s, r) => s + r.computadorasTotal, 0);
  const totalOperativas = records.reduce((s, r) => s + r.computadorasOperativas, 0);
  const avgEquiposOp =
    totalComputadoras > 0 ? (totalOperativas / totalComputadoras) * 100 : 0;
  const promedioPcsOperLocal = count > 0 ? totalOperativas / count : 0;

  const districtTotals = new Map<string, { sumDec: number; n: number }>();
  for (const r of records) {
    const prev = districtTotals.get(r.codgeo) ?? { sumDec: 0, n: 0 };
    prev.sumDec += r.tasaActivaDec;
    prev.n += 1;
    districtTotals.set(r.codgeo, prev);
  }
  const distritosAlertaRoja = Array.from(districtTotals.values()).filter(
    (d) => d.sumDec / d.n > 0.025
  ).length;

  const rfModel = new RandomForestDistrictModel(fullDataset);

  const uniqueRowsMap = new Map<string, RegistroACREnriquecido>();
  const sorted = [...records].sort((a, b) => b.tasaActivaPct - a.tasaActivaPct);
  for (const row of sorted) {
    const key = `${row.codgeo}-${row.distrito}`;
    if (!uniqueRowsMap.has(key)) {
      uniqueRowsMap.set(key, row);
    }
  }
  const top10 = Array.from(uniqueRowsMap.values()).slice(0, 10);

  // BLOQUE 1: Cabecera
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 45, 82);
  doc.text('AULA CONECTADA RURAL - Reporte Ejecutivo', pageWidth / 2, 48, {
    align: 'center',
  });

  const now = new Date();
  const fechaStr = now.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha de generación: ${fechaStr}`, pageWidth - marginX, 68, {
    align: 'right',
  });
  doc.text(
    'Base de datos Proyecto_ACR, vista dbo.vw_Dashboard_ACR',
    pageWidth - marginX,
    80,
    { align: 'right' }
  );

  // BLOQUE 2: Filtros Activos (Tabla 2x2)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 45, 82);
  doc.text('Filtros Activos', marginX, 108);

  autoTable(doc, {
    startY: 116,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 7,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.5 },
      1: { cellWidth: usableWidth * 0.5 },
    },
    body: [
      [
        `Departamento: ${filters.departamento}`,
        `Provincia/UGEL: ${filters.provinciaUgel}`,
      ],
      [
        `Nivel Educativo: ${filters.nivelEducativo}`,
        `Gradiente de Ruralidad: ${filters.ruralidad}`,
      ],
    ],
  });

  // BLOQUE 3: Indicadores Clave (KPIs - Tabla 1x4 con encabezado gris tenue)
  const afterFiltersY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 45, 82);
  doc.text('Indicadores Clave (KPIs)', marginX, afterFiltersY);

  autoTable(doc, {
    startY: afterFiltersY + 8,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [
      [
        'Tasa de Deserción',
        'Porcentaje de Equipos Operativos',
        'Promedio PCs Operativas / Local',
        'Distritos en Alerta Roja',
      ],
    ],
    body: [
      [
        `${avgDesercion.toFixed(2)}%`,
        `${avgEquiposOp.toFixed(1)}%`,
        `${promedioPcsOperLocal.toFixed(1)}`,
        `${distritosAlertaRoja}`,
      ],
    ],
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.5,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      halign: 'center',
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
    },
    bodyStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 11,
      fillColor: [255, 255, 255],
      textColor: [15, 45, 82],
      halign: 'center',
      valign: 'middle',
      cellPadding: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.25 },
      1: { cellWidth: usableWidth * 0.25 },
      2: { cellWidth: usableWidth * 0.25 },
      3: { cellWidth: usableWidth * 0.25 },
    },
  });

  // BLOQUE 4: Resultados de Inteligencia Artificial (Top 10 Random Forest)
  const afterKpisY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 45, 82);
  doc.text('Clasificación de Riesgo - Modelo Random Forest', marginX, afterKpisY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  const introText =
    'Listado de los 10 distritos prioritarios ordenados por tasa promedio de deserción ' +
    'combinada (Primaria y Secundaria), incorporando el nivel de riesgo clasificado por el ' +
    'modelo supervisado Random Forest a partir de equipamiento de cómputo y ruralidad.';
  const wrappedIntro = doc.splitTextToSize(introText, usableWidth);
  doc.text(wrappedIntro, marginX, afterKpisY + 14, {
    align: 'justify',
    maxWidth: usableWidth,
  });

  const tableStartY = afterKpisY + 14 + wrappedIntro.length * 11 + 6;

  const top10Body = top10.map((row) => {
    const prediction = rfModel.predictWhatIf({
      computadorasTotal: row.computadorasTotal,
      computadorasOperativas: row.computadorasOperativas,
      gradienteRuralidad: row.gradienteRuralidad,
      tieneEquipoRed: row.tieneEquipoRed,
      tieneSoporteEnergia: row.tieneSoporteEnergia,
    });
    return [
      row.departamento,
      row.distrito,
      `${row.tasaActivaPct.toFixed(2)}%`,
      prediction.predictedClass,
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [['Departamento', 'Distrito', 'Tasa de Deserción', 'Nivel de Riesgo']],
    body: top10Body,
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.5,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.25, halign: 'left' },
      1: { cellWidth: usableWidth * 0.35, halign: 'left' },
      2: { cellWidth: usableWidth * 0.20, halign: 'center' },
      3: { cellWidth: usableWidth * 0.20, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw);
        if (val === 'Rojo') data.cell.styles.textColor = [185, 28, 28];
        else if (val === 'Amarillo') data.cell.styles.textColor = [180, 83, 9];
        else data.cell.styles.textColor = [21, 128, 61];
      }
    },
  });

  const stamp = now.toISOString().slice(0, 10);
  doc.save(`Reporte_Ejecutivo_ACR_${stamp}.pdf`);
}

function renderPeruHeatmapPngDataUrl(deptRates: Record<string, number>): string {
  const width = 960;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo del lienzo del mapa
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Área de proyección del mapa a la derecha del recuadro de leyenda
  const mapX0 = 330;
  const mapW = width - mapX0 - 30;
  const mapH = height - 36;

  const minLon = -81.45;
  const maxLon = -68.55;
  const minLat = -18.45;
  const maxLat = 0.05;
  const scale = Math.min(mapW / (maxLon - minLon), mapH / (maxLat - minLat));
  const offsetX = mapX0 + (mapW - (maxLon - minLon) * scale) / 2;
  const offsetY = 18 + (mapH - (maxLat - minLat) * scale) / 2;

  for (const dept of PERU_DEPT_POLYGONS) {
    const rate = deptRates[dept.id];
    ctx.fillStyle = riskColorForRate(rate);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;

    for (const poly of dept.polygons) {
      ctx.beginPath();
      for (const ring of poly) {
        ring.forEach(([lon, lat], idx) => {
          const x = offsetX + (lon - minLon) * scale;
          const y = height - (offsetY + (lat - minLat) * scale);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      ctx.fill('evenodd');
      ctx.stroke();
    }
  }

  // Recuadro fijo de leyenda "MAPA DE CALOR" en la esquina inferior izquierda
  const legX = 24;
  const legY = height - 186;
  const legW = 310;
  const legH = 162;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(legX, legY, legW, legH);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(legX, legY, legW, legH);

  ctx.fillStyle = '#0F2D52';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.fillText('MAPA DE CALOR', legX + 16, legY + 30);

  const items: Array<[string, string]> = [
    ['#16A34A', 'Verde: Riesgo Bajo (< 1.5%)'],
    ['#D97706', 'Ámbar: Riesgo Moderado (1.5% - 2.5%)'],
    ['#DC2626', 'Rojo Intenso: Riesgo Crítico (> 2.5%)'],
  ];
  items.forEach(([hex, label], i) => {
    const y = legY + 56 + i * 34;
    ctx.fillStyle = hex;
    ctx.fillRect(legX + 16, y, 18, 18);
    ctx.fillStyle = '#1E293B';
    ctx.font = '14px Helvetica, Arial, sans-serif';
    ctx.fillText(label, legX + 44, y + 14);
  });

  return canvas.toDataURL('image/png');
}

export function downloadMapaDesercionPdfReport({
  togglesActivos,
  periodo,
  departamento,
  provincia,
  distrito,
  nivelAgrupacion,
  deptRates,
  rows,
  ruralityBreakdown,
}: MapaPdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 36;
  const usableWidth = pageWidth - marginX * 2;
  const now = new Date();
  const fechaStr = now.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Cabecera
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 45, 82);
  doc.text('AULA CONECTADA RURAL - Mapa Territorial de Deserción', pageWidth / 2, 42, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha de generación: ${fechaStr}`, pageWidth - marginX, 60, {
    align: 'right',
  });
  doc.text(
    'Base de datos Proyecto_ACR, vista dbo.vw_Mapa_Desercion_ACR',
    pageWidth - marginX,
    72,
    { align: 'right' }
  );

  // Parámetros Activos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text('Parámetros de Consulta Activos', marginX, 95);

  const togglesText = togglesActivos.length > 0 ? togglesActivos.join(', ') : 'Ninguno';
  autoTable(doc, {
    startY: 102,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.50 },
      1: { cellWidth: usableWidth * 0.50 },
    },
    body: [
      [`Departamento: ${departamento}`, `Provincia: ${provincia}`],
      [`Distrito: ${distrito}`, `Periodo: ${periodo}`],
      [`Toggles Activos: ${togglesText}`, `Nivel de Agrupación: ${nivelAgrupacion}`],
    ],
  });

  // Mapa Coroplético Departamental estático + Leyenda
  const afterParamsY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text('Mapa Coroplético Departamental', marginX, afterParamsY);

  const mapImgData = renderPeruHeatmapPngDataUrl(deptRates);
  const mapImgH = usableWidth * 0.48;
  if (mapImgData) {
    doc.addImage(mapImgData, 'PNG', marginX, afterParamsY + 6, usableWidth, mapImgH);
  }

  // Tabla exacta mostrada en pantalla
  const tableTitleY = afterParamsY + mapImgH + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text(`Tabla Dinámica Territorial (${nivelAgrupacion})`, marginX, tableTitleY);

  const showDesertores = periodo === '2025';
  const head = showDesertores
    ? [['Ubicación', 'IE Rurales', 'Primaria (%)', 'Secundaria (%)', 'Tasa Total (%)', 'Desertores 2025']]
    : [['Ubicación', 'IE Rurales', 'Primaria (%)', 'Secundaria (%)', 'Tasa Total (%)']];

  const body = rows.map((r) => {
    const base = [
      r.ubicacion,
      r.ieRurales.toLocaleString('es-PE'),
      `${r.primariaPct.toFixed(2)}%`,
      `${r.secundariaPct.toFixed(2)}%`,
      `${r.tasaTotalPct.toFixed(2)}%`,
    ];
    if (showDesertores) {
      base.push((r.desertores2025 ?? 0).toLocaleString('es-PE'));
    }
    return base;
  });

  autoTable(doc, {
    startY: tableTitleY + 8,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head,
    body,
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: showDesertores
      ? {
          0: { cellWidth: usableWidth * 0.28, halign: 'left' },
          1: { cellWidth: usableWidth * 0.14, halign: 'right' },
          2: { cellWidth: usableWidth * 0.14, halign: 'right' },
          3: { cellWidth: usableWidth * 0.15, halign: 'right' },
          4: { cellWidth: usableWidth * 0.14, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: usableWidth * 0.15, halign: 'right' },
        }
      : {
          0: { cellWidth: usableWidth * 0.34, halign: 'left' },
          1: { cellWidth: usableWidth * 0.16, halign: 'right' },
          2: { cellWidth: usableWidth * 0.16, halign: 'right' },
          3: { cellWidth: usableWidth * 0.17, halign: 'right' },
          4: { cellWidth: usableWidth * 0.17, halign: 'right', fontStyle: 'bold' },
        },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowObj = rows[data.row.index];
        if (rowObj && rowObj.tasaTotalPct > 2.5) {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
        }
      }
    },
  });

  if (ruralityBreakdown) {
    const afterTableY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 45, 82);
    doc.text('Desglose de Instituciones Educativas por Grado de Ruralidad', marginX, afterTableY);

    autoTable(doc, {
      startY: afterTableY + 6,
      margin: { left: marginX, right: marginX },
      tableWidth: usableWidth,
      theme: 'grid',
      head: [['Ruralidad Extrema (Rural 1)', 'Ruralidad Intermedia (Rural 2)', 'Menor Dispersión (Rural 3)']],
      body: [
        [
          ruralityBreakdown.cantRural1.toLocaleString('es-PE'),
          ruralityBreakdown.cantRural2.toLocaleString('es-PE'),
          ruralityBreakdown.cantRural3.toLocaleString('es-PE'),
        ],
      ],
      headStyles: {
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 8,
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        halign: 'center',
      },
      bodyStyles: {
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        textColor: [15, 45, 82],
      },
    });
  }

  const stamp = now.toISOString().slice(0, 10);
  doc.save(`Mapa_Desercion_ACR_${periodo}_${stamp}.pdf`);
}

export interface RfHighRiskRow extends RegistroACREnriquecido {
  probRiesgoAlto: number;
}

export function downloadRfEvaluationPdfReport(
  evaluation: ModelEvaluation,
  highRiskRows: RfHighRiskRow[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 36;
  const usableWidth = pageWidth - marginX * 2;
  const now = new Date();
  const fechaStr = now.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 45, 82);
  doc.text('AULA CONECTADA RURAL - Evaluación del Modelo Random Forest', pageWidth / 2, 42, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha de generación: ${fechaStr}`, pageWidth - marginX, 60, {
    align: 'right',
  });
  doc.text(
    'Base de datos Proyecto_ACR, vista dbo.vw_Dashboard_ACR · Auditoría Anti-Leakage activa',
    pageWidth - marginX,
    72,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryText =
    `Modelo supervisado multiclase (Rojo, Amarillo, Verde) regularizado contra overfitting: ` +
    `n_estimators=${evaluation.nEstimators}, max_depth=${evaluation.maxDepth}, ` +
    `min_samples_leaf=${evaluation.minSamplesLeaf}, class_weight='balanced', ` +
    `partición estratificada 80/20 (n_train=${evaluation.trainingSamples.toLocaleString('es-PE')}, ` +
    `n_test=${evaluation.testSamples.toLocaleString('es-PE')}).`;
  const wrappedSummary = doc.splitTextToSize(summaryText, usableWidth);
  doc.text(wrappedSummary, marginX, 92, { align: 'justify', maxWidth: usableWidth });

  const metricsTitleY = 92 + wrappedSummary.length * 11 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text('1. Métricas de Validación', marginX, metricsTitleY);

  autoTable(doc, {
    startY: metricsTitleY + 6,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [
      [
        'Accuracy (Holdout 20%)',
        'F1-Score Macro',
        `Validación Cruzada (${evaluation.cvFolds}-Folds)`,
        'Muestra Train / Test',
      ],
    ],
    body: [
      [
        `${(evaluation.accuracy * 100).toFixed(2)}%`,
        `${(evaluation.f1Macro * 100).toFixed(2)}%`,
        `${(evaluation.cvAccuracyMean * 100).toFixed(2)}% (±${(evaluation.cvAccuracyStd * 100).toFixed(2)}%)`,
        `${evaluation.trainingSamples.toLocaleString('es-PE')} / ${evaluation.testSamples.toLocaleString('es-PE')}`,
      ],
    ],
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      halign: 'center',
    },
    bodyStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 10.5,
      halign: 'center',
      textColor: [15, 45, 82],
      cellPadding: 7,
    },
  });

  const impTitleY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text('2. Tabla de Importancia de Variables (Impureza Gini)', marginX, impTitleY);

  autoTable(doc, {
    startY: impTitleY + 6,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [['Variable Predictora', 'Importancia (%)']],
    body: evaluation.featureImportances.map((item) => [
      item.label,
      `${(item.importance * 100).toFixed(2)}%`,
    ]),
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.75, halign: 'left' },
      1: { cellWidth: usableWidth * 0.25, halign: 'right' },
    },
  });

  const cmTitleY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text('3. Matriz de Confusión Multiclase (Conjunto de Prueba 20%)', marginX, cmTitleY);

  autoTable(doc, {
    startY: cmTitleY + 6,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [['Real \\ Predicho', ...evaluation.classes]],
    body: evaluation.classes.map((cls, i) => [
      cls,
      ...evaluation.confusionMatrix[i].map((v) => v.toLocaleString('es-PE')),
    ]),
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      halign: 'center',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      halign: 'center',
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.28, halign: 'left', fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: usableWidth * 0.24 },
      2: { cellWidth: usableWidth * 0.24 },
      3: { cellWidth: usableWidth * 0.24 },
    },
  });

  const top15TitleY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 45, 82);
  doc.text(
    '4. Top 15 Locales y Distritos con Mayor Probabilidad de Riesgo Alto',
    marginX,
    top15TitleY
  );

  const top15 = highRiskRows.slice(0, 15);
  autoTable(doc, {
    startY: top15TitleY + 6,
    margin: { left: marginX, right: marginX },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [
      ['CODGEO', 'CODLOCAL', 'Departamento', 'Distrito', 'Ruralidad', 'PCs Op./Tot.', 'Prob. Alto'],
    ],
    body:
      top15.length > 0
        ? top15.map((r) => [
            r.codgeo,
            r.codlocal,
            r.departamento,
            r.distrito,
            r.gradienteRuralidad,
            `${r.computadorasOperativas} / ${r.computadorasTotal}`,
            `${r.probRiesgoAlto.toFixed(1)}%`,
          ])
        : [['Sin registros en Riesgo Alto', '-', '-', '-', '-', '-', '0.0%']],
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      halign: 'center',
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 4.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: usableWidth * 0.11, halign: 'center' },
      1: { cellWidth: usableWidth * 0.12, halign: 'center' },
      2: { cellWidth: usableWidth * 0.19, halign: 'left' },
      3: { cellWidth: usableWidth * 0.24, halign: 'left' },
      4: { cellWidth: usableWidth * 0.12, halign: 'center' },
      5: { cellWidth: usableWidth * 0.11, halign: 'center' },
      6: { cellWidth: usableWidth * 0.11, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
    },
  });

  const stamp = now.toISOString().slice(0, 10);
  doc.save(`Evaluacion_RandomForest_ACR_${stamp}.pdf`);
}


