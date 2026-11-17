# Aula Conectada Rural — Plataforma Analítica y Código Python/Streamlit

Plataforma web interactiva de analítica educativa e inteligencia artificial para el monitoreo de infraestructura tecnológica y prevención de deserción escolar rural (MINEDU / Universidad César Vallejo), acompañada de un centro de exportación con el código fuente completo en Python (Streamlit, Pandas, Plotly y Scikit-Learn) conectado a SQL Server (`Proyecto_ACR`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Las siguientes decisiones clave quedaron confirmadas a partir de tus respuestas de alineamiento y definen el alcance de la implementación:

- **Entrega Dual (Web Interactiva + Código Python Descargable)**: Se construirá un dashboard web totalmente funcional en la vista previa para explorar métricas, gráficos y el simulador de IA en vivo, junto con una pestaña dedicada para inspeccionar, copiar y descargar el proyecto completo en Python (`app.py`, conexión SQL, pipeline ML y dependencias) listo para ejecutarse localmente con Streamlit.
- **Conexión SQL Server Híbrida (`pyodbc` + `SQLAlchemy` + Modo Demo Offline)**: El código Python generado conectará a la vista unificada `dbo.vw_Dashboard_ACR` de la base `Proyecto_ACR` mediante SQLAlchemy sobre `pyodbc`, con respaldo automático a un generador de datos sintéticos fieles al esquema MINEDU cuando el servidor local no esté accesible.
- **Módulo Random Forest Multiclase + Simulador What-If**: El modelo predictivo clasifica el riesgo de deserción distrital en tres niveles (`Rojo`, `Amarillo`, `Verde`) excluyendo estrictamente las tasas de deserción como variables de entrada para prevenir fuga de información (*data leakage*), e incluye un simulador interactivo de escenarios de infraestructura.
- **Identidad Visual Institucional MINEDU / UCV (Modo Claro)**: Interfaz clara ejecutiva orientada a sustentación académica y gestión educativa, con superficies blancas de elevación única, azul institucional profundo para navegación/acciones primarias y semántica cromática estricta para estados de riesgo.

---

## 1. Overview & Core Concept

- **Qué Hace**: Centraliza el análisis de conectividad, equipamiento de cómputo (`P91_RECTEC`), redes (`P93`), energía/paneles solares (`P3239_OTELEM`), padrón de ruralidad (`Rural 1, 2, 3`) y deserción escolar interanual (`2023–2024` y proyección) a nivel distrital y por UGEL. Permite filtrar territorialmente, auditar locales según acción sugerida (`Reparar`, `Reponer`, `Dotar`, `Adecuado`), simular intervenciones de infraestructura con un modelo Random Forest multiclase y descargar el paquete Python/Streamlit equivalente.
- **Público Objetivo**: Jurado evaluador universitario (UCV), investigadores de analítica educativa y gestores de UGEL/MINEDU responsables de priorizar inversión tecnológica en zonas rurales.
- **Valor Principal**: Transforma tablas censales fragmentadas en decisiones accionables de priorización distrital y entrega un artefacto dual: demostración inmediata en navegador y código Python reproducible en producción contra SQL Server.

---

## 2. User Experience & Visual Design

### Flujos Principales del Usuario

1. **Exploración Territorial (Estado Inicial)**: El usuario aterriza en la vista ejecutiva con los filtros laterales configurados en todo el ámbito rural (promedio base de deserción `2.08%`). Visualiza de inmediato las 4 tarjetas KPI, los 3 gráficos analíticos interactivos y la tabla de distritos prioritarios ordenada por índice de vulnerabilidad.
2. **Filtrado Dinámico y Auditoría de Distritos**: Al seleccionar un Departamento, Provincia/UGEL, Nivel Educativo (`Primaria` / `Secundaria`) o Gradiente de Ruralidad (`Rural 1`, `Rural 2`, `Rural 3`), todos los KPIs, gráficos y filas de la tabla se recalculan instantáneamente sin recarga. El usuario puede buscar o ordenar distritos en la tabla e inspeccionar el desglose de infraestructura de cualquier distrito.
3. **Simulador Predictivo Random Forest (What-If)**: Desde la navegación superior, el usuario cambia a la vista de Inteligencia Artificial. Allí ajusta controles de entrada libres de fuga de datos (porcentaje de equipos operativos, alumnos por PC, cobertura de internet, disponibilidad de UPS/routers, paneles solares y gradiente de ruralidad) y observa en tiempo real la clase predicha (`Rojo`, `Amarillo`, `Verde`), las probabilidades por clase y la importancia relativa de cada variable.
4. **Exportación del Proyecto Python / Streamlit**: En la vista de Código Python, el usuario revisa la arquitectura modular lista para SQL Server (`Proyecto_ACR` / `dbo.vw_Dashboard_ACR`), cambia entre los distintos módulos del paquete Python, copia fragmentos o descarga los archivos listos para ejecutar `streamlit run app.py`.

### Identidad Visual, Tipografía y Reglas Espaciales

- **Dirección Estética**: Tablero institucional claro de alta densidad analítica, sobrio y académico (sin ornamentos artificiales, etiquetas tipo cápsula estáticas ni métricas decorativas).
- **Paleta de Color (Disciplina 60-30-10)**:
  - *60% Lienzo Neutro*: Fondo principal `#F8FAFC` (`--background`) y superficie de trabajo limpia `#FFFFFF` (`--surface`).
  - *30% Superficies Estructurales*: Contenedores planos con bordes finos de `1px solid #E2E8F0`, divisores sutiles y texto secundario en gris pizarra `#475569`.
  - *10% Acento Institucional y Semántica de Datos*: Azul marino institucional (`#0F2D52`) para barra activa y acciones primarias; rojo institucional (`#DC2626`) reservado para riesgo crítico `Semáforo Rojo` y énfasis de alertas; ámbar (`#D97706`) para `Amarillo`; verde (`#16A34A`) para `Verde`. Todo estado cromático irá acompañado de su etiqueta textual explícita.
- **Tipografía y Disciplina Numérica**:
  - *Encabezados y Navegación*: `Plus Jakarta Sans` (pesos `600` y `700`) con ajuste `text-wrap: balance` para evitar líneas huérfanas.
  - *Cuerpo y Etiquetas*: `Public Sans` (`13px–15px`, interlineado `1.5`) para máxima legibilidad en tablas y filtros.
  - *Métricas y Tablas*: `JetBrains Mono` con `font-variant-numeric: tabular-nums` en todos los KPIs, porcentajes, ratios y celdas numéricas para garantizar alineación vertical exacta.
- **Arquitectura de Disposición (1440px Desktop)**:
  - Barra superior limpia de tres zonas: título institucional de una línea a la izquierda, 3 pestañas de navegación (`Panel Analítico`, `Modelo Random Forest`, `Código Python / SQL`) al centro y botón primario único (`Descargar Proyecto .py`) a la derecha.
  - Barra lateral izquierda fija de `260px` dedicada exclusivamente a los 4 filtros MINEDU (`Departamento`, `Provincia / UGEL`, `Nivel Educativo`, `Gradiente de Ruralidad`) y botón de reinicio.
  - Elevación única de tarjetas (`1px` borde sin tarjetas anidadas dentro de tarjetas ni barras laterales gruesas de color).

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Gráficos Interactivos Fieles a Plotly en la Web + Script Plotly Nativo en Python**
  - *Enfoque Elegido*: Usar gráficos interactivos nativos en la aplicación web con tooltips, zoom/leyenda y descarga de datos alineados visualmente con los gráficos `plotly.express` / `plotly.graph_objects` definidos en el script Python descargable.
  - *Por Qué*: Garantiza carga inmediata sin latencia pesada de bundles externos en el navegador, manteniendo paridad exacta en nombres de ejes, categorías (`Reparar`, `Reponer`, `Dotar`, `Adecuado`) y paletas respecto al código Streamlit exportado.
  - *Alternativas Descartadas*: Embeber el bundle completo de `plotly.js` de varios megabytes o mostrar imágenes estáticas sin interactividad.

- **Decisión 2: Motor Random Forest Determinístico en Cliente (Web) + Scikit-Learn Real en Código Python**
  - *Enfoque Elegido*: Entrenar/evaluar un ensamble de árboles de decisión en TypeScript sobre el dataset rural MINEDU cargado en memoria para la vista web What-If (calculando probabilidades multiclase e importancia de variables en `< 10ms`), mientras el código Python exportable entrena `sklearn.ensemble.RandomForestClassifier` real con `train_test_split`, `StandardScaler`/`OneHotEncoder` y validación estratificada.
  - *Por Qué*: Permite que el jurado interactúe con el simulador What-If sin requerir un backend Python activo en el contenedor web, y a la vez entrega un pipeline Scikit-Learn riguroso para la tesis.
  - *Alternativas Descartadas*: Usar respuestas estáticas simuladas sin cálculo real sobre las variables seleccionadas o depender de llamadas a API externas.

- **Decisión 3: Prevención Estricta de Fuga de Información (*Data Leakage*)**
  - *Enfoque Elegido*: Excluir explícitamente `tasa_desercion_2023`, `tasa_desercion_2024`, `proyeccion_desercion` y etiquetas derivadas del vector de características `X` del Random Forest, limitando `X` exclusivamente a variables censales de infraestructura (`pct_equipos_operativos`, `alumnos_por_pc`, `cobertura_internet_pct`, `ratio_red_p93`, `energia_solar_o_pozo_pct`, `gradiente_ruralidad`, `nivel_educativo`).
  - *Por Qué*: Asegura validez metodológica y científica ante el jurado universitario, demostrando que la infraestructura predice la vulnerabilidad sin circularidad estadística.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Diagrama de Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   CAPA DE DATOS MINEDU (Modelo Unificado)                  │
│  dbo.ACR_PADRON_RURAL + PADLOCAL + P91_RECTEC + P93 + P3239 + DESERCION    │
│                        └──▶ dbo.vw_Dashboard_ACR                           │
└───────────────────────────────┬──────────────────────────┬─────────────────┘
                                │                          │
             (Entorno Web en Vivo)                   (Entorno Local Python)
                                ▼                          ▼
┌──────────────────────────────────────────┐  ┌──────────────────────────────┐
│     APLICACIÓN WEB REACT (Puerto 3000)   │  │   PAQUETE STREAMLIT EXPORT   │
│                                          │  │                              │
│  ┌──────────────┐   ┌─────────────────┐  │  │  • Conexión SQLAlchemy/pyodbc│
│  │ Barra Lateral│   │ Motor Analítico │  │  │    + Fallback Demo Offline   │
│  │ (4 Filtros)  │──▶│  KPIs & Tablas  │  │  │  • st.sidebar (4 Filtros)    │
│  └──────────────┘   └────────┬────────┘  │  │  • 4 st.metric KPIs          │
│                              │           │  │  • 3 Gráficos Plotly         │
│  ┌───────────────────────────▼────────┐  │  │  • RandomForestClassifier    │
│  │  Vistas de Trabajo (Top Bar Nav)   │  │  │    (Scikit-Learn sin leakage)│
│  │  1. Panel Analítico (KPIs+Gráficos │  │  │  • Simulador What-If + Tabla │
│  │     + Tabla Prioritaria Distrital) │  │  │    de Distritos Prioritarios │
│  │  2. Módulo IA Random Forest        │  │  └──────────────────────────────┘
│  │     (Ensamble + Simulador What-If) │  │
│  │  3. Estudio de Código Python/SQL   │  │
│  │     (Visor + Copia + Descarga)     │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Modelo de Datos y Estado

- **Entidad Principal (`RegistroDistritoLocal`)**: Modela cada fila consolidada equivalente a `dbo.vw_Dashboard_ACR` con campos territoriales (`ccodgeo`, `departamento`, `provincia`, `ugel`, `distrito`), clasificación (`nivel_educativo`: Primaria/Secundaria; `ruralidad`: Rural 1/Rural 2/Rural 3), indicadores de infraestructura (`total_locales`, `equipos_operativos_pct`, `alumnos_por_pc`, `internet_pct`, `red_p93_operativa_pct`, `energia_solar_pozo_pct`, `accion_sugerida`: Reparar/Reponer/Dotar/Adecuado), deserción (`desercion_2023`, `desercion_2024`, `proyeccion_2025`), índice compuesto de vulnerabilidad (`indice_vulnerabilidad`) y categoría objetivo (`semaforo`: Rojo/Amarillo/Verde).
- **Calibración Baseline**: El dataset rural consolidado está calibrado para reflejar el promedio general de `2.08%` en la Tasa de Deserción Promedio al iniciar sin filtros restrictivos, respondiendo dinámicamente a cualquier combinación de filtros.

### Mapeo de Componentes Interactivos y Estado

- **Filtro Territorial y Rural (`SidebarFilters`)**: Estado reactivo compartido que filtra departamentos, encadena provincias/UGEL disponibles según el departamento seleccionado, y recalcula en cascada KPIs, series de los 3 gráficos y filas de la tabla. Incluye estado vacío informativo con botón de restablecimiento si una combinación de filtros no devuelve registros.
- **Gráficos Interactivos (`ChartsGrid`)**:
  - *Barras*: Conteo y proporción de locales por acción sugerida (`Reparar`, `Reponer`, `Dotar`, `Adecuado`), con selección interactiva para resaltar o filtrar la tabla.
  - *Líneas*: Evolución interanual (`2023`, `2024`, `Proy. 2025`) separada por `Primaria` y `Secundaria`.
  - *Pastel / Anillo*: Distribución de distritos únicos según `Semáforo` (`Rojo`, `Amarillo`, `Verde`).
- **Módulo Random Forest (`RandomForestView`)**:
  - Muestra matriz de métricas del modelo (Accuracy, F1 Macro, auditoría de variables excluidas contra *data leakage*) y gráfico de importancia de características (*Feature Importance*).
  - Panel **Simulador What-If**: 6 controles deslizantes/selectores interactivos que recalculan en vivo la probabilidad de riesgo (`% Rojo`, `% Amarillo`, `% Verde`), la clasificación final y una recomendación técnica automática de intervención (`Reparar`, `Reponer`, `Dotar`, `Adecuado`).
- **Tabla de Distritos Prioritarios (`PriorityDistrictsTable`)**: Búsqueda en tiempo real por distrito/UGEL/CCODGEO, ordenamiento por vulnerabilidad (descendente por defecto) o por cualquier columna numérica, y exportación directa a CSV.
- **Generador y Descarga de Código Python (`PythonCodeStudio`)**: Contiene el código íntegro, comentado y modular en Python (`app.py`, `db_connector.py`, `ml_model.py`, `requirements.txt`, `.env.example`, `README_EJECUCION.md`) con botones funcionales de copia al portapapeles y descarga individual o unificada para ejecutar inmediatamente contra `Proyecto_ACR`.
