import { useMemo, useState } from 'react';
import { describeRuralidad, enrichRegistroACR } from '../data/mineduDataset';
import { RandomForestDistrictModel } from '../ml/randomForestEngine';
import {
  RegistroACR,
  RuralidadTipo,
  SemaforoEstado,
  WhatIfInput,
} from '../types/acr';
import { downloadRfEvaluationPdfReport } from '../utils/pdfReport';

interface RandomForestViewProps {
  dataset: RegistroACR[];
}

const RURALIDAD_OPTIONS: RuralidadTipo[] = [
  'Rural 3',
  'Rural 2',
  'Rural 1',
  'Urbano',
];

const PRESETS: { label: string; values: WhatIfInput }[] = [
  {
    label: 'Sin Cómputo (Dotar · Rural 3)',
    values: {
      computadorasTotal: 0,
      computadorasOperativas: 0,
      gradienteRuralidad: 'Rural 3',
      tieneEquipoRed: 0,
      tieneSoporteEnergia: 0,
    },
  },
  {
    label: 'Equipos Inoperativos (Reponer · Rural 3)',
    values: {
      computadorasTotal: 12,
      computadorasOperativas: 0,
      gradienteRuralidad: 'Rural 3',
      tieneEquipoRed: 0,
      tieneSoporteEnergia: 1,
    },
  },
  {
    label: 'Sin Conectividad (Red · Rural 2)',
    values: {
      computadorasTotal: 18,
      computadorasOperativas: 18,
      gradienteRuralidad: 'Rural 2',
      tieneEquipoRed: 0,
      tieneSoporteEnergia: 1,
    },
  },
  {
    label: 'Parque Operativo (Adecuado · Urbano)',
    values: {
      computadorasTotal: 28,
      computadorasOperativas: 28,
      gradienteRuralidad: 'Urbano',
      tieneEquipoRed: 1,
      tieneSoporteEnergia: 1,
    },
  },
];

const SEMAFORO_STYLES: Record<
  SemaforoEstado,
  { label: string; color: string; bgSubtle: string; border: string }
> = {
  Rojo: {
    label: 'Semáforo Rojo · Riesgo Alto de Deserción (> 2.5%)',
    color: '#DC2626',
    bgSubtle: 'bg-red-50/70',
    border: 'border-red-200',
  },
  Amarillo: {
    label: 'Semáforo Amarillo · Riesgo Moderado (1.5% - 2.5%)',
    color: '#D97706',
    bgSubtle: 'bg-amber-50/70',
    border: 'border-amber-200',
  },
  Verde: {
    label: 'Semáforo Verde · Riesgo Bajo (< 1.5%)',
    color: '#16A34A',
    bgSubtle: 'bg-emerald-50/70',
    border: 'border-emerald-200',
  },
};

