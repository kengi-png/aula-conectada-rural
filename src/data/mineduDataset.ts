import {
  AccionSugerida,
  NivelEducativoFiltro,
  RegistroACR,
  RegistroACREnriquecido,
  RuralidadTipo,
  SemaforoEstado,
} from '../types/acr';

export const RURALIDAD_DESCRIPTIONS: Record<RuralidadTipo, string> = {
  'Rural 3': 'Rural 3: Alta dispersión territorial y aislamiento extremo (mayor vulnerabilidad).',
  'Rural 2': 'Rural 2: Dispersión territorial intermedia.',
  'Rural 1': 'Rural 1: Cercanía moderada a capital distrital / accesibilidad intermedia.',
  Urbano: 'Urbano: Zona urbana consolidada.',
};

export function describeRuralidad(gradiente: RuralidadTipo | string): string {
  return (
    RURALIDAD_DESCRIPTIONS[gradiente as RuralidadTipo] ??
    `${gradiente}: Gradiente territorial registrado en el padrón MINEDU.`
  );
}

/**
 * Clasifica dinámicamente la acción sugerida por local escolar (CODLOCAL)
 * según COMPUTADORAS_TOTAL, COMPUTADORAS_OPERATIVAS y TIENE_EQUIPO_RED.
 */
export function classifyAccionSugerida(
  computadorasTotal: number,
  computadorasOperativas: number,
  tieneEquipoRed: 0 | 1 = 1
): AccionSugerida {
  if (computadorasTotal === 0) return 'Dotar';
  if (computadorasTotal > 0 && computadorasOperativas === 0) return 'Reponer';
  if (computadorasOperativas < computadorasTotal && computadorasOperativas > 0) {
    return 'Reparar';
  }
  if (computadorasOperativas > 0 && tieneEquipoRed === 0) {
    return 'Conectividad / Red';
  }
  return 'Adecuado';
}

export function classifySemaforoFromDecimal(rateDec: number): SemaforoEstado {
  if (rateDec > 0.025) return 'Rojo';
  if (rateDec >= 0.015) return 'Amarillo';
  return 'Verde';
}

export function enrichRegistroACR(
  row: RegistroACR,
  nivel: NivelEducativoFiltro = 'Todos'
): RegistroACREnriquecido {
  const tasaActivaDec =
    nivel === 'Primaria'
      ? row.tasaDesercionPrimaria
      : nivel === 'Secundaria'
      ? row.tasaDesercionSecundaria
      : (row.tasaDesercionPrimaria + row.tasaDesercionSecundaria) / 2;

  const pctOperatividad =
    row.computadorasTotal > 0
      ? (row.computadorasOperativas / row.computadorasTotal) * 100
      : 0;

  return {
    ...row,
    provinciaUgel: `${row.provincia} / ${row.ugel}`,
    accionSugerida: classifyAccionSugerida(
      row.computadorasTotal,
      row.computadorasOperativas,
      row.tieneEquipoRed
    ),
    pctOperatividad,
    tasaPrimariaPct: row.tasaDesercionPrimaria * 100,
    tasaSecundariaPct: row.tasaDesercionSecundaria * 100,
    tasaActivaDec,
    tasaActivaPct: tasaActivaDec * 100,
    semaforo: classifySemaforoFromDecimal(tasaActivaDec),
  };
}

/**
 * Dataset representativo alineado estrictamente a las 13 columnas de dbo.vw_Dashboard_ACR
 * (incluyendo TIENE_EQUIPO_RED y TIENE_SOPORTE_ENERGIA) con tasas en escala decimal.
 */
