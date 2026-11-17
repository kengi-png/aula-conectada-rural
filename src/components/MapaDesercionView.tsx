import { useMemo, useState } from 'react';
import { MAPA_DESERCION_DATASET } from '../data/mapaDesercionDataset';
import {
  PERU_DEPT_POLYGONS,
  buildDeptSvgPath,
  normalizeDepartmentName,
  riskColorForRate,
  riskLabelForRate,
} from '../data/peruDepartmentsGeo';
import { MapaPeriodo, MapaTablaRow, TipoDistrito } from '../types/acr';
import { downloadMapaDesercionPdfReport } from '../utils/pdfReport';

interface MapaDesercionViewProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

interface DeptStats {
  departamento: string;
  tasaProm: number;
  ieRurales: number;
  distritosCount: number;
}

const DEFAULT_DEPTO = 'Todos los departamentos';
const DEFAULT_PROV = 'Todas las provincias';
const DEFAULT_DIST = 'Todos los distritos';

export function MapaDesercionView({
  isFullscreen,
  onToggleFullscreen,
}: MapaDesercionViewProps) {
  const [toggleRural, setToggleRural] = useState(true);
  const [toggleUrbano, setToggleUrbano] = useState(false);
  const [periodo, setPeriodo] = useState<MapaPeriodo>('2023-2024');
  const [selectedDepartamento, setSelectedDepartamento] = useState(DEFAULT_DEPTO);
  const [selectedProvincia, setSelectedProvincia] = useState(DEFAULT_PROV);
  const [selectedDistrito, setSelectedDistrito] = useState(DEFAULT_DIST);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  const togglesActivos = useMemo<TipoDistrito[]>(() => {
    const active: TipoDistrito[] = [];
    if (toggleRural) active.push('CON PRESENCIA RURAL');
    if (toggleUrbano) active.push('EXCLUSIVAMENTE URBANO');
    return active;
  }, [toggleRural, toggleUrbano]);

  const activeRecords = useMemo(() => {
    if (togglesActivos.length === 0) return [];
    return MAPA_DESERCION_DATASET.filter((r) =>
      togglesActivos.includes(r.tipoDistrito)
    );
  }, [togglesActivos]);

  // Nivel 1: Departamentos disponibles
  const departamentosDisponibles = useMemo(() => {
    return Array.from(new Set(activeRecords.map((r) => r.departamento))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [activeRecords]);

  const effectiveDepartamento = departamentosDisponibles.includes(selectedDepartamento)
    ? selectedDepartamento
    : DEFAULT_DEPTO;

  const scopeDepartamento = useMemo(() => {
    if (effectiveDepartamento === DEFAULT_DEPTO) return activeRecords;
    return activeRecords.filter((r) => r.departamento === effectiveDepartamento);
  }, [activeRecords, effectiveDepartamento]);

  // Nivel 2: Provincias estrictamente filtradas por departamento seleccionado
  const provinciasDisponibles = useMemo(() => {
    return Array.from(new Set(scopeDepartamento.map((r) => r.provincia))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [scopeDepartamento]);

  const effectiveProvincia = provinciasDisponibles.includes(selectedProvincia)
    ? selectedProvincia
    : DEFAULT_PROV;

  const scopeProvincia = useMemo(() => {
    if (effectiveProvincia === DEFAULT_PROV) return scopeDepartamento;
    return scopeDepartamento.filter((r) => r.provincia === effectiveProvincia);
  }, [scopeDepartamento, effectiveProvincia]);

  // Nivel 3: Distritos estrictamente filtrados por provincia seleccionada
  const distritosDisponibles = useMemo(() => {
    if (effectiveProvincia === DEFAULT_PROV) return [];
    return Array.from(new Set(scopeProvincia.map((r) => r.distrito))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [scopeProvincia, effectiveProvincia]);

  const effectiveDistrito = distritosDisponibles.includes(selectedDistrito)
    ? selectedDistrito
    : DEFAULT_DIST;

  // Estadísticas departamentales para el mapa coroplético oficial
  const deptStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { departamento: string; sumTasa: number; count: number; ieRurales: number }
    >();
    for (const r of activeRecords) {
      const key = normalizeDepartmentName(r.departamento);
      const tasa = periodo === '2023-2024' ? r.tasaTotal2324 : r.tasaTotal2025;
      const cur = map.get(key) ?? {
        departamento: r.departamento,
        sumTasa: 0,
        count: 0,
        ieRurales: 0,
      };
      cur.sumTasa += tasa;
      cur.count += 1;
      cur.ieRurales += r.totalIeRurales;
      map.set(key, cur);
    }

    const result: Record<string, DeptStats> = {};
    for (const [k, v] of map.entries()) {
      result[k] = {
        departamento: v.departamento,
        tasaProm: v.count > 0 ? v.sumTasa / v.count : 0,
        ieRurales: v.ieRurales,
        distritosCount: v.count,
      };
    }
    return result;
  }, [activeRecords, periodo]);

  const deptRatesNumeric = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(deptStatsMap)) {
      out[k] = v.tasaProm;
    }
    return out;
  }, [deptStatsMap]);

  // Precalcular paths SVG oficiales de los 25 departamentos
  const deptSvgPaths = useMemo(() => {
    return PERU_DEPT_POLYGONS.map((dept) => ({
      ...dept,
      d: buildDeptSvgPath(dept.polygons, 420, 540, 22),
    }));
  }, []);

  // Construcción de Tabla Dinámica en 4 Niveles ordenada descendente por Tasa Total
  const { nivelAgrupacion, tableRows, ruralityBreakdown } = useMemo(() => {
    if (activeRecords.length === 0) {
      return {
        nivelAgrupacion: 'Sin registros activos',
        tableRows: [] as MapaTablaRow[],
        ruralityBreakdown: null,
      };
    }

    if (effectiveDepartamento === DEFAULT_DEPTO && effectiveProvincia === DEFAULT_PROV) {
      // Nivel 1: Departamental (25 Departamentos)
      const grouped = new Map<
        string,
        {
          departamento: string;
          ieRurales: number;
          sumPrim: number;
          sumSec: number;
          sumTot: number;
          desertores2025: number;
          count: number;
        }
      >();
      for (const r of activeRecords) {
        const cur = grouped.get(r.departamento) ?? {
          departamento: r.departamento,
          ieRurales: 0,
          sumPrim: 0,
          sumSec: 0,
          sumTot: 0,
          desertores2025: 0,
          count: 0,
        };
        cur.ieRurales += r.totalIeRurales;
        cur.sumPrim += r.primariaPct;
        cur.sumSec += r.secundariaPct;
        cur.sumTot += periodo === '2023-2024' ? r.tasaTotal2324 : r.tasaTotal2025;
        cur.desertores2025 += r.desertores2025;
        cur.count += 1;
        grouped.set(r.departamento, cur);
      }
      const rows: MapaTablaRow[] = Array.from(grouped.values())
        .map((g) => ({
          ubicacion: g.departamento,
          ieRurales: g.ieRurales,
          primariaPct: g.sumPrim / g.count,
          secundariaPct: g.sumSec / g.count,
          tasaTotalPct: g.sumTot / g.count,
          desertores2025: periodo === '2025' ? g.desertores2025 : undefined,
        }))
        .sort((a, b) => b.tasaTotalPct - a.tasaTotalPct);

      return {
        nivelAgrupacion: 'Nivel 1: Departamental (25 Departamentos)',
        tableRows: rows,
        ruralityBreakdown: null,
      };
    }

    if (effectiveProvincia === DEFAULT_PROV) {
      // Nivel 2: Provincias del Departamento seleccionado
      const grouped = new Map<
        string,
        {
          provincia: string;
          ieRurales: number;
          sumPrim: number;
          sumSec: number;
          sumTot: number;
          desertores2025: number;
          count: number;
        }
      >();
      for (const r of scopeDepartamento) {
        const cur = grouped.get(r.provincia) ?? {
          provincia: r.provincia,
          ieRurales: 0,
          sumPrim: 0,
          sumSec: 0,
          sumTot: 0,
          desertores2025: 0,
          count: 0,
        };
        cur.ieRurales += r.totalIeRurales;
        cur.sumPrim += r.primariaPct;
        cur.sumSec += r.secundariaPct;
        cur.sumTot += periodo === '2023-2024' ? r.tasaTotal2324 : r.tasaTotal2025;
        cur.desertores2025 += r.desertores2025;
        cur.count += 1;
        grouped.set(r.provincia, cur);
      }
      const rows: MapaTablaRow[] = Array.from(grouped.values())
        .map((g) => ({
          ubicacion: g.provincia,
          ieRurales: g.ieRurales,
          primariaPct: g.sumPrim / g.count,
          secundariaPct: g.sumSec / g.count,
          tasaTotalPct: g.sumTot / g.count,
          desertores2025: periodo === '2025' ? g.desertores2025 : undefined,
        }))
        .sort((a, b) => b.tasaTotalPct - a.tasaTotalPct);

      return {
        nivelAgrupacion: `Nivel 2: Provincias de ${effectiveDepartamento}`,
        tableRows: rows,
        ruralityBreakdown: null,
      };
    }

    if (effectiveDistrito === DEFAULT_DIST) {
      // Nivel 3: Distritos de la Provincia seleccionada
      const rows: MapaTablaRow[] = scopeProvincia
        .map((r) => ({
          ubicacion: r.distrito,
          ieRurales: r.totalIeRurales,
          primariaPct: r.primariaPct,
          secundariaPct: r.secundariaPct,
          tasaTotalPct: periodo === '2023-2024' ? r.tasaTotal2324 : r.tasaTotal2025,
          desertores2025: periodo === '2025' ? r.desertores2025 : undefined,
        }))
        .sort((a, b) => b.tasaTotalPct - a.tasaTotalPct);

      return {
        nivelAgrupacion: `Nivel 3: Distritos de la Provincia ${effectiveProvincia}`,
        tableRows: rows,
        ruralityBreakdown: null,
      };
    }

    // Nivel 4: Detalle del Distrito seleccionado + desglose ruralidad
    const sub = scopeProvincia.filter((r) => r.distrito === effectiveDistrito);
    const rows: MapaTablaRow[] = sub
      .map((r) => ({
        ubicacion: r.distrito,
        ieRurales: r.totalIeRurales,
        primariaPct: r.primariaPct,
        secundariaPct: r.secundariaPct,
        tasaTotalPct: periodo === '2023-2024' ? r.tasaTotal2324 : r.tasaTotal2025,
        desertores2025: periodo === '2025' ? r.desertores2025 : undefined,
      }))
      .sort((a, b) => b.tasaTotalPct - a.tasaTotalPct);

    const rurality =
      sub.length > 0
        ? {
            cantRural1: sub.reduce((s, r) => s + r.cantRural1, 0),
            cantRural2: sub.reduce((s, r) => s + r.cantRural2, 0),
            cantRural3: sub.reduce((s, r) => s + r.cantRural3, 0),
          }
        : null;

    return {
      nivelAgrupacion: `Nivel 4: Detalle del Distrito ${effectiveDistrito}`,
      tableRows: rows,
      ruralityBreakdown: rurality,
    };
  }, [
    activeRecords,
    scopeDepartamento,
    scopeProvincia,
    effectiveDepartamento,
    effectiveProvincia,
    effectiveDistrito,
    periodo,
  ]);

  const handleSavePdf = () => {
    downloadMapaDesercionPdfReport({
      togglesActivos,
      periodo,
      departamento: effectiveDepartamento,
      provincia: effectiveProvincia,
      distrito: effectiveDistrito,
      nivelAgrupacion,
      deptRates: deptRatesNumeric,
      rows: tableRows,
      ruralityBreakdown,
    });
  };

  // Sincronización bidireccional: clic en departamento del mapa actualiza selector DEPARTAMENTO y reinicia PROVINCIA/DISTRITO
  const handleDepartmentClick = (deptId: string) => {
    const stats = deptStatsMap[deptId];
    if (stats) {
      setSelectedDepartamento(stats.departamento);
      setSelectedProvincia(DEFAULT_PROV);
      setSelectedDistrito(DEFAULT_DIST);
    }
  };

  const selectedDeptNorm =
    effectiveDepartamento !== DEFAULT_DEPTO
      ? normalizeDepartmentName(effectiveDepartamento)
      : null;

  const hoveredStats = hoveredDept ? deptStatsMap[hoveredDept] : undefined;
  const hoveredLabel = hoveredDept
    ? PERU_DEPT_POLYGONS.find((p) => p.id === hoveredDept)?.label ?? hoveredDept
    : null;

  return (
    <div className="space-y-5">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mapa Territorial de Deserción Escolar
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Vista dbo.vw_Mapa_Desercion_ACR · Análisis departamental, provincial y distrital por modalidad territorial
          </p>
        </div>
        {isFullscreen && (
          <div className="text-xs font-medium text-slate-600">
            Modo Pantalla Completa activo
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Cuadrícula 2x2 + Mapa Coroplético Oficial + Leyenda MAPA DE CALOR */}
        <section className="xl:col-span-5 space-y-4">
          {/* Cuadrícula 2x2 de 4 controles */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            {/* Fila 1: Toggles ON/OFF */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={toggleRural}
                onClick={() => setToggleRural((v) => !v)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  toggleRural
                    ? 'bg-slate-50 border-[#0F2D52] text-[#0F2D52]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-left leading-tight">CON PRESENCIA RURAL</span>
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-sm transition-colors ${
                    toggleRural ? 'bg-[#0F2D52]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform bg-white rounded-[2px] transition-transform ${
                      toggleRural ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={toggleUrbano}
                onClick={() => setToggleUrbano((v) => !v)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  toggleUrbano
                    ? 'bg-slate-50 border-[#0F2D52] text-[#0F2D52]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-left leading-tight">EXCLUSIVAMENTE URBANO</span>
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-sm transition-colors ${
                    toggleUrbano ? 'bg-[#0F2D52]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform bg-white rounded-[2px] transition-transform ${
                      toggleUrbano ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* Fila 2: Botones de Periodo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPeriodo('2023-2024')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  periodo === '2023-2024'
                    ? 'bg-[#0F2D52] border-[#0F2D52] text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                2023-2024
              </button>
              <button
                type="button"
                onClick={() => setPeriodo('2025')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  periodo === '2025'
                    ? 'bg-[#0F2D52] border-[#0F2D52] text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                2025
              </button>
            </div>
          </div>

          {/* Mapa Coroplético Oficial del Perú (25 Departamentos) + Leyenda MAPA DE CALOR */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 relative">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Mapa Coroplético Departamental ({periodo})
              </h2>
              {periodo === '2025' ? (
                <span className="text-[11px] font-medium text-slate-500">
                  Suavizado k=50 · Escenario base -3%
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Clic en un departamento para filtrar
                </span>
              )}
            </div>

            <div className="relative bg-slate-50/70 border border-slate-200 rounded-lg overflow-hidden">
              <svg
                viewBox="0 0 420 540"
                className="w-full h-[445px] select-none"
                role="img"
                aria-label="Mapa de calor coroplético oficial de deserción escolar por departamento del Perú"
              >
                {deptSvgPaths.map((dept) => {
                  const stats = deptStatsMap[dept.id];
                  const fill = riskColorForRate(stats?.tasaProm);
                  const isSelected = selectedDeptNorm === dept.id;
                  const isHovered = hoveredDept === dept.id;
                  const isDimmed = selectedDeptNorm !== null && !isSelected;

                  return (
                    <path
                      key={dept.id}
                      d={dept.d}
                      fillRule="evenodd"
                      fill={fill}
                      fillOpacity={isDimmed ? 0.42 : isHovered || isSelected ? 0.96 : 0.86}
                      stroke={isSelected ? '#0F2D52' : isHovered ? '#1E293B' : '#FFFFFF'}
                      strokeWidth={isSelected ? 2.2 : isHovered ? 1.5 : 0.85}
                      strokeLinejoin="round"
                      className="transition-opacity duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredDept(dept.id)}
                      onMouseLeave={() => setHoveredDept(null)}
                      onClick={() => handleDepartmentClick(dept.id)}
                    />
                  );
                })}
              </svg>

              {/* Tooltip limpio al pasar el cursor */}
              {hoveredLabel && (
                <div className="absolute top-3 right-3 bg-white/95 border border-slate-300 rounded-lg px-3 py-2 text-xs pointer-events-none max-w-[215px]">
                  <div className="font-bold text-slate-900">{hoveredLabel}</div>
                  {hoveredStats ? (
                    <div className="mt-1 space-y-0.5 text-slate-700">
                      <div className="flex justify-between gap-3">
                        <span>Tasa promedio:</span>
                        <span className="font-mono tabular-nums font-semibold text-[#0F2D52]">
                          {hoveredStats.tasaProm.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>IE Rurales:</span>
                        <span className="font-mono tabular-nums">
                          {hoveredStats.ieRurales.toLocaleString('es-PE')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 pt-0.5 border-t border-slate-100">
                        {riskLabelForRate(hoveredStats.tasaProm)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-slate-500">
                      Sin registros para la modalidad seleccionada
                    </div>
                  )}
                </div>
              )}

              {/* Recuadro fijo tipo leyenda en esquina inferior izquierda: MAPA DE CALOR */}
              <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-300 rounded-lg px-3 py-2.5 text-xs">
                <div className="text-[11px] font-bold tracking-wide text-[#0F2D52] mb-1.5">
                  MAPA DE CALOR
                </div>
                <ul className="space-y-1 text-[11px] text-slate-800">
                  <li className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-[2px] shrink-0 bg-[#16A34A]"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>Verde:</strong> Riesgo Bajo (&lt; 1.5%)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-[2px] shrink-0 bg-[#D97706]"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>Ámbar:</strong> Riesgo Moderado (1.5% - 2.5%)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-[2px] shrink-0 bg-[#DC2626]"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>Rojo Intenso:</strong> Riesgo Crítico (&gt; 2.5%)
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* COLUMNA DERECHA: Cascada DEPARTAMENTO -> PROVINCIA -> DISTRITO + Tabla */}
        <section className="xl:col-span-7 space-y-4">
          {/* Barra superior de filtros en cascada y acciones */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="mapa-departamento"
                  className="block text-[11px] font-semibold tracking-wide text-slate-600 mb-1"
                >
                  DEPARTAMENTO
                </label>
                <select
                  id="mapa-departamento"
                  value={effectiveDepartamento}
                  onChange={(e) => {
                    setSelectedDepartamento(e.target.value);
                    setSelectedProvincia(DEFAULT_PROV);
                    setSelectedDistrito(DEFAULT_DIST);
                  }}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52]"
                >
                  <option value={DEFAULT_DEPTO}>{DEFAULT_DEPTO}</option>
                  {departamentosDisponibles.map((depto) => (
                    <option key={depto} value={depto}>
                      {depto}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="mapa-provincia"
                  className="block text-[11px] font-semibold tracking-wide text-slate-600 mb-1"
                >
                  PROVINCIA
                </label>
                <select
                  id="mapa-provincia"
                  value={effectiveProvincia}
                  onChange={(e) => {
                    setSelectedProvincia(e.target.value);
                    setSelectedDistrito(DEFAULT_DIST);
                  }}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52]"
                >
                  <option value={DEFAULT_PROV}>{DEFAULT_PROV}</option>
                  {provinciasDisponibles.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="mapa-distrito"
                  className="block text-[11px] font-semibold tracking-wide text-slate-600 mb-1"
                >
                  DISTRITO
                </label>
                <select
                  id="mapa-distrito"
                  value={effectiveDistrito}
                  disabled={effectiveProvincia === DEFAULT_PROV}
                  onChange={(e) => setSelectedDistrito(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:border-[#0F2D52]"
                >
                  <option value={DEFAULT_DIST}>{DEFAULT_DIST}</option>
                  {distritosDisponibles.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                Jerarquía activa:{' '}
                <span className="font-semibold text-slate-900">
                  {effectiveDepartamento}
                </span>
                {' / '}
                <span className="font-semibold text-slate-900">
                  {effectiveProvincia}
                </span>
                {' / '}
                <span className="font-semibold text-slate-900">
                  {effectiveDistrito}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePdf}
                  disabled={tableRows.length === 0}
                  className="h-9 px-3.5 text-xs font-semibold text-white bg-[#0F2D52] rounded-lg hover:bg-[#173E6E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  GUARDAR PDF
                </button>

                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="h-9 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}
                </button>
              </div>
            </div>
          </div>

          {/* Tabla Dinámica de 4 Niveles */}
          <article className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {nivelAgrupacion}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordenado descendentemente por Tasa Total (%) · Resaltado crítico superior a 2.50%
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs text-slate-600">
                {tableRows.length} registros
              </span>
            </div>

            {tableRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600">
                Active al menos uno de los interruptores territoriales (CON PRESENCIA RURAL o EXCLUSIVAMENTE URBANO) para visualizar la tabla.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[445px] overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 z-10">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold">Ubicación</th>
                      <th className="py-2.5 px-4 text-right font-semibold">IE Rurales</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Primaria (%)</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Secundaria (%)</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Tasa Total (%)</th>
                      {periodo === '2025' && (
                        <th className="py-2.5 px-4 text-right font-semibold">
                          Desertores 2025
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableRows.map((row) => {
                      const isCritical = row.tasaTotalPct > 2.5;
                      return (
                        <tr
                          key={row.ubicacion}
                          className={
                            isCritical
                              ? 'bg-red-50 text-[#991B1B] font-semibold'
                              : 'hover:bg-slate-50/80 text-slate-800'
                          }
                        >
                          <td className="py-2.5 px-4 font-medium">{row.ubicacion}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {row.ieRurales.toLocaleString('es-PE')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {row.primariaPct.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {row.secundariaPct.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                            {row.tasaTotalPct.toFixed(2)}%
                          </td>
                          {periodo === '2025' && (
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                              {(row.desertores2025 ?? 0).toLocaleString('es-PE')}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {/* Nivel 4: Desglose de colegios por grado de ruralidad */}
          {ruralityBreakdown && (
            <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold tracking-wide text-[#0F2D52] uppercase">
                Desglose de Colegios por Grado de Ruralidad ({effectiveDistrito})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
                  <div className="text-[11px] text-slate-500">
                    Ruralidad 1 (CANT_RURAL_1)
                  </div>
                  <div className="font-mono tabular-nums text-xl font-bold text-[#0F2D52] mt-1">
                    {ruralityBreakdown.cantRural1.toLocaleString('es-PE')}
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
                  <div className="text-[11px] text-slate-500">
                    Ruralidad 2 (CANT_RURAL_2)
                  </div>
                  <div className="font-mono tabular-nums text-xl font-bold text-[#0F2D52] mt-1">
                    {ruralityBreakdown.cantRural2.toLocaleString('es-PE')}
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
                  <div className="text-[11px] text-slate-500">
                    Ruralidad 3 (CANT_RURAL_3)
                  </div>
                  <div className="font-mono tabular-nums text-xl font-bold text-[#0F2D52] mt-1">
                    {ruralityBreakdown.cantRural3.toLocaleString('es-PE')}
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
