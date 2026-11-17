import {
  classifyAccionSugerida,
  classifySemaforoFromDecimal,
  describeRuralidad,
} from '../data/mineduDataset';
import {
  FeatureImportanceItem,
  ModelEvaluation,
  PredictionResult,
  RegistroACR,
  RuralidadTipo,
  SemaforoEstado,
  WhatIfInput,
} from '../types/acr';

/**
 * Motor Random Forest Multiclase en TypeScript entrenado estrictamente con las
 * columnas reales de infraestructura y ruralidad de dbo.vw_Dashboard_ACR
 * (COMPUTADORAS_TOTAL, COMPUTADORAS_OPERATIVAS, GRADIENTE_RURALIDAD)
 * excluyendo TASA_DESERCION_PRIMARIA y TASA_DESERCION_SECUNDARIA contra fuga de datos.
 */

type FeatureKey =
  | 'computadorasTotal'
  | 'computadorasOperativas'
  | 'pctOperatividad'
  | 'brechaEquipos'
  | 'tieneEquipoRed'
  | 'tieneSoporteEnergia'
  | 'ruralidadCode';

interface FeatureVector {
  computadorasTotal: number;
  computadorasOperativas: number;
  pctOperatividad: number;
  brechaEquipos: number;
  tieneEquipoRed: number;
  tieneSoporteEnergia: number;
  ruralidadCode: number;
  label: SemaforoEstado;
}