export const MINEDU_DATASET: RegistroACR[] = [
  // --- SEMAFORO ROJO (> 0.025 en promedio decimal) · Alta dispersión y aislamiento extremo (Rural 3) ---
  { codgeo: '010402', departamento: 'Amazonas', provincia: 'Condorcanqui', distrito: 'El Cenepa', codlocal: '004118', ugel: 'UGEL Condorcanqui', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0295, tasaDesercionSecundaria: 0.0475, computadorasTotal: 0, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '010402', departamento: 'Amazonas', provincia: 'Condorcanqui', distrito: 'El Cenepa', codlocal: '004125', ugel: 'UGEL Condorcanqui', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0280, tasaDesercionSecundaria: 0.0450, computadorasTotal: 8, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '160702', departamento: 'Loreto', provincia: 'Datem del Marañón', distrito: 'Cahuapanas', codlocal: '382104', ugel: 'UGEL Datem del Marañón', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0272, tasaDesercionSecundaria: 0.0448, computadorasTotal: 0, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '160702', departamento: 'Loreto', provincia: 'Datem del Marañón', distrito: 'Cahuapanas', codlocal: '382119', ugel: 'UGEL Datem del Marañón', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0264, tasaDesercionSecundaria: 0.0432, computadorasTotal: 10, computadorasOperativas: 2, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '060409', departamento: 'Cajamarca', provincia: 'Chota', distrito: 'Querocoto', codlocal: '095230', ugel: 'UGEL Chota', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0248, tasaDesercionSecundaria: 0.0442, computadorasTotal: 12, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '090709', departamento: 'Huancavelica', provincia: 'Tayacaja', distrito: 'Tintay Puncu', codlocal: '183402', ugel: 'UGEL Tayacaja', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0235, tasaDesercionSecundaria: 0.0425, computadorasTotal: 0, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '081103', departamento: 'Cusco', provincia: 'Paucartambo', distrito: 'Challabamba', codlocal: '164812', ugel: 'UGEL Paucartambo', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0218, tasaDesercionSecundaria: 0.0390, computadorasTotal: 14, computadorasOperativas: 4, tieneEquipoRed: 1, tieneSoporteEnergia: 0 },
  { codgeo: '050404', departamento: 'Ayacucho', provincia: 'Huanta', distrito: 'Llochegua', codlocal: '081245', ugel: 'UGEL Huanta', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0215, tasaDesercionSecundaria: 0.0375, computadorasTotal: 11, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '250201', departamento: 'Ucayali', provincia: 'Atalaya', distrito: 'Raymondi', codlocal: '492108', ugel: 'UGEL Atalaya', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0224, tasaDesercionSecundaria: 0.0392, computadorasTotal: 16, computadorasOperativas: 5, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '130806', departamento: 'La Libertad', provincia: 'Pataz', distrito: 'Ongón', codlocal: '271490', ugel: 'UGEL Pataz', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0210, tasaDesercionSecundaria: 0.0382, computadorasTotal: 0, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '100902', departamento: 'Huánuco', provincia: 'Puerto Inca', distrito: 'Codo del Pozuzo', codlocal: '214507', ugel: 'UGEL Puerto Inca', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0202, tasaDesercionSecundaria: 0.0368, computadorasTotal: 15, computadorasOperativas: 4, tieneEquipoRed: 1, tieneSoporteEnergia: 0 },
  { codgeo: '140202', departamento: 'Lambayeque', provincia: 'Ferreñafe', distrito: 'Cañaris', codlocal: '291833', ugel: 'UGEL Ferreñafe', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0204, tasaDesercionSecundaria: 0.0360, computadorasTotal: 9, computadorasOperativas: 0, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '200303', departamento: 'Piura', provincia: 'Huancabamba', distrito: 'Huarmaca', codlocal: '431205', ugel: 'UGEL Huarmaca', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0202, tasaDesercionSecundaria: 0.0364, computadorasTotal: 18, computadorasOperativas: 6, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '120604', departamento: 'Junín', provincia: 'Satipo', distrito: 'Mazamari', codlocal: '248901', ugel: 'UGEL Satipo', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0198, tasaDesercionSecundaria: 0.0354, computadorasTotal: 14, computadorasOperativas: 5, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '210303', departamento: 'Puno', provincia: 'Carabaya', distrito: 'Coasa', codlocal: '452910', ugel: 'UGEL Carabaya', gradienteRuralidad: 'Rural 3', tasaDesercionPrimaria: 0.0188, tasaDesercionSecundaria: 0.0332, computadorasTotal: 10, computadorasOperativas: 3, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },

  // --- SEMAFORO AMARILLO (0.015 <= promedio <= 0.025) · Dispersión intermedia (Rural 2) ---
  { codgeo: '060401', departamento: 'Cajamarca', provincia: 'Chota', distrito: 'Chota', codlocal: '095004', ugel: 'UGEL Chota', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0145, tasaDesercionSecundaria: 0.0255, computadorasTotal: 22, computadorasOperativas: 14, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '021902', departamento: 'Áncash', provincia: 'Sihuas', distrito: 'Acobamba', codlocal: '028114', ugel: 'UGEL Sihuas', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0148, tasaDesercionSecundaria: 0.0272, computadorasTotal: 18, computadorasOperativas: 18, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '030502', departamento: 'Apurímac', provincia: 'Cotabambas', distrito: 'Cotabambas', codlocal: '052410', ugel: 'UGEL Cotabambas', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0152, tasaDesercionSecundaria: 0.0286, computadorasTotal: 20, computadorasOperativas: 12, tieneEquipoRed: 1, tieneSoporteEnergia: 0 },
  { codgeo: '090701', departamento: 'Huancavelica', provincia: 'Tayacaja', distrito: 'Pampas', codlocal: '183015', ugel: 'UGEL Tayacaja', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0142, tasaDesercionSecundaria: 0.0260, computadorasTotal: 24, computadorasOperativas: 16, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '131001', departamento: 'La Libertad', provincia: 'Sánchez Carrión', distrito: 'Huamachuco', codlocal: '273112', ugel: 'UGEL Sánchez Carrión', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0146, tasaDesercionSecundaria: 0.0266, computadorasTotal: 28, computadorasOperativas: 19, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '190302', departamento: 'Pasco', provincia: 'Oxapampa', distrito: 'Chontabamba', codlocal: '412008', ugel: 'UGEL Oxapampa', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0138, tasaDesercionSecundaria: 0.0252, computadorasTotal: 16, computadorasOperativas: 16, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '210205', departamento: 'Puno', provincia: 'Azángaro', distrito: 'Chupa', codlocal: '451120', ugel: 'UGEL Azángaro', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0134, tasaDesercionSecundaria: 0.0248, computadorasTotal: 18, computadorasOperativas: 12, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '220304', departamento: 'San Martín', provincia: 'El Dorado', distrito: 'San Martín', codlocal: '472019', ugel: 'UGEL El Dorado', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0154, tasaDesercionSecundaria: 0.0282, computadorasTotal: 20, computadorasOperativas: 20, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '120301', departamento: 'Junín', provincia: 'Chanchamayo', distrito: 'Chanchamayo', codlocal: '245102', ugel: 'UGEL Chanchamayo', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0128, tasaDesercionSecundaria: 0.0238, computadorasTotal: 26, computadorasOperativas: 19, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '151001', departamento: 'Lima', provincia: 'Yauyos', distrito: 'Yauyos', codlocal: '342101', ugel: 'UGEL 13 Yauyos', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0112, tasaDesercionSecundaria: 0.0212, computadorasTotal: 14, computadorasOperativas: 14, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '240201', departamento: 'Tumbes', provincia: 'Contralmirante Villar', distrito: 'Zorritos', codlocal: '482005', ugel: 'UGEL Contralmirante Villar', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0108, tasaDesercionSecundaria: 0.0204, computadorasTotal: 22, computadorasOperativas: 17, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '030202', departamento: 'Apurímac', provincia: 'Andahuaylas', distrito: 'Andarapa', codlocal: '051284', ugel: 'UGEL Andahuaylas', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0144, tasaDesercionSecundaria: 0.0268, computadorasTotal: 19, computadorasOperativas: 12, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },
  { codgeo: '050203', departamento: 'Ayacucho', provincia: 'Cangallo', distrito: 'Los Morochucos', codlocal: '080411', ugel: 'UGEL Cangallo', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0158, tasaDesercionSecundaria: 0.0288, computadorasTotal: 17, computadorasOperativas: 10, tieneEquipoRed: 1, tieneSoporteEnergia: 0 },
  { codgeo: '170201', departamento: 'Madre de Dios', provincia: 'Manu', distrito: 'Manu', codlocal: '391402', ugel: 'UGEL Manu', gradienteRuralidad: 'Rural 2', tasaDesercionPrimaria: 0.0140, tasaDesercionSecundaria: 0.0258, computadorasTotal: 15, computadorasOperativas: 15, tieneEquipoRed: 0, tieneSoporteEnergia: 0 },

  // --- SEMAFORO VERDE (< 0.015 en promedio decimal) · Cercanía moderada (Rural 1) y Urbano ---
  { codgeo: '040504', departamento: 'Arequipa', provincia: 'Caylloma', distrito: 'Chivay', codlocal: '064102', ugel: 'UGEL Caylloma', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0088, tasaDesercionSecundaria: 0.0172, computadorasTotal: 24, computadorasOperativas: 24, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '040702', departamento: 'Arequipa', provincia: 'Islay', distrito: 'Cocachacra', codlocal: '067208', ugel: 'UGEL Islay', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0082, tasaDesercionSecundaria: 0.0158, computadorasTotal: 28, computadorasOperativas: 28, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '110202', departamento: 'Ica', provincia: 'Chincha', distrito: 'Alto Larán', codlocal: '231405', ugel: 'UGEL Chincha', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0089, tasaDesercionSecundaria: 0.0169, computadorasTotal: 26, computadorasOperativas: 26, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '180203', departamento: 'Moquegua', provincia: 'General Sánchez Cerro', distrito: 'Ichuña', codlocal: '402109', ugel: 'UGEL General Sánchez Cerro', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0086, tasaDesercionSecundaria: 0.0166, computadorasTotal: 20, computadorasOperativas: 20, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '230201', departamento: 'Tacna', provincia: 'Candarave', distrito: 'Candarave', codlocal: '478102', ugel: 'UGEL Candarave', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0078, tasaDesercionSecundaria: 0.0154, computadorasTotal: 22, computadorasOperativas: 22, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '150712', departamento: 'Lima', provincia: 'Huarochirí', distrito: 'Langa', codlocal: '338904', ugel: 'UGEL 15 Huarochirí', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0092, tasaDesercionSecundaria: 0.0176, computadorasTotal: 18, computadorasOperativas: 18, tieneEquipoRed: 0, tieneSoporteEnergia: 1 },
  { codgeo: '010101', departamento: 'Amazonas', provincia: 'Chachapoyas', distrito: 'Chachapoyas', codlocal: '001015', ugel: 'UGEL Chachapoyas', gradienteRuralidad: 'Rural 1', tasaDesercionPrimaria: 0.0092, tasaDesercionSecundaria: 0.0175, computadorasTotal: 30, computadorasOperativas: 30, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '080101', departamento: 'Cusco', provincia: 'Cusco', distrito: 'Cusco', codlocal: '160118', ugel: 'UGEL Cusco', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0072, tasaDesercionSecundaria: 0.0146, computadorasTotal: 32, computadorasOperativas: 32, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '120101', departamento: 'Junín', provincia: 'Huancayo', distrito: 'Huancayo', codlocal: '241009', ugel: 'UGEL Huancayo', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0075, tasaDesercionSecundaria: 0.0150, computadorasTotal: 34, computadorasOperativas: 34, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '130101', departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', codlocal: '261012', ugel: 'UGEL 03 Trujillo Nor Oeste', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0080, tasaDesercionSecundaria: 0.0158, computadorasTotal: 36, computadorasOperativas: 36, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '140101', departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Chiclayo', codlocal: '281024', ugel: 'UGEL Chiclayo', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0086, tasaDesercionSecundaria: 0.0166, computadorasTotal: 30, computadorasOperativas: 28, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '200101', departamento: 'Piura', provincia: 'Piura', distrito: 'Piura', codlocal: '421008', ugel: 'UGEL Piura', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0088, tasaDesercionSecundaria: 0.0172, computadorasTotal: 28, computadorasOperativas: 28, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '211101', departamento: 'Puno', provincia: 'San Román', distrito: 'Juliaca', codlocal: '459011', ugel: 'UGEL San Román', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0084, tasaDesercionSecundaria: 0.0166, computadorasTotal: 32, computadorasOperativas: 30, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '220901', departamento: 'San Martín', provincia: 'San Martín', distrito: 'Tarapoto', codlocal: '475022', ugel: 'UGEL San Martín', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0086, tasaDesercionSecundaria: 0.0164, computadorasTotal: 26, computadorasOperativas: 26, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
  { codgeo: '190101', departamento: 'Pasco', provincia: 'Pasco', distrito: 'Chaupimarca', codlocal: '410018', ugel: 'UGEL Pasco', gradienteRuralidad: 'Urbano', tasaDesercionPrimaria: 0.0084, tasaDesercionSecundaria: 0.0168, computadorasTotal: 24, computadorasOperativas: 24, tieneEquipoRed: 1, tieneSoporteEnergia: 1 },
];
