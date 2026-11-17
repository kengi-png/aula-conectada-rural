import { useMemo, useState } from 'react';
import { ArrowDownUp, Download, Search, X } from 'lucide-react';
import {
  AccionSugerida,
  RegistroACREnriquecido,
  SemaforoEstado,
} from '../types/acr';
import { downloadDistrictsCsv } from '../utils/exportProject';

interface PriorityDistrictsTableProps {
  records: RegistroACREnriquecido[];
  selectedAction: AccionSugerida | null;
  selectedSemaforo: SemaforoEstado | null;
  onClearChartFilters: () => void;
}

type SortKey =
  | 'tasaActivaPct'
  | 'pctOperatividad'
  | 'computadorasOperativas'
  | 'computadorasTotal'
  | 'distrito';

export function PriorityDistrictsTable({
  records,
  selectedAction,
  selectedSemaforo,
  onClearChartFilters,
}: PriorityDistrictsTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('tasaActivaPct');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter((r) => {
        if (selectedAction && r.accionSugerida !== selectedAction) return false;
        if (selectedSemaforo && r.semaforo !== selectedSemaforo) return false;
        if (!q) return true;
        return (
          r.distrito.toLowerCase().includes(q) ||
          r.departamento.toLowerCase().includes(q) ||
          r.ugel.toLowerCase().includes(q) ||
          r.codgeo.includes(q) ||
          r.codlocal.includes(q)
        );
      })
      .sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      });
  }, [records, selectedAction, selectedSemaforo, search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'distrito');
    }
  };

  const renderSemaforoText = (semaforo: SemaforoEstado) => {
    if (semaforo === 'Rojo') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
          <span className="w-2 h-2 rounded-[2px] bg-[#DC2626] shrink-0" aria-hidden="true" />
          Rojo · Crítico
        </span>
      );
    }
    if (semaforo === 'Amarillo') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
          <span className="w-2 h-2 rounded-[2px] bg-[#D97706] shrink-0" aria-hidden="true" />
          Amarillo · Alerta
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
        <span className="w-2 h-2 rounded-[2px] bg-[#16A34A] shrink-0" aria-hidden="true" />
        Verde · Bajo
      </span>
    );
  };

  return (
    <section
      aria-label="Tabla de locales escolares prioritarios"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Locales Escolares y Distritos Prioritarios (dbo.vw_Dashboard_ACR)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Detalle por CODLOCAL y CODGEO con equipamiento de cómputo y tasas reales de deserción
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(selectedAction || selectedSemaforo) && (
            <button
              type="button"
              onClick={onClearChartFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#0F2D52] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Filtro gráfico:{' '}
                {[selectedAction, selectedSemaforo].filter(Boolean).join(' · ')}
              </span>
            </button>
          )}

          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar distrito, CODLOCAL o CODGEO..."
              aria-label="Buscar distrito, CODLOCAL o CODGEO"
              className="h-9 pl-8 pr-3 w-64 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F2D52] focus:ring-2 focus:ring-[#0F2D52]/15"
            />
          </div>

          <button
            type="button"
            onClick={() => downloadDistrictsCsv(filteredRows)}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800">
            No se encontraron locales para los filtros aplicados.
          </p>
          <p className="text-xs text-slate-500">
            Ajusta tu búsqueda o limpia los filtros activos de los gráficos.
          </p>
          {(selectedAction || selectedSemaforo || search) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onClearChartFilters();
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F2D52] rounded-lg hover:bg-[#173E6E] cursor-pointer"
            >
              Limpiar filtros de tabla
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">CODGEO / CODLOCAL</th>
                <th className="py-2.5 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('distrito')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Distrito / Departamento</span>
                    <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-2.5 px-4 whitespace-nowrap">UGEL · Ruralidad</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Semáforo</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('computadorasOperativas')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    <span>PCs Op. / Total</span>
                    <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('pctOperatividad')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    <span>% Operat.</span>
                    <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Red</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Energía</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Primaria</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Secundaria</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('tasaActivaPct')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    <span>Deserción Prom.</span>
                    <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-2.5 px-4 whitespace-nowrap">Acción Sugerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.map((r) => (
                <tr key={r.codlocal} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                    <div className="text-slate-900 font-medium">{r.codlocal}</div>
                    <div className="text-[11px] text-slate-500">{r.codgeo}</div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{r.distrito}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.departamento} · {r.provincia}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="text-slate-700">{r.ugel}</div>
                    <div className="text-[11px] text-slate-500">{r.gradienteRuralidad}</div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {renderSemaforoText(r.semaforo)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {r.computadorasOperativas} / {r.computadorasTotal}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {r.pctOperatividad.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium">
                    <span className={r.tieneEquipoRed === 1 ? 'text-[#15803D]' : 'text-[#DC2626]'}>
                      {r.tieneEquipoRed === 1 ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium">
                    <span className={r.tieneSoporteEnergia === 1 ? 'text-[#15803D]' : 'text-[#D97706]'}>
                      {r.tieneSoporteEnergia === 1 ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {r.tasaPrimariaPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {r.tasaSecundariaPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {r.tasaActivaPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                    {r.accionSugerida}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
