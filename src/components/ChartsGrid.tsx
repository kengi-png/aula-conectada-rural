import { useState } from 'react';
import {
  AccionSugerida,
  RegistroACREnriquecido,
  RuralidadTipo,
  SemaforoEstado,
} from '../types/acr';
import { classifySemaforoFromDecimal } from '../data/mineduDataset';

interface ChartsGridProps {
  records: RegistroACREnriquecido[];
  selectedAction: AccionSugerida | null;
  selectedSemaforo: SemaforoEstado | null;
  onSelectAction: (accion: AccionSugerida | null) => void;
  onSelectSemaforo: (semaforo: SemaforoEstado | null) => void;
}

const ACCIONES_ORDEN: {
  key: AccionSugerida;
  color: string;
  hoverColor: string;
}[] = [
  { key: 'Dotar', color: '#DC2626', hoverColor: '#B91C1C' },
  { key: 'Reponer', color: '#EA580C', hoverColor: '#C2410C' },
  { key: 'Reparar', color: '#D97706', hoverColor: '#B45309' },
  { key: 'Conectividad / Red', color: '#2563EB', hoverColor: '#1D4ED8' },
  { key: 'Adecuado', color: '#16A34A', hoverColor: '#15803D' },
];

const SEMAFORO_META: {
  key: SemaforoEstado;
  label: string;
  color: string;
}[] = [
  { key: 'Rojo', label: 'Rojo · Crítico (> 2.5%)', color: '#DC2626' },
  { key: 'Amarillo', label: 'Amarillo · Alerta (1.5% - 2.5%)', color: '#D97706' },
  { key: 'Verde', label: 'Verde · Bajo (< 1.5%)', color: '#16A34A' },
];

const RURALIDADES: RuralidadTipo[] = ['Urbano', 'Rural 1', 'Rural 2', 'Rural 3'];

