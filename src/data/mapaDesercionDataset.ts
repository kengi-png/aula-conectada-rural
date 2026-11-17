import { MapaDesercionRegistro, TipoDistrito } from '../types/acr';

interface RawMapaSeed {
  ccodgeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  tipoDistrito: TipoDistrito;
  cantRural1: number;
  cantRural2: number;
  cantRural3: number;
  primariaPct: number;
  secundariaPct: number;
  tasaTotal2324: number;
  matriculaBase: number;
}

/**
 * Datos representativos equivalentes a dbo.vw_Mapa_Desercion_ACR (Proyecto_ACR)
 * cubriendo los 25 departamentos del Perú y las modalidades CON PRESENCIA RURAL
 * y EXCLUSIVAMENTE URBANO.
 */
const RAW_SEEDS: RawMapaSeed[] = [
  // AMAZONAS
  { ccodgeo: '010402', departamento: 'Amazonas', provincia: 'Condorcanqui', distrito: 'El Cenepa', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 38, cantRural2: 14, cantRural3: 4, primariaPct: 2.95, secundariaPct: 4.82, tasaTotal2324: 3.85, matriculaBase: 2850 },
  { ccodgeo: '010401', departamento: 'Amazonas', provincia: 'Condorcanqui', distrito: 'Nieva', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 42, cantRural2: 18, cantRural3: 7, primariaPct: 2.40, secundariaPct: 4.10, tasaTotal2324: 3.18, matriculaBase: 3620 },
  { ccodgeo: '010101', departamento: 'Amazonas', provincia: 'Chachapoyas', distrito: 'Chachapoyas', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.92, secundariaPct: 1.75, tasaTotal2324: 1.32, matriculaBase: 4120 },

  // ANCASH
  { ccodgeo: '021902', departamento: 'Áncash', provincia: 'Sihuas', distrito: 'Acobamba', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 9, cantRural2: 7, cantRural3: 3, primariaPct: 1.48, secundariaPct: 2.75, tasaTotal2324: 2.10, matriculaBase: 1120 },
  { ccodgeo: '021504', departamento: 'Áncash', provincia: 'Pallasca', distrito: 'Conchucos', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 12, cantRural2: 8, cantRural3: 4, primariaPct: 1.65, secundariaPct: 3.05, tasaTotal2324: 2.34, matriculaBase: 1480 },
  { ccodgeo: '021801', departamento: 'Áncash', provincia: 'Santa', distrito: 'Chimbote', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.85, secundariaPct: 1.68, tasaTotal2324: 1.24, matriculaBase: 18400 },

  // APURIMAC
  { ccodgeo: '030502', departamento: 'Apurímac', provincia: 'Cotabambas', distrito: 'Cotabambas', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 14, cantRural2: 11, cantRural3: 5, primariaPct: 1.52, secundariaPct: 2.86, tasaTotal2324: 2.18, matriculaBase: 1640 },
  { ccodgeo: '030202', departamento: 'Apurímac', provincia: 'Andahuaylas', distrito: 'Andarapa', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 11, cantRural2: 13, cantRural3: 6, primariaPct: 1.44, secundariaPct: 2.68, tasaTotal2324: 2.04, matriculaBase: 1790 },
  { ccodgeo: '030101', departamento: 'Apurímac', provincia: 'Abancay', distrito: 'Abancay', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.82, secundariaPct: 1.62, tasaTotal2324: 1.21, matriculaBase: 6400 },

  // AREQUIPA
  { ccodgeo: '040504', departamento: 'Arequipa', provincia: 'Caylloma', distrito: 'Chivay', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 4, cantRural2: 7, cantRural3: 6, primariaPct: 0.88, secundariaPct: 1.72, tasaTotal2324: 1.29, matriculaBase: 1420 },
  { ccodgeo: '040702', departamento: 'Arequipa', provincia: 'Islay', distrito: 'Cocachacra', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 1, cantRural2: 4, cantRural3: 8, primariaPct: 0.82, secundariaPct: 1.58, tasaTotal2324: 1.19, matriculaBase: 1650 },
  { ccodgeo: '040101', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Arequipa', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.68, secundariaPct: 1.38, tasaTotal2324: 1.02, matriculaBase: 15200 },

  // AYACUCHO
  { ccodgeo: '050404', departamento: 'Ayacucho', provincia: 'Huanta', distrito: 'Llochegua', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 19, cantRural2: 14, cantRural3: 5, primariaPct: 2.15, secundariaPct: 3.74, tasaTotal2324: 2.91, matriculaBase: 2450 },
  { ccodgeo: '050203', departamento: 'Ayacucho', provincia: 'Cangallo', distrito: 'Los Morochucos', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 12, cantRural2: 10, cantRural3: 4, primariaPct: 1.58, secundariaPct: 2.88, tasaTotal2324: 2.21, matriculaBase: 1710 },
  { ccodgeo: '050101', departamento: 'Ayacucho', provincia: 'Huamanga', distrito: 'Ayacucho', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.90, secundariaPct: 1.84, tasaTotal2324: 1.35, matriculaBase: 9800 },

  // CAJAMARCA
  { ccodgeo: '060409', departamento: 'Cajamarca', provincia: 'Chota', distrito: 'Querocoto', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 24, cantRural2: 16, cantRural3: 7, primariaPct: 2.48, secundariaPct: 4.46, tasaTotal2324: 3.45, matriculaBase: 2980 },
  { ccodgeo: '060401', departamento: 'Cajamarca', provincia: 'Chota', distrito: 'Chota', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 14, cantRural2: 22, cantRural3: 15, primariaPct: 1.38, secundariaPct: 2.54, tasaTotal2324: 1.94, matriculaBase: 5120 },
  { ccodgeo: '060801', departamento: 'Cajamarca', provincia: 'Jaén', distrito: 'Jaén', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.96, secundariaPct: 1.88, tasaTotal2324: 1.40, matriculaBase: 11200 },

  // CALLAO
  { ccodgeo: '070106', departamento: 'Callao', provincia: 'Callao', distrito: 'Ventanilla', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.98, secundariaPct: 1.94, tasaTotal2324: 1.44, matriculaBase: 26800 },
  { ccodgeo: '070101', departamento: 'Callao', provincia: 'Callao', distrito: 'Callao', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.84, secundariaPct: 1.72, tasaTotal2324: 1.26, matriculaBase: 29400 },

  // CUSCO
  { ccodgeo: '081103', departamento: 'Cusco', provincia: 'Paucartambo', distrito: 'Challabamba', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 22, cantRural2: 13, cantRural3: 4, primariaPct: 2.18, secundariaPct: 3.92, tasaTotal2324: 3.04, matriculaBase: 2140 },
  { ccodgeo: '080902', departamento: 'Cusco', provincia: 'La Convención', distrito: 'Echarate', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 31, cantRural2: 24, cantRural3: 11, primariaPct: 1.84, secundariaPct: 3.36, tasaTotal2324: 2.58, matriculaBase: 4620 },
  { ccodgeo: '080101', departamento: 'Cusco', provincia: 'Cusco', distrito: 'Cusco', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.72, secundariaPct: 1.46, tasaTotal2324: 1.08, matriculaBase: 14100 },

  // HUANCAVELICA
  { ccodgeo: '090709', departamento: 'Huancavelica', provincia: 'Tayacaja', distrito: 'Tintay Puncu', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 18, cantRural2: 10, cantRural3: 3, primariaPct: 2.32, secundariaPct: 4.30, tasaTotal2324: 3.30, matriculaBase: 1620 },
  { ccodgeo: '090701', departamento: 'Huancavelica', provincia: 'Tayacaja', distrito: 'Pampas', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 9, cantRural2: 11, cantRural3: 7, primariaPct: 1.42, secundariaPct: 2.60, tasaTotal2324: 1.99, matriculaBase: 2340 },
  { ccodgeo: '090101', departamento: 'Huancavelica', provincia: 'Huancavelica', distrito: 'Huancavelica', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.94, secundariaPct: 1.88, tasaTotal2324: 1.39, matriculaBase: 5100 },

  // HUANUCO
  { ccodgeo: '100902', departamento: 'Huánuco', provincia: 'Puerto Inca', distrito: 'Codo del Pozuzo', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 17, cantRural2: 11, cantRural3: 4, primariaPct: 2.02, secundariaPct: 3.68, tasaTotal2324: 2.84, matriculaBase: 1890 },
  { ccodgeo: '100601', departamento: 'Huánuco', provincia: 'Leoncio Prado', distrito: 'Rupa-Rupa', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.95, secundariaPct: 1.90, tasaTotal2324: 1.41, matriculaBase: 7600 },

  // ICA
  { ccodgeo: '110202', departamento: 'Ica', provincia: 'Chincha', distrito: 'Alto Larán', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 1, cantRural2: 4, cantRural3: 7, primariaPct: 0.89, secundariaPct: 1.69, tasaTotal2324: 1.28, matriculaBase: 1580 },
  { ccodgeo: '110101', departamento: 'Ica', provincia: 'Ica', distrito: 'Ica', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.78, secundariaPct: 1.54, tasaTotal2324: 1.15, matriculaBase: 16400 },

  // JUNIN
  { ccodgeo: '120604', departamento: 'Junín', provincia: 'Satipo', distrito: 'Mazamari', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 21, cantRural2: 16, cantRural3: 9, primariaPct: 1.98, secundariaPct: 3.54, tasaTotal2324: 2.74, matriculaBase: 3920 },
  { ccodgeo: '120301', departamento: 'Junín', provincia: 'Chanchamayo', distrito: 'Chanchamayo', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 7, cantRural2: 10, cantRural3: 8, primariaPct: 1.28, secundariaPct: 2.38, tasaTotal2324: 1.81, matriculaBase: 4180 },
  { ccodgeo: '120101', departamento: 'Junín', provincia: 'Huancayo', distrito: 'Huancayo', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.75, secundariaPct: 1.50, tasaTotal2324: 1.11, matriculaBase: 14900 },

  // LA LIBERTAD
  { ccodgeo: '130806', departamento: 'La Libertad', provincia: 'Pataz', distrito: 'Ongón', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 15, cantRural2: 6, cantRural3: 2, primariaPct: 2.10, secundariaPct: 3.82, tasaTotal2324: 2.95, matriculaBase: 980 },
  { ccodgeo: '131001', departamento: 'La Libertad', provincia: 'Sánchez Carrión', distrito: 'Huamachuco', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 16, cantRural2: 24, cantRural3: 14, primariaPct: 1.46, secundariaPct: 2.66, tasaTotal2324: 2.04, matriculaBase: 6420 },
  { ccodgeo: '130101', departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.80, secundariaPct: 1.58, tasaTotal2324: 1.18, matriculaBase: 31200 },

  // LAMBAYEQUE
  { ccodgeo: '140202', departamento: 'Lambayeque', provincia: 'Ferreñafe', distrito: 'Cañaris', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 23, cantRural2: 14, cantRural3: 5, primariaPct: 2.04, secundariaPct: 3.60, tasaTotal2324: 2.81, matriculaBase: 2640 },
  { ccodgeo: '140101', departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Chiclayo', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.86, secundariaPct: 1.66, tasaTotal2324: 1.25, matriculaBase: 28900 },

  // LIMA
  { ccodgeo: '150712', departamento: 'Lima', provincia: 'Huarochirí', distrito: 'Langa', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 3, cantRural2: 4, cantRural3: 3, primariaPct: 1.05, secundariaPct: 1.98, tasaTotal2324: 1.50, matriculaBase: 640 },
  { ccodgeo: '151001', departamento: 'Lima', provincia: 'Yauyos', distrito: 'Yauyos', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 4, cantRural2: 5, cantRural3: 4, primariaPct: 1.12, secundariaPct: 2.12, tasaTotal2324: 1.61, matriculaBase: 890 },
  { ccodgeo: '150132', departamento: 'Lima', provincia: 'Lima', distrito: 'San Juan de Lurigancho', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.88, secundariaPct: 1.76, tasaTotal2324: 1.31, matriculaBase: 82400 },

  // LORETO
  { ccodgeo: '160702', departamento: 'Loreto', provincia: 'Datem del Marañón', distrito: 'Cahuapanas', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 35, cantRural2: 12, cantRural3: 3, primariaPct: 2.70, secundariaPct: 4.54, tasaTotal2324: 3.60, matriculaBase: 2310 },
  { ccodgeo: '160202', departamento: 'Loreto', provincia: 'Alto Amazonas', distrito: 'Balsapuerto', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 28, cantRural2: 15, cantRural3: 6, primariaPct: 2.26, secundariaPct: 3.88, tasaTotal2324: 3.05, matriculaBase: 3180 },
  { ccodgeo: '160101', departamento: 'Loreto', provincia: 'Maynas', distrito: 'Iquitos', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 1.18, secundariaPct: 2.28, tasaTotal2324: 1.71, matriculaBase: 19400 },

  // MADRE DE DIOS
  { ccodgeo: '170201', departamento: 'Madre de Dios', provincia: 'Manu', distrito: 'Manu', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 14, cantRural2: 8, cantRural3: 3, primariaPct: 2.08, secundariaPct: 3.68, tasaTotal2324: 2.86, matriculaBase: 1450 },
  { ccodgeo: '170101', departamento: 'Madre de Dios', provincia: 'Tambopata', distrito: 'Tambopata', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 1.12, secundariaPct: 2.10, tasaTotal2324: 1.60, matriculaBase: 11800 },

  // MOQUEGUA
  { ccodgeo: '180203', departamento: 'Moquegua', provincia: 'General Sánchez Cerro', distrito: 'Ichuña', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 6, cantRural2: 7, cantRural3: 4, primariaPct: 0.86, secundariaPct: 1.66, tasaTotal2324: 1.25, matriculaBase: 920 },
  { ccodgeo: '180101', departamento: 'Moquegua', provincia: 'Mariscal Nieto', distrito: 'Moquegua', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.64, secundariaPct: 1.30, tasaTotal2324: 0.96, matriculaBase: 8600 },

  // PASCO
  { ccodgeo: '190302', departamento: 'Pasco', provincia: 'Oxapampa', distrito: 'Chontabamba', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 8, cantRural2: 9, cantRural3: 5, primariaPct: 1.38, secundariaPct: 2.52, tasaTotal2324: 1.94, matriculaBase: 1340 },
  { ccodgeo: '190307', departamento: 'Pasco', provincia: 'Oxapampa', distrito: 'Puerto Bermúdez', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 24, cantRural2: 14, cantRural3: 6, primariaPct: 1.96, secundariaPct: 3.48, tasaTotal2324: 2.70, matriculaBase: 3120 },
  { ccodgeo: '190101', departamento: 'Pasco', provincia: 'Pasco', distrito: 'Chaupimarca', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.84, secundariaPct: 1.68, tasaTotal2324: 1.25, matriculaBase: 4800 },

  // PIURA
  { ccodgeo: '200202', departamento: 'Piura', provincia: 'Ayabaca', distrito: 'Frías', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 22, cantRural2: 19, cantRural3: 8, primariaPct: 1.88, secundariaPct: 3.38, tasaTotal2324: 2.61, matriculaBase: 3840 },
  { ccodgeo: '200303', departamento: 'Piura', provincia: 'Huancabamba', distrito: 'Huarmaca', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 34, cantRural2: 26, cantRural3: 9, primariaPct: 2.02, secundariaPct: 3.64, tasaTotal2324: 2.81, matriculaBase: 5620 },
  { ccodgeo: '200101', departamento: 'Piura', provincia: 'Piura', distrito: 'Piura', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.88, secundariaPct: 1.72, tasaTotal2324: 1.29, matriculaBase: 26400 },

  // PUNO
  { ccodgeo: '210303', departamento: 'Puno', provincia: 'Carabaya', distrito: 'Coasa', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 16, cantRural2: 11, cantRural3: 4, primariaPct: 1.84, secundariaPct: 3.30, tasaTotal2324: 2.55, matriculaBase: 1960 },
  { ccodgeo: '210205', departamento: 'Puno', provincia: 'Azángaro', distrito: 'Chupa', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 9, cantRural2: 12, cantRural3: 6, primariaPct: 1.34, secundariaPct: 2.48, tasaTotal2324: 1.90, matriculaBase: 1780 },
  { ccodgeo: '211101', departamento: 'Puno', provincia: 'San Román', distrito: 'Juliaca', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.84, secundariaPct: 1.66, tasaTotal2324: 1.24, matriculaBase: 29200 },

  // SAN MARTIN
  { ccodgeo: '220304', departamento: 'San Martín', provincia: 'El Dorado', distrito: 'San Martín', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 12, cantRural2: 13, cantRural3: 6, primariaPct: 1.64, secundariaPct: 2.98, tasaTotal2324: 2.30, matriculaBase: 2210 },
  { ccodgeo: '220901', departamento: 'San Martín', provincia: 'San Martín', distrito: 'Tarapoto', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.86, secundariaPct: 1.64, tasaTotal2324: 1.24, matriculaBase: 12800 },

  // TACNA
  { ccodgeo: '230201', departamento: 'Tacna', provincia: 'Candarave', distrito: 'Candarave', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 4, cantRural2: 6, cantRural3: 3, primariaPct: 0.78, secundariaPct: 1.54, tasaTotal2324: 1.15, matriculaBase: 760 },
  { ccodgeo: '230101', departamento: 'Tacna', provincia: 'Tacna', distrito: 'Tacna', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.62, secundariaPct: 1.26, tasaTotal2324: 0.93, matriculaBase: 15800 },

  // TUMBES
  { ccodgeo: '240201', departamento: 'Tumbes', provincia: 'Contralmirante Villar', distrito: 'Zorritos', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 2, cantRural2: 5, cantRural3: 6, primariaPct: 1.08, secundariaPct: 2.04, tasaTotal2324: 1.55, matriculaBase: 1920 },
  { ccodgeo: '240101', departamento: 'Tumbes', provincia: 'Tumbes', distrito: 'Tumbes', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 0.92, secundariaPct: 1.78, tasaTotal2324: 1.34, matriculaBase: 13400 },

  // UCAYALI
  { ccodgeo: '250201', departamento: 'Ucayali', provincia: 'Atalaya', distrito: 'Raymondi', tipoDistrito: 'CON PRESENCIA RURAL', cantRural1: 32, cantRural2: 18, cantRural3: 7, primariaPct: 2.24, secundariaPct: 3.92, tasaTotal2324: 3.06, matriculaBase: 4820 },
  { ccodgeo: '250101', departamento: 'Ucayali', provincia: 'Coronel Portillo', distrito: 'Callería', tipoDistrito: 'EXCLUSIVAMENTE URBANO', cantRural1: 0, cantRural2: 0, cantRural3: 0, primariaPct: 1.08, secundariaPct: 2.06, tasaTotal2324: 1.56, matriculaBase: 24500 },
];

const globalMean2324 =
  RAW_SEEDS.reduce((sum, item) => sum + item.tasaTotal2324, 0) / RAW_SEEDS.length;

/**
 * Aplica suavizado empírico con k=50 y escenario base -3% para la proyección 2025,
 * reflejando exactamente la lógica implementada en dbo.vw_Mapa_Desercion_ACR.
 */
export const MAPA_DESERCION_DATASET: MapaDesercionRegistro[] = RAW_SEEDS.map((seed) => {
  const totalIeRurales = seed.cantRural1 + seed.cantRural2 + seed.cantRural3;
  const nIe = Math.max(totalIeRurales, 1);
  const smoothed = (nIe * seed.tasaTotal2324 + 50 * globalMean2324) / (nIe + 50);
  const tasaTotal2025 = Number((smoothed * 0.97).toFixed(2));
  const desertores2025 = Math.max(1, Math.round((seed.matriculaBase * tasaTotal2025) / 100));

  return {
    ccodgeo: seed.ccodgeo,
    departamento: seed.departamento,
    provincia: seed.provincia,
    distrito: seed.distrito,
    tipoDistrito: seed.tipoDistrito,
    totalIeRurales,
    cantRural1: seed.cantRural1,
    cantRural2: seed.cantRural2,
    cantRural3: seed.cantRural3,
    primariaPct: seed.primariaPct,
    secundariaPct: seed.secundariaPct,
    tasaTotal2324: seed.tasaTotal2324,
    tasaTotal2025,
    desertores2025,
  };
});
