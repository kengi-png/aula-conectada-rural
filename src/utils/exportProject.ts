import { RegistroACREnriquecido } from '../types/acr';

export function downloadDistrictsCsv(rows: RegistroACREnriquecido[]): void {
  const headers = [
    'CODGEO',
    'DEPARTAMENTO',
    'PROVINCIA',
    'DISTRITO',
    'CODLOCAL',
    'UGEL',
    'GRADIENTE_RURALIDAD',
    'COMPUTADORAS_TOTAL',
    'COMPUTADORAS_OPERATIVAS',
    'TIENE_EQUIPO_RED',
    'TIENE_SOPORTE_ENERGIA',
    'PCT_OPERATIVIDAD',
    'TASA_DESERCION_PRIMARIA_PCT',
    'TASA_DESERCION_SECUNDARIA_PCT',
    'TASA_PROMEDIO_PCT',
    'ACCION_SUGERIDA',
    'SEMAFORO',
  ];

  const escapeCsv = (val: string | number) => {
    const s = String(val);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.codgeo,
        r.departamento,
        r.provincia,
        r.distrito,
        r.codlocal,
        r.ugel,
        r.gradienteRuralidad,
        r.computadorasTotal,
        r.computadorasOperativas,
        r.tieneEquipoRed,
        r.tieneSoporteEnergia,
        r.pctOperatividad.toFixed(1),
        r.tasaPrimariaPct.toFixed(2),
        r.tasaSecundariaPct.toFixed(2),
        r.tasaActivaPct.toFixed(2),
        r.accionSugerida,
        r.semaforo,
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'locales_prioritarios_ACR.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