export function ChartsGrid({
  records,
  selectedAction,
  selectedSemaforo,
  onSelectAction,
  onSelectSemaforo,
}: ChartsGridProps) {
  const [hoveredGradIdx, setHoveredGradIdx] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<AccionSugerida | null>(null);
  const [hoveredSemaforo, setHoveredSemaforo] = useState<SemaforoEstado | null>(null);

  // 1. Locales (CODLOCAL) por Acción Sugerida dinámica
  const localesByAction = ACCIONES_ORDEN.map((item) => {
    const count = records.filter((r) => r.accionSugerida === item.key).length;
    return { ...item, locales: count };
  });
  const totalLocalesAll = localesByAction.reduce((a, b) => a + b.locales, 0) || 1;
  const maxLocales = Math.max(...localesByAction.map((d) => d.locales), 1);

  // 2. Deserción promedio Primaria vs Secundaria por Gradiente de Ruralidad
  const avgByGradiente = (
    grad: RuralidadTipo,
    field: 'tasaDesercionPrimaria' | 'tasaDesercionSecundaria'
  ): number | null => {
    const sub = records.filter((r) => r.gradienteRuralidad === grad);
    if (sub.length === 0) return null;
    return (sub.reduce((s, r) => s + r[field], 0) / sub.length) * 100;
  };

  const primariaSeries = RURALIDADES.map((g) =>
    avgByGradiente(g, 'tasaDesercionPrimaria')
  );
  const secundariaSeries = RURALIDADES.map((g) =>
    avgByGradiente(g, 'tasaDesercionSecundaria')
  );

  const allNumericRates = [...primariaSeries, ...secundariaSeries].filter(
    (v): v is number => v !== null
  );
  const maxRate = Math.max(...allNumericRates, 3.5);
  const minRate = 0;

  const svgW = 420;
  const svgH = 220;
  const padL = 44;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const xPos = (idx: number) =>
    padL + (idx / Math.max(RURALIDADES.length - 1, 1)) * plotW;
  const yPos = (val: number) =>
    padT + plotH - ((val - minRate) / (maxRate - minRate || 1)) * plotH;

  // 3. Distribución de Distritos únicos (CODGEO) por Semáforo (>2.5% Rojo, 1.5-2.5% Amarillo, <1.5% Verde)
  const districtTotals = new Map<string, { sumDec: number; n: number }>();
  for (const r of records) {
    const prev = districtTotals.get(r.codgeo) ?? { sumDec: 0, n: 0 };
    prev.sumDec += r.tasaActivaDec;
    prev.n += 1;
    districtTotals.set(r.codgeo, prev);
  }
  const distritosMap = new Map<string, SemaforoEstado>();
  for (const [codgeo, d] of districtTotals.entries()) {
    distritosMap.set(codgeo, classifySemaforoFromDecimal(d.sumDec / d.n));
  }

  const semaforoCounts = SEMAFORO_META.map((s) => {
    const count = Array.from(distritosMap.values()).filter((v) => v === s.key).length;
    return { ...s, count };
  });
  const totalDistritos = semaforoCounts.reduce((a, b) => a + b.count, 0) || 1;

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;
  const donutSegments = semaforoCounts.map((seg) => {
    const fraction = seg.count / totalDistritos;
    const dash = fraction * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += dash;
    return { ...seg, fraction, dash, offset };
  });

  const activeHoverSemaforo = hoveredSemaforo
    ? semaforoCounts.find((s) => s.key === hoveredSemaforo)
    : selectedSemaforo
    ? semaforoCounts.find((s) => s.key === selectedSemaforo)
    : null;

  return (
    <section
      aria-label="Visualizaciones analíticas"
      className="grid grid-cols-1 xl:grid-cols-12 gap-5"
    >
      {/* Chart 1: Locales por acción sugerida */}
      <article className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Locales por Acción Sugerida
            </h3>
            {selectedAction && (
              <button
                type="button"
                onClick={() => onSelectAction(null)}
                className="text-xs font-medium text-[#0F2D52] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ver todas
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Clasificación dinámica por CODLOCAL según equipamiento operativo
          </p>
        </div>

        <div className="space-y-3.5 my-auto">
          {localesByAction.map((item) => {
            const widthPct = (item.locales / maxLocales) * 100;
            const sharePct = (item.locales / totalLocalesAll) * 100;
            const isSelected = selectedAction === item.key;
            const isDimmed = selectedAction !== null && !isSelected;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectAction(isSelected ? null : item.key)}
                onMouseEnter={() => setHoveredAction(item.key)}
                onMouseLeave={() => setHoveredAction(null)}
                className={`w-full text-left group cursor-pointer transition-opacity duration-150 ${
                  isDimmed ? 'opacity-45' : 'opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-800">{item.key}</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {item.locales.toLocaleString('es-PE')} locales ({sharePct.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-6 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-200"
                    style={{
                      width: `${Math.max(widthPct, item.locales > 0 ? 4 : 0)}%`,
                      backgroundColor:
                        hoveredAction === item.key ? item.hoverColor : item.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>Total evaluado</span>
          <span className="font-mono tabular-nums font-medium text-slate-800">
            {records.length.toLocaleString('es-PE')} locales (CODLOCAL)
          </span>
        </div>
      </article>

      {/* Chart 2: Deserción por Nivel Educativo y Gradiente de Ruralidad */}
      <article className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Deserción por Nivel y Gradiente de Ruralidad
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tasas reales Primaria vs Secundaria (%) en dbo.vw_Dashboard_ACR
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-0.5 bg-[#0F2D52] inline-block" aria-hidden="true" />
              Primaria
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-0.5 bg-[#DC2626] inline-block" aria-hidden="true" />
              Secundaria
            </span>
          </div>
        </div>

        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label="Gráfico de líneas de deserción en Primaria y Secundaria por gradiente de ruralidad"
          >
            {[0, 1, 2, 3, 4].map((tick) => {
              if (tick > Math.ceil(maxRate)) return null;
              const y = yPos(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    x2={svgW - padR}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {tick.toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {hoveredGradIdx !== null && (
              <line
                x1={xPos(hoveredGradIdx)}
                x2={xPos(hoveredGradIdx)}
                y1={padT}
                y2={svgH - padB}
                stroke="#94A3B8"
                strokeDasharray="3 3"
              />
            )}

            {[0, 1, 2].map((segIdx) => {
              const pA = primariaSeries[segIdx];
              const pB = primariaSeries[segIdx + 1];
              const sA = secundariaSeries[segIdx];
              const sB = secundariaSeries[segIdx + 1];
              return (
                <g key={`seg-${segIdx}`}>
                  {pA !== null && pB !== null && (
                    <line
                      x1={xPos(segIdx)}
                      y1={yPos(pA)}
                      x2={xPos(segIdx + 1)}
                      y2={yPos(pB)}
                      stroke="#0F2D52"
                      strokeWidth="2.5"
                    />
                  )}
                  {sA !== null && sB !== null && (
                    <line
                      x1={xPos(segIdx)}
                      y1={yPos(sA)}
                      x2={xPos(segIdx + 1)}
                      y2={yPos(sB)}
                      stroke="#DC2626"
                      strokeWidth="2.5"
                    />
                  )}
                </g>
              );
            })}

            {RURALIDADES.map((label, idx) => {
              const pVal = primariaSeries[idx];
              const sVal = secundariaSeries[idx];
              return (
                <g key={label}>
                  {pVal !== null && (
                    <>
                      <circle
                        cx={xPos(idx)}
                        cy={yPos(pVal)}
                        r={hoveredGradIdx === idx ? 5.5 : 4}
                        fill="#FFFFFF"
                        stroke="#0F2D52"
                        strokeWidth="2.5"
                      />
                      <text
                        x={xPos(idx)}
                        y={yPos(pVal) + 16}
                        textAnchor="middle"
                        className="fill-[#0F2D52] text-[10px] font-mono font-semibold tabular-nums"
                      >
                        {pVal.toFixed(2)}%
                      </text>
                    </>
                  )}
                  {sVal !== null && (
                    <>
                      <circle
                        cx={xPos(idx)}
                        cy={yPos(sVal)}
                        r={hoveredGradIdx === idx ? 5.5 : 4}
                        fill="#FFFFFF"
                        stroke="#DC2626"
                        strokeWidth="2.5"
                      />
                      <text
                        x={xPos(idx)}
                        y={yPos(sVal) - 9}
                        textAnchor="middle"
                        className="fill-[#DC2626] text-[10px] font-mono font-semibold tabular-nums"
                      >
                        {sVal.toFixed(2)}%
                      </text>
                    </>
                  )}
                  <text
                    x={xPos(idx)}
                    y={svgH - 10}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-medium"
                  >
                    {label}
                  </text>
                  <rect
                    x={xPos(idx) - 48}
                    y={padT}
                    width={96}
                    height={plotH + 20}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredGradIdx(idx)}
                    onMouseLeave={() => setHoveredGradIdx(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="pt-3 mt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between font-mono tabular-nums">
          {hoveredGradIdx !== null ? (
            <>
              <span className="font-sans font-medium text-slate-800">
                {RURALIDADES[hoveredGradIdx]}
              </span>
              <span>
                Primaria:{' '}
                {primariaSeries[hoveredGradIdx] !== null
                  ? `${primariaSeries[hoveredGradIdx]!.toFixed(2)}%`
                  : 'N/A'}{' '}
                · Secundaria:{' '}
                {secundariaSeries[hoveredGradIdx] !== null
                  ? `${secundariaSeries[hoveredGradIdx]!.toFixed(2)}%`
                  : 'N/A'}
              </span>
            </>
          ) : (
            <>
              <span className="font-sans text-slate-500">
                Comparativa inter-niveles por ruralidad
              </span>
              <span>CODGEO MINEDU</span>
            </>
          )}
        </div>
      </article>

      {/* Chart 3: Distribución de distritos por Semáforo */}
      <article className="xl:col-span-3 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Distritos por Semáforo
            </h3>
            {selectedSemaforo && (
              <button
                type="button"
                onClick={() => onSelectSemaforo(null)}
                className="text-xs font-medium text-[#0F2D52] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Todos
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Distritos únicos (CODGEO) por nivel de alerta
          </p>
        </div>

        <div className="flex items-center justify-center my-2">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="22"
              />
              {donutSegments.map((seg) => {
                if (seg.count === 0) return null;
                const isSelected = selectedSemaforo === seg.key;
                const isDimmed = selectedSemaforo !== null && !isSelected;
                return (
                  <circle
                    key={seg.key}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredSemaforo === seg.key || isSelected ? 25 : 22}
                    strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                    strokeDashoffset={-seg.offset}
                    opacity={isDimmed ? 0.35 : 1}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredSemaforo(seg.key)}
                    onMouseLeave={() => setHoveredSemaforo(null)}
                    onClick={() =>
                      onSelectSemaforo(selectedSemaforo === seg.key ? null : seg.key)
                    }
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
                {activeHoverSemaforo ? activeHoverSemaforo.count : distritosMap.size}
              </span>
              <span className="text-[11px] text-slate-500">
                {activeHoverSemaforo ? activeHoverSemaforo.key : 'Distritos'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-100">
          {semaforoCounts.map((seg) => {
            const pct = (seg.count / totalDistritos) * 100;
            const isSelected = selectedSemaforo === seg.key;
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSelectSemaforo(isSelected ? null : seg.key)}
                onMouseEnter={() => setHoveredSemaforo(seg.key)}
                onMouseLeave={() => setHoveredSemaforo(null)}
                className={`w-full flex items-center justify-between text-xs py-1 px-1.5 rounded cursor-pointer transition-colors ${
                  isSelected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center gap-2 text-slate-800">
                  <span
                    className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                  {seg.label}
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {seg.count} ({pct.toFixed(0)}%)
                </span>
              </button>
            );
          })}
        </div>
      </article>
    </section>
  );
}
