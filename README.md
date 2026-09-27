# Módulo de Gestión Agrícola (`agricultura`)

Este esquema de base de datos está diseñado para registrar, organizar y trazar todas las labores agrícolas ejecutadas sobre terrenos rurales, permitiendo un control riguroso de fechas, áreas intervenidas y tipos de cultivo.

---

## 🎯 Objetivo del Sistema

Gestionar de forma unificada el ciclo productivo de campo: desde la preparación y siembra, pasando por las aplicaciones fitosanitarias (fumigación), hasta la cosecha y medición de rendimientos por lote.

---

## 🏗️ Estructura del Modelo de Datos

El diseño utiliza un patrón de **Superclase / Subclase** (o tabla maestra y tablas de especialización) para mantener la información común centralizada sin perder los datos específicos de cada actividad.

```
                  ┌──────────────┐
                  │    LOTES     │
                  └──────┬───────┘
                         │ 1
                         │
                         │ N
                  ┌──────┴───────┐
                  │   TRABAJOS   │ (Superclase: fecha, hectáreas, lote)
                  └──┬───┬────┬──┘
           ┌─────────┘   │    └─────────┐
         1 │ 1         1 │ 1          1 │ 1
    ┌──────┴──────┐┌─────┴────────┐┌────┴──────┐
    │  SIEMBRAS   ││ FUMIGACIONES ││ COSECHAS  │
    └──────┬──────┘└─────┬────────┘└────┬──────┘
           │ N           │ 0..N         │ N
           └─────────┐   │   ┌──────────┘
                    1│   │1  │1
                  ┌──┴───┴───┴───┐
                  │   CULTIVOS   │
                  └──────────────┘
```

---

## 📋 Entidades Principales

### 1. Entidades Base

* **`lotes`**: Representa las parcelas, potreros o divisiones físicas del campo.
  * Almacena el nombre del lote y la superficie total catastral/operativa en hectáreas.
  * Valida que las hectáreas sean estrictamente mayores a cero.
* **`cultivos`**: Catálogo general de especies vegetales sembradas (ej. *Soja*, *Maíz*, *Trigo*, *Girasol*).

---

### 2. Tabla Núcleo: `trabajos`

Es la entidad principal del esquema. Cada registro representa una entrada operativa de maquinaria o personal al campo.

* **Campos clave**:
  * `lote_id`: Lote en el que se ejecuta la tarea.
  * `tipo`: Clasificación de la tarea (`'SIEMBRA'`, `'FUMIGACION'`, `'COSECHA'`).
  * `fecha`: Día en que se llevó a cabo la labor.
  * `hectareas`: Superficie real trabajada (permite registrar labores parciales sobre un lote).
  * `observaciones`: Notas de campo, condiciones climáticas o datos del operador.

---

### 3. Especializaciones (Detalle por Tipo de Labor)

Cada fila en `trabajos` se complementa con un único registro en su tabla hija correspondiente:

#### A. `siembras`
* **Finalidad**: Guarda los datos biológicos y agronómicos de la implantación.
* **Datos propios**: 
  * `cultivo_id`: Cultivo que se está implantando.
  * `variedad_semilla`: Identificador comercial o genético de la semilla utilizada (híbrido/variedad).

#### B. `fumigaciones`
* **Finalidad**: Registra las aplicaciones de fitosanitarios (herbicidas, fungicidas, insecticidas).
* **Particularidad**: El campo `cultivo_id` es **opcional (nullable)**. Esto permite registrar aplicaciones en lotes descubiertos (barbecho químico para control de malezas previo a la siembra).

#### C. `cosechas`
* **Finalidad**: Cierre del ciclo productivo y recolección del grano.
* **Datos propios**:
  * `cultivo_id`: Cultivo recolectado.
  * `rendimiento`: Cantidad recolectada por unidad de superficie o volumen total (debe ser $\ge 0$).

---

## 🔗 Relaciones y Reglas de Negocio

| Origen | Destino | Cardinalidad | Comportamiento e Integridad |
| :--- | :--- | :---: | :--- |
| `lotes` | `trabajos` | **1 a N** | Un lote acumula muchos trabajos en el tiempo. `ON DELETE RESTRICT` evita borrar un lote si tiene historial operativo cargado. |
| `trabajos` | `siembras` | **1 a 1** | Cada trabajo de tipo siembra tiene un único registro de detalle (`UNIQUE`). `ON DELETE CASCADE` borra el detalle si se elimina el trabajo general. |
| `trabajos` | `fumigaciones` | **1 a 1** | Cada trabajo de tipo pulverización tiene un único registro de detalle (`UNIQUE`). Eliminación en cascada. |
| `trabajos` | `cosechas` | **1 a 1** | Cada trabajo de cosecha tiene un único registro de detalle (`UNIQUE`). Eliminación en cascada. |
| `cultivos` | `siembras` | **1 a N** | Un cultivo puede sembrarse en múltiples trabajos y lotes. Protegido con `RESTRICT`. |
| `cultivos` | `fumigaciones` | **1 a 0..N** | Opcional. Permite asociar la fumigación a un cultivo en pie o dejarlo nulo en barbecho. |
| `cultivos` | `cosechas` | **1 a N** | Un cultivo puede cosecharse múltiples veces. Protegido con `RESTRICT`. |

---

## 🚀 Puntos Fuertes del Diseño

1. **Auditoría automática**: Cada tabla incluye su columna `created_at` con marca de tiempo UTC (`TIMESTAMPTZ`).
2. **Índices de consulta optimizados**: Campos de filtrado frecuente (`lote_id`, `fecha`, `tipo`, `cultivo_id`) cuentan con índices dedicados para agilizar consultas analíticas y reportes.
3. **Consistencia de datos**: El uso de restricciones `CHECK` asegura que no se registren hectáreas negativas ni rendimientos ilógicos.