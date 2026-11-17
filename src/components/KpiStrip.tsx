import { NivelEducativoFiltro, RegistroACREnriquecido } from '../types/acr';

interface KpiStripProps {
  records: RegistroACREnriquecido[];
  nivelFiltro: NivelEducativoFiltro;
}

export function KpiStrip({ records, nivelFiltro }: KpiStripProps) {
  const count = records.length;

  // KPI 1: Promedio general combinando TASA_DESERCION_PRIMARIA y TASA_DESERCION_SECUNDARIA (* 100)
  let tasaDesercionPct = 0;
  if (count > 0) {
    if (nivelFiltro === 'Primaria') {
      tasaDesercionPct =
        (records.reduce((acc, r) => acc + r.tasaDesercionPrimaria, 0) / count) * 100;
    } else if (nivelFiltro === 'Secundaria') {
      tasaDesercionPct =
        (records.reduce((acc, r) => acc + r.tasaDesercionSecundaria, 0) / count) * 100;
    } else {
      const combinedSum = records.reduce(
        (acc, r) => acc + r.tasaDesercionPrimaria + r.tasaDesercionSecundaria,
        0
      );
      tasaDesercionPct = (combinedSum / (count * 2)) * 100;
    }
  }

  // KPI 2: (COMPUTADORAS_OPERATIVAS.sum() / COMPUTADORAS_TOTAL.sum()) * 100
  const totalComputadoras = records.reduce((acc, r) => acc + r.computadorasTotal, 0);
  const totalOperativas = records.reduce((acc, r) => acc + r.computadorasOperativas, 0);
  const pctEquiposOperativos =
    totalComputadoras > 0 ? (totalOperativas / totalComputadoras) * 100 : 0;

  // KPI 3: Promedio de PCs Operativas por Local (COMPUTADORAS_OPERATIVAS.mean())
  const promedioPcsOperativasLocal = count > 0 ? totalOperativas / count : 0;

  // KPI 4: Distritos únicos (CODGEO) cuya tasa promedio de deserción sea > 2.5% (0.025 decimal)
  const districtTotals = new Map<string, { sumDec: number; n: number }>();
  for (const r of records) {
    const prev = districtTotals.get(r.codgeo) ?? { sumDec: 0, n: 0 };
    prev.sumDec += r.tasaActivaDec;
    prev.n += 1;
    districtTotals.set(r.codgeo, prev);
  }
  const distritosTotal = districtTotals.size;
  const distritosRojos = Array.from(districtTotals.values()).filter(
    (d) => d.sumDec / d.n > 0.025
  ).length;
  const pctRojos = distritosTotal > 0 ? (distritosRojos / distritosTotal) * 100 : 0;

  // Brecha digital: TIENE_EQUIPO_RED y TIENE_SOPORTE_ENERGIA
  const localesConRed = records.reduce((acc, r) => acc + r.tieneEquipoRed, 0);
  const pctEquipoRed = count > 0 ? (localesConRed / count) * 100 : 0;
  const localesConEnergia = records.reduce((acc, r) => acc + r.tieneSoporteEnergia, 0);
  const pctSoporteEnergia = count > 0 ? (localesConEnergia / count) * 100 : 0;

  return (
    <div className="space-y-4">
      <section
        aria-label="Indicadores principales"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-slate-600">
            Tasa de Deserción Promedio
          </div>
          <div className="font-mono tabular-nums text-3xl font-semibold tracking-tight text-[#0F2D52]">
            {tasaDesercionPct.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500">
            {nivelFiltro === 'Todos'
              ? 'Promedio combinado Primaria y Secundaria'
              : `Tasa promedio nivel ${nivelFiltro}`}
          </div>
        </article>

        <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-slate-600">
            Porcentaje de Equipos Operativos
          </div>
          <div className="font-mono tabular-nums text-3xl font-semibold tracking-tight text-[#0F2D52]">
            {pctEquiposOperativos.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {totalOperativas.toLocaleString('es-PE')} operativas de{' '}
            {totalComputadoras.toLocaleString('es-PE')} totales
          </div>
        </article>

        <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-slate-600">
            Promedio de PCs Operativas por Local
          </div>
          <div className="font-mono tabular-nums text-3xl font-semibold tracking-tight text-[#0F2D52]">
            {promedioPcsOperativasLocal.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {count.toLocaleString('es-PE')} locales ·{' '}
            {totalComputadoras.toLocaleString('es-PE')} computadoras
          </div>
        </article>

        <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-slate-600">
            Distritos Prioritarios (Semáforo Rojo)
          </div>
          <div className="font-mono tabular-nums text-3xl font-semibold tracking-tight text-[#DC2626]">
            {distritosRojos}
          </div>
          <div className="text-xs text-slate-600 font-mono tabular-nums">
            {pctRojos.toFixed(1)}% de {distritosTotal} distritos (&gt; 2.5%)
          </div>
        </article>
      </section>

      <section
        aria-label="Diagnóstico de brecha digital"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <article className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">
              Locales con Equipamiento de Red / Conectividad (TIENE_EQUIPO_RED)
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              {localesConRed.toLocaleString('es-PE')} de {count.toLocaleString('es-PE')} locales filtrados
            </div>
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#2563EB] shrink-0">
            {pctEquipoRed.toFixed(1)}%
          </div>
        </article>

        <article className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-700">
              Locales con Respaldo Energético UPS / Panel Solar (TIENE_SOPORTE_ENERGIA)
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              {localesConEnergia.toLocaleString('es-PE')} de {count.toLocaleString('es-PE')} locales filtrados
            </div>
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F2D52] shrink-0">
            {pctSoporteEnergia.toFixed(1)}%
          </div>
        </article>
      </section>
    </div>
  );
}
