import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ChartsGrid } from './components/ChartsGrid';
import { KpiStrip } from './components/KpiStrip';
import { MapaDesercionView } from './components/MapaDesercionView';
import { PriorityDistrictsTable } from './components/PriorityDistrictsTable';
import { RandomForestView } from './components/RandomForestView';
import { SidebarFilters } from './components/SidebarFilters';
import { ActiveTab, TopBar } from './components/TopBar';
import { MINEDU_DATASET, enrichRegistroACR } from './data/mineduDataset';
import { AccionSugerida, FiltroACR, SemaforoEstado } from './types/acr';
import { downloadExecutivePdfReport } from './utils/pdfReport';

const DEFAULT_FILTERS: FiltroACR = {
  departamento: 'Todos',
  provinciaUgel: 'Todas',
  nivelEducativo: 'Todos',
  ruralidad: 'Todas',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [filters, setFilters] = useState<FiltroACR>(DEFAULT_FILTERS);
  const [selectedAction, setSelectedAction] = useState<AccionSugerida | null>(null);
  const [selectedSemaforo, setSelectedSemaforo] = useState<SemaforoEstado | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mapaFullscreen, setMapaFullscreen] = useState(false);

  const departamentos = useMemo(
    () =>
      Array.from(new Set(MINEDU_DATASET.map((r) => r.departamento))).sort((a, b) =>
        a.localeCompare(b)
      ),
    []
  );

  const provinciasUgel = useMemo(() => {
    const scope =
      filters.departamento === 'Todos'
        ? MINEDU_DATASET
        : MINEDU_DATASET.filter((r) => r.departamento === filters.departamento);
    return Array.from(new Set(scope.map((r) => `${r.provincia} / ${r.ugel}`))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [filters.departamento]);

  const niveles = ['Primaria', 'Secundaria'];
  const ruralidades = ['Rural 3', 'Rural 2', 'Rural 1', 'Urbano'];

  const filteredRecords = useMemo(() => {
    return MINEDU_DATASET.filter((r) => {
      if (filters.departamento !== 'Todos' && r.departamento !== filters.departamento) {
        return false;
      }
      if (
        filters.provinciaUgel !== 'Todas' &&
        `${r.provincia} / ${r.ugel}` !== filters.provinciaUgel
      ) {
        return false;
      }
      if (
        filters.ruralidad !== 'Todas' &&
        r.gradienteRuralidad !== filters.ruralidad
      ) {
        return false;
      }
      return true;
    }).map((r) => enrichRegistroACR(r, filters.nivelEducativo));
  }, [filters]);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedAction(null);
    setSelectedSemaforo(null);
  };

  const handleDownloadPdf = () => {
    downloadExecutivePdfReport({
      filters,
      records: filteredRecords,
      fullDataset: MINEDU_DATASET,
    });
  };

  const isMapFullscreen = activeTab === 'mapa' && mapaFullscreen;

  const handleTabChange = (tab: ActiveTab) => {
    if (tab !== 'mapa' && mapaFullscreen) {
      setMapaFullscreen(false);
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {!isMapFullscreen && (
        <TopBar activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      <div
        className={`flex-1 flex w-full mx-auto ${
          isMapFullscreen ? 'max-w-full' : 'max-w-[1440px]'
        }`}
      >
        {activeTab === 'dashboard' && (
          <SidebarFilters
            filters={filters}
            departamentos={departamentos}
            provinciasUgel={provinciasUgel}
            niveles={niveles}
            ruralidades={ruralidades}
            totalFilteredCount={filteredRecords.length}
            totalCount={MINEDU_DATASET.length}
            onChange={(next) => {
              setFilters(next);
            }}
            onReset={handleResetFilters}
            mobileOpen={mobileFiltersOpen}
            onCloseMobile={() => setMobileFiltersOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Monitoreo de Infraestructura TIC y Deserción Escolar Rural
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Universidad César Vallejo · Base Proyecto_ACR · Vista unificada dbo.vw_Dashboard_ACR (MINEDU)
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Filtros Territoriales</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={filteredRecords.length === 0}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2D52] rounded-lg hover:bg-[#173E6E] active:bg-[#0A203B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2D52]"
                  >
                    Descargar Reporte PDF
                  </button>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <section className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    Sin registros para la combinación territorial seleccionada
                  </h2>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Los filtros actuales no devuelven locales escolares rurales en la vista consolidada MINEDU.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2D52] rounded-lg hover:bg-[#173E6E] cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                </section>
              ) : (
                <>
                  <KpiStrip
                    records={filteredRecords}
                    nivelFiltro={filters.nivelEducativo}
                  />

                  <ChartsGrid
                    records={filteredRecords}
                    selectedAction={selectedAction}
                    selectedSemaforo={selectedSemaforo}
                    onSelectAction={setSelectedAction}
                    onSelectSemaforo={setSelectedSemaforo}
                  />

                  <PriorityDistrictsTable
                    records={filteredRecords}
                    selectedAction={selectedAction}
                    selectedSemaforo={selectedSemaforo}
                    onClearChartFilters={() => {
                      setSelectedAction(null);
                      setSelectedSemaforo(null);
                    }}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'mapa' && (
            <MapaDesercionView
              isFullscreen={isMapFullscreen}
              onToggleFullscreen={() => setMapaFullscreen((v) => !v)}
            />
          )}

          {activeTab === 'ai' && <RandomForestView dataset={MINEDU_DATASET} />}
        </main>
      </div>
    </div>
  );
}
