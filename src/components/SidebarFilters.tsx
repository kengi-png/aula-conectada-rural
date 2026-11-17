import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { FiltroACR, NivelEducativoFiltro } from '../types/acr';

interface SidebarFiltersProps {
  filters: FiltroACR;
  departamentos: string[];
  provinciasUgel: string[];
  niveles: string[];
  ruralidades: string[];
  totalFilteredCount: number;
  totalCount: number;
  onChange: (next: FiltroACR) => void;
  onReset: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarFilters({
  filters,
  departamentos,
  provinciasUgel,
  niveles,
  ruralidades,
  totalFilteredCount,
  totalCount,
  onChange,
  onReset,
  mobileOpen,
  onCloseMobile,
}: SidebarFiltersProps) {
  const hasActiveFilters =
    filters.departamento !== 'Todos' ||
    filters.provinciaUgel !== 'Todas' ||
    filters.nivelEducativo !== 'Todos' ||
    filters.ruralidad !== 'Todas';

  const content = (
    <div className="flex flex-col h-full justify-between p-5 bg-white">
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0F2D52]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Filtros Territoriales</h2>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
            aria-label="Cerrar panel de filtros"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="filter-departamento"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Departamento
            </label>
            <select
              id="filter-departamento"
              value={filters.departamento}
              onChange={(e) =>
                onChange({
                  ...filters,
                  departamento: e.target.value,
                  provinciaUgel: 'Todas',
                })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52] focus:ring-2 focus:ring-[#0F2D52]/15"
            >
              <option value="Todos">Todos los departamentos</option>
              {departamentos.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-ugel"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Provincia / UGEL
            </label>
            <select
              id="filter-ugel"
              value={filters.provinciaUgel}
              onChange={(e) =>
                onChange({
                  ...filters,
                  provinciaUgel: e.target.value,
                })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52] focus:ring-2 focus:ring-[#0F2D52]/15"
            >
              <option value="Todas">Todas las provincias / UGEL</option>
              {provinciasUgel.map((pu) => (
                <option key={pu} value={pu}>
                  {pu}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-nivel"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Nivel Educativo
            </label>
            <select
              id="filter-nivel"
              value={filters.nivelEducativo}
              onChange={(e) =>
                onChange({
                  ...filters,
                  nivelEducativo: e.target.value as NivelEducativoFiltro,
                })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52] focus:ring-2 focus:ring-[#0F2D52]/15"
            >
              <option value="Todos">Primaria y Secundaria</option>
              {niveles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-ruralidad"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Gradiente de Ruralidad
            </label>
            <select
              id="filter-ruralidad"
              value={filters.ruralidad}
              onChange={(e) =>
                onChange({
                  ...filters,
                  ruralidad: e.target.value,
                })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52] focus:ring-2 focus:ring-[#0F2D52]/15"
            >
              <option value="Todas">Todos los gradientes</option>
              {ruralidades.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="w-full h-10 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restablecer filtros</span>
          </button>
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-200 space-y-2 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Cobertura filtrada</p>
        <p className="font-mono tabular-nums text-slate-900">
          {totalFilteredCount} / {totalCount} locales escolares
        </p>
        <p className="leading-relaxed">
          Fuente: Proyecto_ACR · Vista dbo.vw_Dashboard_ACR · Padrón Rural MINEDU
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        aria-label="Barra lateral de filtros"
        className="hidden lg:block w-[264px] shrink-0 border-r border-slate-200 bg-white"
      >
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">{content}</div>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-[280px] max-w-[85vw] h-full bg-white border-r border-slate-200 overflow-y-auto">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