export function RandomForestView({ dataset }: RandomForestViewProps) {
  const model = useMemo(() => new RandomForestDistrictModel(dataset), [dataset]);
  const evaluation = useMemo(() => model.getEvaluation(), [model]);

  const [input, setInput] = useState<WhatIfInput>(PRESETS[0].values);
  const prediction = useMemo(() => model.predictWhatIf(input), [model, input]);

  const maxImportance = Math.max(
    ...evaluation.featureImportances.map((f) => f.importance),
    0.01
  );

  const highRiskDistricts = useMemo(() => {
    return dataset
      .map((row) => {
        const enriched = enrichRegistroACR(row, 'Todos');
        const res = model.predictWhatIf({
          computadorasTotal: row.computadorasTotal,
          computadorasOperativas: row.computadorasOperativas,
          gradienteRuralidad: row.gradienteRuralidad,
          tieneEquipoRed: row.tieneEquipoRed,
          tieneSoporteEnergia: row.tieneSoporteEnergia,
        });
        return {
          ...enriched,
          predictedClass: res.predictedClass,
          probRiesgoAlto: res.probabilities.Rojo * 100,
        };
      })
      .filter((item) => item.predictedClass === 'Rojo')
      .sort((a, b) => b.probRiesgoAlto - a.probRiesgoAlto);
  }, [dataset, model]);

  const predStyle = SEMAFORO_STYLES[prediction.predictedClass];
  const pctOperSim =
    input.computadorasTotal > 0
      ? (input.computadorasOperativas / input.computadorasTotal) * 100
      : 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Modelo Predictivo Random Forest Multiclase
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Regularizado (n_estimators={evaluation.nEstimators}, max_depth={evaluation.maxDepth}, min_samples_leaf={evaluation.minSamplesLeaf}, class_weight=&apos;balanced&apos;) con equipamiento, red y energía
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadRfEvaluationPdfReport(evaluation, highRiskDistricts)}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2D52] rounded-lg hover:bg-[#173E6E] active:bg-[#0A203B] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2D52]"
        >
          Exportar Evaluación RF (PDF)
        </button>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Accuracy (Holdout 20%)</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F2D52] mt-1">
            {(evaluation.accuracy * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            test_size=0.2 · stratify=y
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">F1-Score Macro</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F2D52] mt-1">
            {(evaluation.f1Macro * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Balance multiclase (Rojo / Amarillo / Verde)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">
            Validación Cruzada ({evaluation.cvFolds}-Folds)
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F2D52] mt-1">
            {(evaluation.cvAccuracyMean * 100).toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            ±{(evaluation.cvAccuracyStd * 100).toFixed(2)}% · F1 CV {(evaluation.cvF1MacroMean * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Tamaño Train / Test</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F2D52] mt-1">
            {evaluation.trainingSamples} / {evaluation.testSamples}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {evaluation.nEstimators} árboles · depth={evaluation.maxDepth} · leaf&gt;={evaluation.minSamplesLeaf}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Feature Importance & Confusion Matrix */}
        <div className="xl:col-span-6 space-y-5">
          <article className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Importancia de Variables de Infraestructura (Gini)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Peso predictivo de cómputo, red, respaldo energético y ruralidad sin tasas de deserción
            </p>

            <div className="space-y-3">
              {evaluation.featureImportances.map((item) => {
                const barWidth = (item.importance / maxImportance) * 100;
                return (
                  <div key={item.feature}>
                    <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                      <span className="font-medium text-slate-800 truncate">
                        {item.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-700 shrink-0">
                        {(item.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#0F2D52] rounded transition-all duration-200"
                        style={{ width: `${Math.max(barWidth, 3)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Tabla: dbo.{item.sourceTable}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Matriz de Confusión Multiclase (Conjunto de Prueba 20%)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filas: clase real MINEDU · Columnas: predicción Random Forest
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-2 px-3 text-left font-medium">Real \ Predicho</th>
                    {evaluation.classes.map((cls) => (
                      <th key={cls} className="py-2 px-3 text-right font-semibold">
                        {cls}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {evaluation.classes.map((realCls, i) => (
                    <tr key={realCls}>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                        {realCls}
                      </td>
                      {evaluation.confusionMatrix[i].map((val, j) => (
                        <td
                          key={`${realCls}-${j}`}
                          className={`py-2 px-3 text-right ${
                            i === j
                              ? 'font-semibold text-[#0F2D52] bg-slate-50'
                              : 'text-slate-500'
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                Columnas excluidas contra fuga de información:
              </span>{' '}
              <span className="font-mono text-slate-700">
                {evaluation.excludedLeakageColumns.join(', ')}
              </span>
            </div>
          </article>
        </div>

        {/* Right: What-If Multiclass Simulator */}
        <article className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Simulador What-If de Riesgo por Local Escolar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inferencia en memoria sobre el modelo entrenado (respuesta en milisegundos)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setInput(preset.values)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="sim-total" className="font-medium text-slate-700">
                  Computadoras Totales (COMPUTADORAS_TOTAL)
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {input.computadorasTotal} equipos
                </span>
              </div>
              <input
                id="sim-total"
                type="range"
                min={0}
                max={45}
                step={1}
                value={input.computadorasTotal}
                onChange={(e) => {
                  const nextTotal = Number(e.target.value);
                  setInput({
                    ...input,
                    computadorasTotal: nextTotal,
                    computadorasOperativas: Math.min(input.computadorasOperativas, nextTotal),
                  });
                }}
                className="w-full accent-[#0F2D52] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="sim-operativas" className="font-medium text-slate-700">
                  Computadoras Operativas (COMPUTADORAS_OPERATIVAS)
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {input.computadorasOperativas} equipos ({pctOperSim.toFixed(0)}%)
                </span>
              </div>
              <input
                id="sim-operativas"
                type="range"
                min={0}
                max={Math.max(input.computadorasTotal, 1)}
                step={1}
                disabled={input.computadorasTotal === 0}
                value={input.computadorasOperativas}
                onChange={(e) =>
                  setInput({
                    ...input,
                    computadorasOperativas: Math.min(
                      Number(e.target.value),
                      input.computadorasTotal
                    ),
                  })
                }
                className="w-full accent-[#0F2D52] cursor-pointer disabled:opacity-40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={input.tieneEquipoRed === 1}
                onClick={() =>
                  setInput({
                    ...input,
                    tieneEquipoRed: input.tieneEquipoRed === 1 ? 0 : 1,
                  })
                }
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  input.tieneEquipoRed === 1
                    ? 'bg-blue-50/70 border-[#2563EB] text-[#0F2D52]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="text-left">Equipamiento de Red (Router/Módem)</span>
                <span
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                    input.tieneEquipoRed === 1 ? 'bg-[#0F2D52] justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={input.tieneSoporteEnergia === 1}
                onClick={() =>
                  setInput({
                    ...input,
                    tieneSoporteEnergia: input.tieneSoporteEnergia === 1 ? 0 : 1,
                  })
                }
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  input.tieneSoporteEnergia === 1
                    ? 'bg-blue-50/70 border-[#2563EB] text-[#0F2D52]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="text-left">Respaldo Energético (UPS/Panel Solar)</span>
                <span
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                    input.tieneSoporteEnergia === 1 ? 'bg-[#0F2D52] justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </span>
              </button>
            </div>

            <div>
              <label
                htmlFor="sim-ruralidad"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Gradiente de Ruralidad (Definición oficial MINEDU)
              </label>
              <select
                id="sim-ruralidad"
                value={input.gradienteRuralidad}
                onChange={(e) =>
                  setInput({
                    ...input,
                    gradienteRuralidad: e.target.value as RuralidadTipo,
                  })
                }
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0F2D52]"
              >
                {RURALIDAD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {describeRuralidad(input.gradienteRuralidad)}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${predStyle.border} ${predStyle.bgSubtle} space-y-4`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-slate-600">
                  Predicción del Ensamble Random Forest
                </div>
                <div
                  className="text-base font-bold mt-0.5"
                  style={{ color: predStyle.color }}
                >
                  {predStyle.label}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Acción Sugerida</div>
                <div className="text-sm font-semibold text-slate-900">
                  {prediction.recommendedAction}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {(['Rojo', 'Amarillo', 'Verde'] as SemaforoEstado[]).map((cls) => {
                const pct = prediction.probabilities[cls] * 100;
                const barColor = SEMAFORO_STYLES[cls].color;
                return (
                  <div key={cls} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-medium text-slate-700">{cls}</span>
                    <div className="flex-1 h-2.5 bg-white/80 rounded overflow-hidden border border-slate-200/70">
                      <div
                        className="h-full transition-all duration-200"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="w-14 text-right font-mono tabular-nums font-semibold text-slate-800">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200/70">
              <div className="text-xs font-semibold text-slate-800 mb-1">
                Factores determinantes detectados:
              </div>
              <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
                {prediction.riskDrivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </div>

      {/* Tabla de Locales y Distritos Clasificados en Riesgo Alto */}
      <article className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Locales y Distritos Clasificados en Riesgo Alto (Modelo Random Forest)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inferencia supervisada sobre cómputo, red (TIENE_EQUIPO_RED), energía (TIENE_SOPORTE_ENERGIA) y ruralidad
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs font-semibold text-[#991B1B]">
            {highRiskDistricts.length} registros en Riesgo Alto
          </span>
        </div>

        {highRiskDistricts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            No se detectaron locales clasificados en riesgo alto con la configuración actual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold">CODGEO</th>
                  <th className="py-2.5 px-4 text-left font-semibold">CODLOCAL</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Departamento</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Distrito</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Ruralidad</th>
                  <th className="py-2.5 px-4 text-right font-semibold">PCs Op. / Total</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Red</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Energía</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Prob. Riesgo Alto</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Clasificación RF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highRiskDistricts.map((row) => (
                  <tr key={`${row.codlocal}-hr`} className="hover:bg-red-50/40 text-slate-800">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                      {row.codgeo}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                      {row.codlocal}
                    </td>
                    <td className="py-2.5 px-4 font-medium">{row.departamento}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {row.distrito}
                    </td>
                    <td className="py-2.5 px-4">{row.gradienteRuralidad}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {row.computadorasOperativas} / {row.computadorasTotal}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium">
                      {row.tieneEquipoRed === 1 ? 'Sí' : 'No'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium">
                      {row.tieneSoporteEnergia === 1 ? 'Sí' : 'No'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#991B1B]">
                      {row.probRiesgoAlto.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#DC2626]">
                      Riesgo Alto (Rojo)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
