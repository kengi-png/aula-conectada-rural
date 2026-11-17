export type NivelEducativoFiltro = 'Todos' | 'Primaria' | 'Secundaria';

export type RuralidadTipo = 'Rural 3' | 'Rural 2' | 'Rural 1' | 'Urbano';

export type AccionSugerida =
  | 'Reparar'
  | 'Reponer'
  | 'Dotar'
  | 'Conectividad / Red'
  | 'Adecuado';

export type SemaforoEstado = 'Rojo' | 'Amarillo' | 'Verde';

/**
 * Representa las 13 columnas reales de dbo.vw_Dashboard_ACR en SQL Server.
 */
export interface RegistroACR {
  codgeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  codlocal: string;
  ugel: string;
  gradienteRuralidad: RuralidadTipo;
  /** Formato decimal desde SQL (ej. 0.0208 = 2.08%) */
  tasaDesercionPrimaria: number;
  /** Formato decimal desde SQL (ej. 0.0315 = 3.15%) */
  tasaDesercionSecundaria: number;
  computadorasTotal: number;
  computadorasOperativas: number;
  /** 1 = Sí, 0 = No */
  tieneEquipoRed: 0 | 1;
  /** 1 = Sí, 0 = No */
  tieneSoporteEnergia: 0 | 1;
}

export interface RegistroACREnriquecido extends RegistroACR {
  provinciaUgel: string;
  accionSugerida: AccionSugerida;
  pctOperatividad: number;
  tasaPrimariaPct: number;
  tasaSecundariaPct: number;
  tasaActivaDec: number;
  tasaActivaPct: number;
  semaforo: SemaforoEstado;
}

export interface FiltroACR {
  departamento: string;
  provinciaUgel: string;
  nivelEducativo: NivelEducativoFiltro;
  ruralidad: string;
}

export interface WhatIfInput {
  computadorasTotal: number;
  computadorasOperativas: number;
  gradienteRuralidad: RuralidadTipo;
  tieneEquipoRed: 0 | 1;
  tieneSoporteEnergia: 0 | 1;
}

export interface PredictionResult {
  predictedClass: SemaforoEstado;
  probabilities: Record<SemaforoEstado, number>;
  recommendedAction: AccionSugerida;
  riskDrivers: string[];
}

export interface FeatureImportanceItem {
  feature: string;
  label: string;
  importance: number;
  sourceTable: string;
}

export interface ModelEvaluation {
  accuracy: number;
  f1Macro: number;
  cvFolds: number;
  cvAccuracyMean: number;
  cvAccuracyStd: number;
  cvF1MacroMean: number;
  nEstimators: number;
  maxDepth: number;
  minSamplesLeaf: number;
  trainingSamples: number;
  testSamples: number;
  classes: SemaforoEstado[];
  confusionMatrix: number[][];
  featureImportances: FeatureImportanceItem[];
  excludedLeakageColumns: string[];
}

export type TipoDistrito = 'CON PRESENCIA RURAL' | 'EXCLUSIVAMENTE URBANO';

export type MapaPeriodo = '2023-2024' | '2025';

export interface MapaDesercionRegistro {
  ccodgeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  tipoDistrito: TipoDistrito;
  totalIeRurales: number;
  cantRural1: number;
  cantRural2: number;
  cantRural3: number;
  primariaPct: number;
  secundariaPct: number;
  tasaTotal2324: number;
  tasaTotal2025: number;
  desertores2025: number;
}

export interface MapaTablaRow {
  ubicacion: string;
  ieRurales: number;
  primariaPct: number;
  secundariaPct: number;
  tasaTotalPct: number;
  desertores2025?: number;
}