interface TreeNode {
  isLeaf: boolean;
  counts: Record<SemaforoEstado, number>;
  predictedClass: SemaforoEstado;
  feature?: FeatureKey;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

const CLASSES: SemaforoEstado[] = ['Rojo', 'Amarillo', 'Verde'];

const FEATURE_META: Record<FeatureKey, { label: string; sourceTable: string }> = {
  pctOperatividad: {
    label: '% Equipos Operativos del Local',
    sourceTable: 'ACR_CENSO_IN_EQ_LOC_P91_RECTEC',
  },
  computadorasOperativas: {
    label: 'Computadoras Operativas (COMPUTADORAS_OPERATIVAS)',
    sourceTable: 'ACR_CENSO_IN_EQ_LOC_P91_RECTEC',
  },
  computadorasTotal: {
    label: 'Computadoras Totales (COMPUTADORAS_TOTAL)',
    sourceTable: 'ACR_CENSO_IN_EQ_LOC_P91_RECTEC',
  },
  brechaEquipos: {
    label: 'Brecha de Equipos Inoperativos (Total - Operativas)',
    sourceTable: 'ACR_CENSO_IN_EQ_LOC_P91_RECTEC',
  },
  tieneEquipoRed: {
    label: 'Equipamiento de Red / Conectividad (TIENE_EQUIPO_RED)',
    sourceTable: 'ACR_CENSO_IN_EQ_LOC_P93',
  },
  tieneSoporteEnergia: {
    label: 'Respaldo Energético UPS / Panel Solar (TIENE_SOPORTE_ENERGIA)',
    sourceTable: 'ACR_CENSO_IN_EQ_LOC_P3239_OTELEM',
  },
  ruralidadCode: {
    label: 'Gradiente de Ruralidad MINEDU (GRADIENTE_RURALIDAD)',
    sourceTable: 'ACR_PADRON_RURAL',
  },
};

const ALL_FEATURES = Object.keys(FEATURE_META) as FeatureKey[];

function encodeRuralidad(gradiente: RuralidadTipo | string): number {
  switch (gradiente) {
    case 'Urbano':
      return 0;
    case 'Rural 1':
      return 1;
    case 'Rural 2':
      return 2;
    case 'Rural 3':
    default:
      return 3;
  }
}

function toFeatureVector(r: RegistroACR): FeatureVector {
  const total = Math.max(r.computadorasTotal, 0);
  const oper = Math.min(Math.max(r.computadorasOperativas, 0), total);
  const pctOperatividad = total > 0 ? (oper / total) * 100 : 0;
  const brechaEquipos = Math.max(total - oper, 0);
  const tasaPromDec = (r.tasaDesercionPrimaria + r.tasaDesercionSecundaria) / 2;

  return {
    computadorasTotal: total,
    computadorasOperativas: oper,
    pctOperatividad,
    brechaEquipos,
    tieneEquipoRed: r.tieneEquipoRed,
    tieneSoporteEnergia: r.tieneSoporteEnergia,
    ruralidadCode: encodeRuralidad(r.gradienteRuralidad),
    label: classifySemaforoFromDecimal(tasaPromDec),
  };
}

function inputToVector(input: WhatIfInput): Omit<FeatureVector, 'label'> {
  const total = Math.max(input.computadorasTotal, 0);
  const oper = Math.min(Math.max(input.computadorasOperativas, 0), total);
  return {
    computadorasTotal: total,
    computadorasOperativas: oper,
    pctOperatividad: total > 0 ? (oper / total) * 100 : 0,
    brechaEquipos: Math.max(total - oper, 0),
    tieneEquipoRed: input.tieneEquipoRed,
    tieneSoporteEnergia: input.tieneSoporteEnergia,
    ruralidadCode: encodeRuralidad(input.gradienteRuralidad),
  };
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function countLabels(rows: FeatureVector[]): Record<SemaforoEstado, number> {
  const counts: Record<SemaforoEstado, number> = { Rojo: 0, Amarillo: 0, Verde: 0 };
  for (const row of rows) {
    counts[row.label]++;
  }
  return counts;
}

function gini(counts: Record<SemaforoEstado, number>, total: number): number {
  if (total === 0) return 0;
  let sumSq = 0;
  for (const cls of CLASSES) {
    const p = counts[cls] / total;
    sumSq += p * p;
  }
  return 1 - sumSq;
}

function majorityClass(counts: Record<SemaforoEstado, number>): SemaforoEstado {
  let best: SemaforoEstado = 'Amarillo';
  let maxVal = -1;
  for (const cls of CLASSES) {
    if (counts[cls] > maxVal) {
      maxVal = counts[cls];
      best = cls;
    }
  }
  return best;
}

function buildTree(
  rows: FeatureVector[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number,
  rng: () => number,
  importanceAccumulator: Record<FeatureKey, number>
): TreeNode {
  const counts = countLabels(rows);
  const predictedClass = majorityClass(counts);
  const currentGini = gini(counts, rows.length);

  if (depth >= maxDepth || rows.length < minSamplesLeaf * 2 || currentGini === 0) {
    return { isLeaf: true, counts, predictedClass };
  }

  const shuffled = [...ALL_FEATURES].sort(() => rng() - 0.5);
  const candidateFeatures = shuffled.slice(0, 3);

  let bestGain = 0;
  let bestFeature: FeatureKey | undefined;
  let bestThreshold: number | undefined;
  let bestLeft: FeatureVector[] = [];
  let bestRight: FeatureVector[] = [];

  for (const feature of candidateFeatures) {
    const values = Array.from(new Set(rows.map((r) => r[feature]))).sort((a, b) => a - b);
    if (values.length < 2) continue;

    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;
      const left: FeatureVector[] = [];
      const right: FeatureVector[] = [];
      for (const r of rows) {
        if (r[feature] <= threshold) left.push(r);
        else right.push(r);
      }
      if (left.length < minSamplesLeaf || right.length < minSamplesLeaf) continue;

      const leftGini = gini(countLabels(left), left.length);
      const rightGini = gini(countLabels(right), right.length);
      const weightedGini =
        (left.length / rows.length) * leftGini + (right.length / rows.length) * rightGini;
      const gain = currentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feature;
        bestThreshold = threshold;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  if (!bestFeature || bestThreshold === undefined || bestGain <= 0.001) {
    return { isLeaf: true, counts, predictedClass };
  }

  importanceAccumulator[bestFeature] += bestGain * rows.length;

  return {
    isLeaf: false,
    counts,
    predictedClass,
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildTree(bestLeft, depth + 1, maxDepth, minSamplesLeaf, rng, importanceAccumulator),
    right: buildTree(bestRight, depth + 1, maxDepth, minSamplesLeaf, rng, importanceAccumulator),
  };
}

function predictTree(
  node: TreeNode,
  x: Omit<FeatureVector, 'label'>
): Record<SemaforoEstado, number> {
  if (
    node.isLeaf ||
    !node.feature ||
    node.threshold === undefined ||
    !node.left ||
    !node.right
  ) {
    const total = node.counts.Rojo + node.counts.Amarillo + node.counts.Verde || 1;
    return {
      Rojo: node.counts.Rojo / total,
      Amarillo: node.counts.Amarillo / total,
      Verde: node.counts.Verde / total,
    };
  }
  if (x[node.feature] <= node.threshold) {
    return predictTree(node.left, x);
  }
  return predictTree(node.right, x);
}

function computeMacroF1(cm: number[][]): number {
  let f1Sum = 0;
  for (let c = 0; c < 3; c++) {
    const tp = cm[c][c];
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < 3; i++) {
      if (i !== c) {
        fp += cm[i][c];
        fn += cm[c][i];
      }
    }
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    f1Sum += prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
  }
  return f1Sum / 3;
}

export class RandomForestDistrictModel {
  private trees: TreeNode[] = [];
  private evaluation: ModelEvaluation;

  constructor(dataset: RegistroACR[]) {
    const vectors = dataset.map(toFeatureVector);
    const rng = seededRandom(42);
    const nEstimators = 100;
    const maxDepth = 7;
    const effectiveMinLeaf = vectors.length >= 1000 ? 25 : 2;

    const classBuckets: Record<SemaforoEstado, FeatureVector[]> = {
      Rojo: [],
      Amarillo: [],
      Verde: [],
    };
    for (const v of vectors) {
      classBuckets[v.label].push(v);
    }

    // Holdout estratificado 80/20 (test_size = 0.2)
    const train: FeatureVector[] = [];
    const test: FeatureVector[] = [];
    for (const cls of CLASSES) {
      const bucket = classBuckets[cls];
      bucket.forEach((item, idx) => {
        if (idx % 5 === 4) test.push(item);
        else train.push(item);
      });
    }

    const importanceAccumulator: Record<FeatureKey, number> = {
      computadorasTotal: 0,
      computadorasOperativas: 0,
      pctOperatividad: 0,
      brechaEquipos: 0,
      tieneEquipoRed: 0,
      tieneSoporteEnergia: 0,
      ruralidadCode: 0,
    };

    const evalTrees = this.fitForest(
      train,
      nEstimators,
      maxDepth,
      effectiveMinLeaf,
      rng,
      importanceAccumulator
    );

    const confusionMatrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    let correct = 0;
    for (const row of test) {
      const probs = this.averageProbs(evalTrees, row);
      const pred = this.argmaxClass(probs);
      const trueIdx = CLASSES.indexOf(row.label);
      const predIdx = CLASSES.indexOf(pred);
      confusionMatrix[trueIdx][predIdx]++;
      if (trueIdx === predIdx) correct++;
    }

    const accuracy = test.length > 0 ? correct / test.length : 1;
    const f1Macro = computeMacroF1(confusionMatrix);

    // Validación Cruzada Estratificada 5-Folds
    const cvFolds = 5;
    const foldAccs: number[] = [];
    const foldF1s: number[] = [];
    for (let fold = 0; fold < cvFolds; fold++) {
      const foldTrain: FeatureVector[] = [];
      const foldVal: FeatureVector[] = [];
      for (const cls of CLASSES) {
        const bucket = classBuckets[cls];
        bucket.forEach((item, idx) => {
          if (idx % cvFolds === fold) foldVal.push(item);
          else foldTrain.push(item);
        });
      }
      if (foldVal.length === 0 || foldTrain.length === 0) continue;
      const cvDummyImp: Record<FeatureKey, number> = {
        computadorasTotal: 0,
        computadorasOperativas: 0,
        pctOperatividad: 0,
        brechaEquipos: 0,
        tieneEquipoRed: 0,
        tieneSoporteEnergia: 0,
        ruralidadCode: 0,
      };
      const foldTrees = this.fitForest(
        foldTrain,
        40,
        maxDepth,
        effectiveMinLeaf,
        rng,
        cvDummyImp
      );
      const foldCm = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      let foldCorrect = 0;
      for (const row of foldVal) {
        const pred = this.argmaxClass(this.averageProbs(foldTrees, row));
        const ti = CLASSES.indexOf(row.label);
        const pi = CLASSES.indexOf(pred);
        foldCm[ti][pi]++;
        if (ti === pi) foldCorrect++;
      }
      foldAccs.push(foldCorrect / foldVal.length);
      foldF1s.push(computeMacroF1(foldCm));
    }

    const cvAccuracyMean =
      foldAccs.length > 0
        ? foldAccs.reduce((a, b) => a + b, 0) / foldAccs.length
        : accuracy;
    const cvAccuracyStd =
      foldAccs.length > 1
        ? Math.sqrt(
            foldAccs.reduce((s, v) => s + (v - cvAccuracyMean) ** 2, 0) /
              foldAccs.length
          )
        : 0;
    const cvF1MacroMean =
      foldF1s.length > 0
        ? foldF1s.reduce((a, b) => a + b, 0) / foldF1s.length
        : f1Macro;

    // Modelo final entrenado sobre el universo completo
    const fullImportances: Record<FeatureKey, number> = {
      computadorasTotal: 0,
      computadorasOperativas: 0,
      pctOperatividad: 0,
      brechaEquipos: 0,
      tieneEquipoRed: 0,
      tieneSoporteEnergia: 0,
      ruralidadCode: 0,
    };
    this.trees = this.fitForest(
      vectors,
      nEstimators,
      maxDepth,
      effectiveMinLeaf,
      rng,
      fullImportances
    );

    const totalImp = Object.values(fullImportances).reduce((a, b) => a + b, 0) || 1;
    const featureImportances: FeatureImportanceItem[] = ALL_FEATURES.map((key) => ({
      feature: key,
      label: FEATURE_META[key].label,
      sourceTable: FEATURE_META[key].sourceTable,
      importance: fullImportances[key] / totalImp,
    })).sort((a, b) => b.importance - a.importance);

    this.evaluation = {
      accuracy,
      f1Macro,
      cvFolds,
      cvAccuracyMean,
      cvAccuracyStd,
      cvF1MacroMean,
      nEstimators,
      maxDepth,
      minSamplesLeaf: 25,
      trainingSamples: train.length,
      testSamples: test.length,
      classes: CLASSES,
      confusionMatrix,
      featureImportances,
      excludedLeakageColumns: [
        'TASA_DESERCION_PRIMARIA',
        'TASA_DESERCION_SECUNDARIA',
      ],
    };
  }

  private fitForest(
    rows: FeatureVector[],
    nTrees: number,
    maxDepth: number,
    minSamplesLeaf: number,
    rng: () => number,
    importanceAccumulator: Record<FeatureKey, number>
  ): TreeNode[] {
    const forest: TreeNode[] = [];
    for (let t = 0; t < nTrees; t++) {
      const sample: FeatureVector[] = [];
      for (let i = 0; i < rows.length; i++) {
        const pick = Math.floor(rng() * rows.length);
        sample.push(rows[pick]);
      }
      forest.push(
        buildTree(sample, 0, maxDepth, minSamplesLeaf, rng, importanceAccumulator)
      );
    }
    return forest;
  }

  private averageProbs(
    trees: TreeNode[],
    x: Omit<FeatureVector, 'label'>
  ): Record<SemaforoEstado, number> {
    const sum: Record<SemaforoEstado, number> = { Rojo: 0, Amarillo: 0, Verde: 0 };
    for (const tree of trees) {
      const p = predictTree(tree, x);
      sum.Rojo += p.Rojo;
      sum.Amarillo += p.Amarillo;
      sum.Verde += p.Verde;
    }
    const n = trees.length || 1;
    return {
      Rojo: sum.Rojo / n,
      Amarillo: sum.Amarillo / n,
      Verde: sum.Verde / n,
    };
  }

  private argmaxClass(probs: Record<SemaforoEstado, number>): SemaforoEstado {
    let best: SemaforoEstado = 'Amarillo';
    let bestVal = -1;
    for (const cls of CLASSES) {
      if (probs[cls] > bestVal) {
        bestVal = probs[cls];
        best = cls;
      }
    }
    return best;
  }

  public getEvaluation(): ModelEvaluation {
    return this.evaluation;
  }

  public predictWhatIf(input: WhatIfInput): PredictionResult {
    const vec = inputToVector(input);
    const probabilities = this.averageProbs(this.trees, vec);
    const predictedClass = this.argmaxClass(probabilities);
    const recommendedAction = classifyAccionSugerida(
      vec.computadorasTotal,
      vec.computadorasOperativas,
      input.tieneEquipoRed
    );

    const riskDrivers: string[] = [];
    if (vec.computadorasTotal === 0) {
      riskDrivers.push('Local sin equipamiento de cómputo registrado (COMPUTADORAS_TOTAL = 0).');
    } else if (vec.computadorasOperativas === 0) {
      riskDrivers.push(
        `Totalidad de equipos inoperativos (0 operativas de ${vec.computadorasTotal} totales).`
      );
    } else if (vec.pctOperatividad < 60) {
      riskDrivers.push(
        `Operatividad de cómputo limitada (${vec.pctOperatividad.toFixed(1)}% operativas).`
      );
    } else {
      riskDrivers.push(
        `Parque de cómputo con operatividad saludable (${vec.pctOperatividad.toFixed(1)}% operativas).`
      );
    }

    if (input.tieneEquipoRed === 0) {
      riskDrivers.push('Sin equipamiento de red / conectividad (TIENE_EQUIPO_RED = 0).');
    } else {
      riskDrivers.push('Cuenta con equipamiento de red / router (TIENE_EQUIPO_RED = 1).');
    }

    if (input.tieneSoporteEnergia === 0) {
      riskDrivers.push('Sin respaldo energético UPS / panel solar (TIENE_SOPORTE_ENERGIA = 0).');
    } else {
      riskDrivers.push('Cuenta con respaldo energético UPS / panel solar (TIENE_SOPORTE_ENERGIA = 1).');
    }

    riskDrivers.push(describeRuralidad(input.gradienteRuralidad));

    return {
      predictedClass,
      probabilities,
      recommendedAction,
      riskDrivers,
    };
  }
}
