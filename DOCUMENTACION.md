# 🌾 Manual de Arquitectura y Documentación de la API: Sistema de Gestión Agrícola (`campo-backend`)

Sistema backend profesional desarrollado con **Node.js**, **Express**, **TypeScript** y **Prisma ORM** sobre **PostgreSQL** (esquema `agricultura`). Diseñado para administrar integralmente labores agronómicas, parcelas bajo diversos regímenes de tenencia, acopio y liquidación de granos, facturación y almacenamiento digital de comprobantes en **Azure Blob Storage** (con fallback local).

---

## 📑 Tabla de Contenidos
1. [Arquitectura y Estructura del Proyecto](#1-arquitectura-y-estructura-del-proyecto)
2. [Modelos de Datos y Entidades](#2-modelos-de-datos-y-entidades)
3. [Flujos de Negocio Operativos](#3-flujos-de-negocio-operativos)
4. [Referencia Completa de la API REST (`/api`)](#4-referencia-completa-de-la-api-rest-api)
   - [Módulo de Cultivos](#módulo-de-cultivos-apicultivos)
   - [Módulo de Lotes y Tenencia](#módulo-de-lotes-y-tenencia-apilotes)
   - [Módulo de Trabajos Agrícolas](#módulo-de-trabajos-agrícolas-apitrabajos)
   - [Módulo de Terceros (Clientes y Propietarios)](#módulo-de-terceros-apiterceros)
   - [Módulo de Facturación y Comprobantes](#módulo-de-facturación-y-comprobantes-apicomprobantes)
   - [Módulo de Acopio y Cuenta Corriente de Cereal](#módulo-de-acopio-y-cuenta-corriente-de-cereal-apiacopio)
   - [Módulo de Salud del Sistema](#módulo-de-salud-del-sistema-health)
5. [Variables de Entorno y Configuración](#5-variables-de-entorno-y-configuración)

---

## 1. Arquitectura y Estructura del Proyecto

El código está estructurado en una arquitectura en capas desacoplada:

```
campo/
├── dist/                      # Código JavaScript transpilado para producción
├── prisma/
│   └── schema.prisma          # Definición del modelo relacional en PostgreSQL
├── src/
│   ├── controllers/           # Controladores con la lógica de negocio y consultas Prisma
│   │   ├── acopio.controller.ts
│   │   ├── comprobantes.controller.ts
│   │   ├── cultivos.controller.ts
│   │   ├── lotes.controller.ts
│   │   ├── terceros.controller.ts
│   │   └── trabajos.controller.ts
│   ├── lib/                   # Singletons y clientes de infraestructura
│   │   ├── prisma.ts          # Instancia global de PrismaClient con soporte BigInt
│   │   └── storage.ts         # Servicio híbrido Azure Blob Storage / Disco local
│   ├── middlewares/           # Interceptores de peticiones HTTP
│   │   ├── error.middleware.ts    # Manejador centralizado de excepciones y códigos de error
│   │   ├── upload.middleware.ts   # Procesamiento y validación de archivos con Multer
│   │   └── validate.middleware.ts # Validación declarativa de campos obligatorios
│   ├── routes/                # Enrutadores limpios (asocian URI, middlewares y controladores)
│   │   ├── acopio.routes.ts
│   │   ├── comprobantes.routes.ts
│   │   ├── cultivos.routes.ts
│   │   ├── index.ts           # Router centralizador que monta todas las rutas en /api
│   │   ├── lotes.routes.ts
│   │   ├── terceros.routes.ts
│   │   └── trabajos.routes.ts
│   └── index.ts               # Servidor Express, configuración global y middlewares
├── uploads/                   # Carpeta local para almacenamiento de archivos en desarrollo
├── .env                       # Credenciales de base de datos y Azure
├── .env.example               # Plantilla de variables de entorno
├── package.json               # Dependencias y scripts de ejecución
└── tsconfig.json              # Configuración de compilación TypeScript
```

---

## 2. Modelos de Datos y Entidades

Todas las tablas están creadas dentro del esquema relacional `agricultura` en PostgreSQL.

### 2.1. `Cultivo` (`agricultura.cultivos`)
Catálogo de especies vegetales producidas o intervenidas en las labores agrícolas.
* **`id`** (`BigInt`, Clave Primaria, Autoincremental): Identificador único.
* **`nombre`** (`VARCHAR(100)`, Obligatorio, Único): Nombre comercial de la especie (ej. `SOJA`, `MAIZ`, `TRIGO`, `GIRASOL`).
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`): Fecha y hora de creación del registro.

---

### 2.2. `Tercero` (`agricultura.terceros`)
Personas o empresas con las que se interactúa comercial y operativamente.
* **`id`** (`BigInt`, Clave Primaria, Autoincremental): Identificador único.
* **`nombre`** (`VARCHAR(150)`, Obligatorio): Razón social o nombre y apellido del cliente/propietario.
* **`tipoDocumento`** (`VARCHAR(20)`, Opcional): Tipo de identificación (`CUIT`, `CUIL`, `DNI`).
* **`numeroDocumento`** (`VARCHAR(20)`, Opcional): Número de documento o identificación fiscal.
* **`tipo`** (`VARCHAR(20)`, Obligatorio, Default: `'CLIENTE'`):
  * `'PROPIETARIO'`: Dueño de un campo que se alquila. A él se le acopia el cereal y luego él factura al productor cuando vende.
  * `'CLIENTE'`: Persona que contrata labores puntuales de contratista. El productor le factura a él por los servicios.
  * `'AMBOS'`: Tercero que cumple ambos roles.
* **`email`** (`VARCHAR(150)`, Opcional): Correo electrónico de contacto.
* **`telefono`** (`VARCHAR(50)`, Opcional): Teléfono de contacto.
* **`cbu`** (`VARCHAR(50)`, Opcional): CBU, CVU o Alias bancario para liquidaciones y pagos de cereal.
* **`direccion`** (`TEXT`, Opcional): Domicilio fiscal o de residencia.
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`).

---

### 2.3. `Lote` (`agricultura.lotes`)
Parcela o superficie catastral/operativa donde se ejecutan las labores.
* **`id`** (`BigInt`, Clave Primaria, Autoincremental): Identificador único.
* **`nombre`** (`VARCHAR(100)`, Obligatorio, Único): Denominación del lote (ej. `"El Ombú - Lote 4"`).
* **`hectareas`** (`NUMERIC(10,2)`, Obligatorio, `> 0`): Superficie total en hectáreas.
* **`regimen`** (`VARCHAR(20)`, Obligatorio, Default: `'PROPIO'`):
  * `'PROPIO'`: Parcela propia del productor. El 100% de la cosecha es de su propiedad.
  * `'ALQUILADO'`: Parcela arrendada a un tercero.
  * `'SERVICIO_TERCERO'`: Parcela perteneciente a un cliente donde solo se ejecutan labores de contratista.
* **`propietarioId`** (`BigInt`, Opcional, FK -> `terceros(id)`): Propietario o cliente titular del lote.
* **`modalidadAlquiler`** (`VARCHAR(20)`, Opcional):
  * `'PORCENTAJE'`: Se paga un % acordado de la producción cosechada.
  * `'QUINTALES_FIJOS'`: Se paga un canon fijo en quintales (1 qq = 100 kg) por hectárea.
* **`valorAlquiler`** (`NUMERIC(10,2)`, Opcional): Valor pactado (ej. `30.00` para 30%, o `12.00` para 12 quintales/ha).
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`).

---

### 2.4. `Trabajo` (`agricultura.trabajos`)
Superclase de actividades operativas. Registra cada ingreso de maquinaria o personal al campo.
* **`id`** (`BigInt`, Clave Primaria, Autoincremental).
* **`loteId`** (`BigInt`, Obligatorio, FK -> `lotes(id)`, `ON DELETE RESTRICT`).
* **`tipo`** (`VARCHAR(20)`, Obligatorio): Restringido a `'SIEMBRA'`, `'FUMIGACION'` o `'COSECHA'`.
* **`fecha`** (`DATE`, Obligatorio): Día de ejecución de la labor.
* **`hectareas`** (`NUMERIC(10,2)`, Obligatorio, `> 0`): Superficie real trabajada (permite labores parciales sobre el lote).
* **`observaciones`** (`TEXT`, Opcional): Notas del lote, operador o clima.
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`).

---

### 2.5. Subtipos de Trabajos: `Siembra`, `Fumigacion`, `Cosecha`
Relación de especialización 1 a 1 con `Trabajo` (`ON DELETE CASCADE`):

1. **`Siembra` (`agricultura.siembras`)**:
   * **`trabajoId`** (`BigInt`, Clave Única, FK -> `trabajos(id)`).
   * **`cultivoId`** (`BigInt`, Obligatorio, FK -> `cultivos(id)`).
   * **`variedadSemilla`** (`VARCHAR(100)`, Obligatorio): Híbrido o variedad genética implantada (ej. `"DM 46R18"`).

2. **`Fumigacion` (`agricultura.fumigaciones`)**:
   * **`trabajoId`** (`BigInt`, Clave Única, FK -> `trabajos(id)`).
   * **`cultivoId`** (`BigInt`, Opcional, FK -> `cultivos(id)`): Opcional para registrar barbechos químicos en lotes sin cultivo implantado.

3. **`Cosecha` (`agricultura.cosechas`)**:
   * **`trabajoId`** (`BigInt`, Clave Única, FK -> `trabajos(id)`).
   * **`cultivoId`** (`BigInt`, Obligatorio, FK -> `cultivos(id)`).
   * **`rendimiento`** (`NUMERIC(10,2)`, Obligatorio, `>= 0`): Rendimiento obtenido por hectárea o producción total.
   * **Automatización**: Si el lote es `ALQUILADO`, el sistema calcula automáticamente el cereal pactado e ingresa los kilos a la cuenta corriente del dueño en `movimientos_cereal`.

---

### 2.6. `Comprobante` (`agricultura.comprobantes`)
Registro contable y comercial de facturación:
* **`id`** (`BigInt`, Clave Primaria, Autoincremental).
* **`terceroId`** (`BigInt`, Obligatorio, FK -> `terceros(id)`).
* **`direccion`** (`VARCHAR(20)`, Obligatorio):
  * `'EMITIDA'`: Factura emitida por el productor a un cliente por una labor contratada.
  * `'RECIBIDA'`: Factura emitida por el dueño de un campo alquilado al productor por la venta de su cereal acopiado.
* **`tipoComprobante`** (`VARCHAR(30)`, Obligatorio): `'FACTURA_A'`, `'FACTURA_B'`, `'FACTURA_C'`, `'LIQUIDACION'`, `'REMITO'`.
* **`fechaEmision`** (`DATE`, Obligatorio): Fecha del comprobante.
* **`moneda`** (`VARCHAR(10)`, Obligatorio, Default: `'ARS'`).
* **`subtotal`** (`NUMERIC(12,2)`, Obligatorio): Importe neto antes de impuestos.
* **`iva`** (`NUMERIC(12,2)`, Opcional, Default: `0`): Impuesto al Valor Agregado.
* **`total`** (`NUMERIC(12,2)`, Obligatorio): Importe final a cobrar o pagar.
* **`observaciones`** (`TEXT`, Opcional): Concepto, detalle de la operación o notas.
* **`trabajoId`** (`BigInt`, Opcional, FK -> `trabajos(id)`): Vinculación al trabajo agrícola facturado.
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`).

---

### 2.7. `MovimientoCereal` (`agricultura.movimientos_cereal`)
Libro mayor de cuenta corriente de acopio para controlar el stock de granos físico por tercero y cultivo:
* **`id`** (`BigInt`, Clave Primaria, Autoincremental).
* **`terceroId`** (`BigInt`, Obligatorio, FK -> `terceros(id)`): Titular de los granos.
* **`cultivoId`** (`BigInt`, Obligatorio, FK -> `cultivos(id)`): Grano en cuestión.
* **`tipo`** (`VARCHAR(30)`, Obligatorio):
  * `'INGRESO_COSECHA'`: Entrada por cosecha de campo alquilado.
  * `'VENTA_LIQUIDACION'`: Salida de granos por orden de venta del dueño (cantidad en negativo).
  * `'RETIRO_GRANO'`: Salida de granos en camión para uso propio del dueño (semilla, forraje).
  * `'AJUSTE'`: Corrección de kilos por diferencia de balanza, humedad o zaranda.
* **`cantidadKg`** (`NUMERIC(12,2)`, Obligatorio): Kilos del movimiento (positivo = suma; negativo = resta).
* **`cosechaId`** (`BigInt`, Opcional, FK -> `cosechas(id)`): Vinculación a la cosecha de origen.
* **`comprobanteId`** (`BigInt`, Opcional, FK -> `comprobantes(id)`): Vinculación a la factura de liquidación.
* **`fecha`** (`DATE`, Obligatorio): Fecha de la operación.
* **`observaciones`** (`TEXT`, Opcional).
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`).

---

### 2.8. `ArchivoAdjunto` (`agricultura.archivos_adjuntos`)
Metadatos de documentos digitales (facturas en PDF, imágenes de remitos, tickets de balanza, fotos de campo):
* **`id`** (`BigInt`, Clave Primaria, Autoincremental).
* **`nombreOriginal`** (`VARCHAR(255)`, Obligatorio): Nombre original con el que se subió el archivo.
* **`nombreAlmacenado`** (`VARCHAR(255)`, Obligatorio): Nombre UUID único para evitar colisiones.
* **`mimeType`** (`VARCHAR(100)`, Obligatorio): Tipo MIME (`application/pdf`, `image/jpeg`, `image/png`, etc.) para permitir la visualización directa en navegador.
* **`storageProvider`** (`VARCHAR(30)`, Obligatorio): `'AZURE_BLOB'` o `'LOCAL_STORAGE'`.
* **`storagePath`** (`VARCHAR(500)`, Obligatorio): Ruta relativa local o nombre del blob en Azure.
* **`urlPublica`** (`TEXT`, Opcional): URL de acceso público o SAS para descarga/visualización.
* **`comprobanteId`** (`BigInt`, Opcional, FK -> `comprobantes(id)`).
* **`trabajoId`** (`BigInt`, Opcional, FK -> `trabajos(id)`).
* **`createdAt`** (`TIMESTAMPTZ`, Obligatorio, Default: `now()`).

---

## 3. Flujos de Negocio Operativos

```
                            [ RÉGIMEN DE PARCELA ]
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
      PARCELA PROPIA          PARCELA ALQUILADA         SERVICIO A TERCEROS
            │                         │                         │
    Se cosecha el lote        Se cosecha el lote        Se realiza la labor
            │                         │                 (Siembra / Fumigación)
   100% de los granos         Se calcula el canon               │
 son para el productor      (% pactado o quintales)             │
                              e ingresa a Acopio                │
                           a nombre del propietario             │
                                      │                         │
                                      │ Propietario             │
                                      │ decide vender           │
                                      ▼                         ▼
                              LIQUIDACIÓN VENTA          FACTURACIÓN LABOR
                              - Resta kilos acopio       - Factura EMITIDA
                              - Factura RECIBIDA           al cliente
                              - Se adjunta PDF           - Se adjunta PDF
```

---

## 4. Referencia Completa de la API REST (`/api`)

Todas las respuestas exitosas devuelven formato JSON con códigos `200 OK` o `201 Created`. En caso de error de validación se responde `400 Bad Request`, `404 Not Found` o `500 Server Error`.

---

### Módulo de Cultivos (`/api/cultivos`)

#### 1. `GET /api/cultivos`
Obtiene el catálogo completo de cultivos con el conteo de labores y movimientos asociados.
* **Headers**: Ninguno obligatorio.
* **Query Params**: Ninguno.
* **Respuesta Exitosa (200)**:
  ```json
  [
    {
      "id": "1",
      "nombre": "SOJA",
      "createdAt": "2026-09-25T11:00:00.000Z",
      "_count": {
        "siembras": 3,
        "cosechas": 2,
        "fumigaciones": 4,
        "movimientosCereal": 5
      }
    }
  ]
  ```

#### 2. `GET /api/cultivos/:id`
Obtiene un cultivo específico por su ID.
* **Parámetros de Ruta**: `id` (Obligatorio, numérico).
* **Respuesta Exitosa (200)**: Objeto del cultivo.
* **Error (404)**: `{"error": "Cultivo no encontrado"}`

#### 3. `POST /api/cultivos`
Crea un nuevo cultivo.
* **Headers**: `Content-Type: application/json`
* **Body (JSON)**:
  * `nombre` (**Obligatorio**, `string`): Nombre del cultivo.
  ```json
  {
    "nombre": "MAIZ"
  }
  ```
* **Respuesta Exitosa (201)**: Objeto del cultivo creado.
* **Error (400)**: Si ya existe un cultivo con ese nombre o si falta el campo `nombre`.

#### 4. `PUT /api/cultivos/:id`
Actualiza el nombre de un cultivo.
* **Parámetros de Ruta**: `id` (Obligatorio).
* **Body (JSON)**: `{"nombre": "MAIZ TARDIO"}` (**Obligatorio**).
* **Respuesta Exitosa (200)**: Objeto actualizado.

#### 5. `DELETE /api/cultivos/:id`
Elimina un cultivo.
* **Parámetros de Ruta**: `id` (Obligatorio).
* **Respuesta Exitosa (200)**: `{"message": "Cultivo eliminado correctamente"}`
* **Nota**: Fallará si el cultivo tiene labores o movimientos de cereal asociados (integridad referencial).

---

### Módulo de Lotes y Tenencia (`/api/lotes`)

#### 1. `GET /api/lotes`
Lista todos los lotes con los datos básicos de su propietario.
* **Query Params (Opcionales)**:
  * `regimen`: Filtra por `'PROPIO'`, `'ALQUILADO'` o `'SERVICIO_TERCERO'`.
  * `propietarioId`: Filtra por el ID del tercero dueño.
* **Respuesta Exitosa (200)**:
  ```json
  [
    {
      "id": "1",
      "nombre": "Lote 3 - La Estancia",
      "hectareas": "150.00",
      "regimen": "ALQUILADO",
      "modalidadAlquiler": "PORCENTAJE",
      "valorAlquiler": "30.00",
      "propietario": {
        "id": "1",
        "nombre": "Don Juan Pérez",
        "tipo": "PROPIETARIO",
        "telefono": "3415123456",
        "cbu": "0170099920000012345678"
      },
      "_count": { "trabajos": 4 }
    }
  ]
  ```

#### 2. `GET /api/lotes/:id`
Detalle completo de un lote con su historial cronológico de labores y cultivos.
* **Parámetros de Ruta**: `id` (Obligatorio).
* **Respuesta Exitosa (200)**: Lote completo con sus siembras, fumigaciones y cosechas.

#### 3. `POST /api/lotes`
Registra un nuevo lote con su régimen de tenencia.
* **Headers**: `Content-Type: application/json`
* **Body (JSON)**:
  * `nombre` (**Obligatorio**, `string`): Nombre único del lote.
  * `hectareas` (**Obligatorio**, `number`): Superficie en hectáreas.
  * `regimen` (*Opcional*, `string`, default: `'PROPIO'`): `'PROPIO'`, `'ALQUILADO'` o `'SERVICIO_TERCERO'`.
  * `propietarioId` (*Opcional*, `number`): ID del Tercero (obligatorio en la práctica si es alquilado o contratado).
  * `modalidadAlquiler` (*Opcional*, `string`): `'PORCENTAJE'` o `'QUINTALES_FIJOS'`.
  * `valorAlquiler` (*Opcional*, `number`): Porcentaje (ej. `30` para 30%) o quintales por ha (ej. `12` para 12 qq/ha).
  ```json
  {
    "nombre": "Bajo del Molino",
    "hectareas": 80.5,
    "regimen": "ALQUILADO",
    "propietarioId": 1,
    "modalidadAlquiler": "PORCENTAJE",
    "valorAlquiler": 30.0
  }
  ```
* **Respuesta Exitosa (201)**: Lote creado con la relación a su propietario.

#### 4. `PUT /api/lotes/:id`
Actualiza cualquier campo del lote.
* **Body (JSON)**: Acepta los mismos campos opcionales del POST.

#### 5. `DELETE /api/lotes/:id`
Elimina un lote (siempre que no tenga trabajos asociados).

---

### Módulo de Trabajos Agrícolas (`/api/trabajos`)

#### 1. `GET /api/trabajos`
Lista las labores realizadas en el campo.
* **Query Params (Opcionales)**:
  * `loteId`: Filtrar por parcela.
  * `tipo`: Filtrar por `'SIEMBRA'`, `'FUMIGACION'` o `'COSECHA'`.
  * `fechaDesde`: Fecha mínima (`AAAA-MM-DD`).
  * `fechaHasta`: Fecha máxima (`AAAA-MM-DD`).

#### 2. `GET /api/trabajos/:id`
Obtiene el trabajo con su detalle correspondiente, facturas y archivos adjuntos (fotos/remitos).

#### 3. `POST /api/trabajos`
Crea una labor agronómica.
* **Body (JSON)**:
  * `loteId` (**Obligatorio**, `number`): Lote donde se realizó.
  * `tipo` (**Obligatorio**, `string`): `'SIEMBRA'`, `'FUMIGACION'` o `'COSECHA'`.
  * `fecha` (**Obligatorio**, `string`, `AAAA-MM-DD`): Fecha de ejecución.
  * `hectareas` (**Obligatorio**, `number`): Hectáreas trabajadas.
  * `observaciones` (*Opcional*, `string`).
  * **Si `tipo === 'SIEMBRA'`**:
    * `siembra`: Objeto `{ "cultivoId": number, "variedadSemilla": string }`.
  * **Si `tipo === 'FUMIGACION'`**:
    * `fumigacion`: Objeto `{ "cultivoId": number }` (*cultivoId es opcional*).
  * **Si `tipo === 'COSECHA'`**:
    * `cosecha`: Objeto `{ "cultivoId": number, "rendimiento": number }`.

  *Ejemplo Siembra*:
  ```json
  {
    "loteId": 1,
    "tipo": "SIEMBRA",
    "fecha": "2026-10-15",
    "hectareas": 150.0,
    "observaciones": "Siembra directa con humedad óptima",
    "siembra": {
      "cultivoId": 1,
      "variedadSemilla": "DM 46R18"
    }
  }
  ```

  *Ejemplo Cosecha en Lote Alquilado (Ingreso Automático a Acopio)*:
  ```json
  {
    "loteId": 1,
    "tipo": "COSECHA",
    "fecha": "2026-04-20",
    "hectareas": 150.0,
    "cosecha": {
      "cultivoId": 1,
      "rendimiento": 3200.0
    }
  }
  ```
  > **Nota de Automatización**: Al registrar esta cosecha en un lote alquilado con 30% de canon, el sistema automáticamente creará el ingreso en `movimientos_cereal` por `144.000 kg` a nombre del propietario del lote.

#### 4. `PUT /api/trabajos/:id`
Actualiza `fecha`, `hectareas` u `observaciones` de la labor.

#### 5. `DELETE /api/trabajos/:id`
Elimina el trabajo y sus detalles hijos en cascada.

#### 6. `POST /api/trabajos/:id/adjuntos`
Sube una foto de campo o remito de la labor.
* **Headers**: `Content-Type: multipart/form-data`
* **Form-Data**:
  * Archivo en el campo `archivo` (o `file`). Admite imágenes o PDFs de hasta 25 MB.

---

### Módulo de Terceros (`/api/terceros`)

#### 1. `GET /api/terceros`
Lista todos los clientes y propietarios registrados.
* **Query Params (Opcionales)**:
  * `tipo`: Filtrar por `'PROPIETARIO'`, `'CLIENTE'` o `'AMBOS'`.

#### 2. `GET /api/terceros/:id`
Obtiene la ficha completa del tercero: parcelas que posee, facturas emitidas/recibidas y su historial en cuenta corriente de granos.

#### 3. `POST /api/terceros`
Registra un nuevo tercero.
* **Body (JSON)**:
  * `nombre` (**Obligatorio**, `string`): Nombre o Razón Social.
  * `tipo` (*Opcional*, `string`, default: `'CLIENTE'`): `'PROPIETARIO'`, `'CLIENTE'`, `'AMBOS'`.
  * `tipoDocumento` (*Opcional*, `string`): `'CUIT'`, `'DNI'`.
  * `numeroDocumento` (*Opcional*, `string`): Ej. `"20-12345678-9"`.
  * `email` (*Opcional*, `string`).
  * `telefono` (*Opcional*, `string`).
  * `cbu` (*Opcional*, `string`): CBU o Alias bancario.
  * `direccion` (*Opcional*, `string`).
  ```json
  {
    "nombre": "Agropecuaria El Ombú S.A.",
    "tipo": "PROPIETARIO",
    "tipoDocumento": "CUIT",
    "numeroDocumento": "30-71234567-4",
    "email": "administracion@elombu.com",
    "cbu": "0170099920000098765432"
  }
  ```

#### 4. `PUT /api/terceros/:id`
Actualiza cualquier dato de contacto, CBU o tipo del tercero.

#### 5. `DELETE /api/terceros/:id`
Elimina un tercero (si no posee comprobantes o movimientos contables).

---

### Módulo de Facturación y Comprobantes (`/api/comprobantes`)

#### 1. `GET /api/comprobantes`
Consulta de facturación y comprobantes.
* **Query Params (Opcionales)**:
  * `terceroId`: Filtrar por cliente o propietario.
  * `direccion`: `'EMITIDA'` (servicios cobrados) o `'RECIBIDA'` (cereal liquidado).
  * `tipoComprobante`: `'FACTURA_A'`, `'FACTURA_B'`, `'FACTURA_C'`, `'LIQUIDACION'`, `'REMITO'`.
  * `fechaDesde`, `fechaHasta`: Filtro por rango de fechas de emisión.

#### 2. `GET /api/comprobantes/:id`
Detalle del comprobante incluyendo enlaces a todos sus archivos adjuntos.

#### 3. `POST /api/comprobantes`
Registra un comprobante contable.
* **Body (JSON)**:
  * `terceroId` (**Obligatorio**, `number`).
  * `direccion` (**Obligatorio**, `string`): `'EMITIDA'` o `'RECIBIDA'`.
  * `tipoComprobante` (**Obligatorio**, `string`): `'FACTURA_A'`, `'FACTURA_B'`, etc.
  * `fechaEmision` (**Obligatorio**, `string`, `AAAA-MM-DD`).
  * `total` (**Obligatorio**, `number`): Monto final.
  * `subtotal` (*Opcional*, `number`, default: igual a total).
  * `iva` (*Opcional*, `number`, default: 0).
  * `moneda` (*Opcional*, `string`, default: `'ARS'`).
  * `observaciones` (*Opcional*, `string`).
  * `trabajoId` (*Opcional*, `number`): Si factura una labor de contratista.
  ```json
  {
    "terceroId": 2,
    "direccion": "EMITIDA",
    "tipoComprobante": "FACTURA_A",
    "fechaEmision": "2026-09-27",
    "subtotal": 1000000.0,
    "iva": 210000.0,
    "total": 1210000.0,
    "trabajoId": 4,
    "observaciones": "Cobro de servicio de siembra de 100 hectáreas"
  }
  ```

#### 4. `PUT /api/comprobantes/:id`
Actualiza importes, fecha o notas del comprobante.

#### 5. `DELETE /api/comprobantes/:id`
Elimina el comprobante y **elimina automáticamente los archivos físicos asociados** en Azure Blob Storage o el disco local.

#### 6. `POST /api/comprobantes/:id/adjuntos`
Sube la factura digitalizada (PDF o imagen) o remito adjunto.
* **Headers**: `Content-Type: multipart/form-data`
* **Body (Form-Data)**:
  * Archivo adjunto (admite nombres de campo como `archivo`, `file`, `adjunto`, etc.).
  * Límite: 25 MB.
* **Respuesta Exitosa (201)**:
  ```json
  {
    "id": "1",
    "nombreOriginal": "Factura_Siembra_A0001.pdf",
    "nombreAlmacenado": "c8f12a3d-4b5c-4d3e-9f0a-1b2c3d4e5f6a.pdf",
    "mimeType": "application/pdf",
    "storageProvider": "LOCAL_STORAGE",
    "storagePath": "uploads/comprobantes/c8f12a3d-4b5c-4d3e-9f0a-1b2c3d4e5f6a.pdf",
    "urlPublica": "/uploads/comprobantes/c8f12a3d-4b5c-4d3e-9f0a-1b2c3d4e5f6a.pdf",
    "comprobanteId": "1"
  }
  ```

#### 7. `DELETE /api/comprobantes/:id/adjuntos/:adjuntoId`
Elimina un archivo adjunto específico de la base de datos y del almacenamiento físico (Azure/disco).

---

### Módulo de Acopio y Cuenta Corriente de Cereal (`/api/acopio`)

#### 1. `GET /api/acopio/resumen`
Resumen global del stock total de cereal en acopio en todo el establecimiento, agrupado por cultivo.
* **Respuesta Exitosa (200)**:
  ```json
  [
    {
      "cultivoId": "1",
      "cultivoNombre": "SOJA",
      "totalKg": 250000
    },
    {
      "cultivoId": "2",
      "cultivoNombre": "MAIZ",
      "totalKg": 180000
    }
  ]
  ```

#### 2. `GET /api/acopio/saldo/:terceroId`
Consulta el saldo disponible de granos en kilos para un propietario específico, discriminado por cultivo.
* **Parámetros de Ruta**: `terceroId` (**Obligatorio**, numérico).
* **Respuesta Exitosa (200)**:
  ```json
  {
    "tercero": {
      "id": "1",
      "nombre": "Don Juan Pérez",
      "cbu": "0170099920000012345678",
      "tipo": "PROPIETARIO"
    },
    "saldos": [
      {
        "cultivoId": "1",
        "cultivoNombre": "SOJA",
        "saldoKg": 50400
      }
    ]
  }
  ```

#### 3. `GET /api/acopio/movimientos/:terceroId`
Historial detallado cronológico de entradas y salidas de cereal del tercero.

#### 4. `POST /api/acopio/movimiento`
Registra un movimiento manual de stock físico (ingreso, egreso o ajuste).
* **Body (JSON)**:
  * `terceroId` (**Obligatorio**, `number`).
  * `cultivoId` (**Obligatorio**, `number`).
  * `tipo` (**Obligatorio**, `string`): `'INGRESO_COSECHA'`, `'VENTA_LIQUIDACION'`, `'RETIRO_GRANO'`, `'AJUSTE'`.
  * `cantidadKg` (**Obligatorio**, `number`): Positivo para suma, negativo para resta.
  * `fecha` (**Obligatorio**, `string`, `AAAA-MM-DD`).
  * `observaciones` (*Opcional*, `string`).
  ```json
  {
    "terceroId": 1,
    "cultivoId": 1,
    "tipo": "AJUSTE",
    "cantidadKg": -250.0,
    "fecha": "2026-09-27",
    "observaciones": "Merma por zaranda en planta de acopio"
  }
  ```

#### 5. `POST /api/acopio/liquidar` (Operación "Todo en Uno")
Operación comercial: el dueño del campo decide vender cereal. En **una sola llamada**:
1. Descuenta los kilos del acopio (movimiento negativo).
2. Genera automáticamente la factura/liquidación recibida por el monto en dinero.
3. Sube y vincula el archivo PDF o imagen de la factura a Azure Storage o disco local (si se envía).

* **Headers**: `Content-Type: multipart/form-data` (o `application/json` si no se envía archivo).
* **Parámetros del Formulario / Body**:
  * `terceroId` (**Obligatorio**, `number`): ID del dueño del campo.
  * `cultivoId` (**Obligatorio**, `number`): ID del cereal vendido (Soja, Maíz, etc.).
  * `kilosAVender` (**Obligatorio**, `number`): Cantidad de kilos a liquidar.
  * `fecha` (**Obligatorio**, `string`, `AAAA-MM-DD`): Fecha de la venta.
  * `precioPorKilo` (*Opcional*, `number`): Precio por kg acordado (ej. `320.0`).
  * `crearComprobante` (*Opcional*, `boolean`, default: `true` si hay precio o archivo).
  * `tipoComprobante` (*Opcional*, `string`, default: `'LIQUIDACION'` o `'FACTURA_A'`).
  * `observaciones` (*Opcional*, `string`).
  * `archivo` (*Opcional*, `File`): Archivo PDF o imagen de la factura enviada por el dueño.
  
* **Respuesta Exitosa (201)**:
  ```json
  {
    "movimiento": {
      "id": "12",
      "tipo": "VENTA_LIQUIDACION",
      "cantidadKg": "-20000.00",
      "fecha": "2026-09-27T00:00:00.000Z",
      "comprobanteId": "8"
    },
    "comprobante": {
      "id": "8",
      "direccion": "RECIBIDA",
      "tipoComprobante": "LIQUIDACION",
      "total": "6400000.00",
      "archivosAdjuntos": [
        {
          "id": "5",
          "nombreOriginal": "Factura_Liquidacion_Don_Juan.pdf",
          "mimeType": "application/pdf",
          "storageProvider": "LOCAL_STORAGE",
          "urlPublica": "/uploads/comprobantes/c8f12a3d.pdf"
        }
      ]
    }
  }
  ```

#### 6. `DELETE /api/acopio/movimiento/:id`
Elimina un movimiento específico de la cuenta corriente.

---

### Módulo de Salud del Sistema (`/health`)

#### `GET /health`
Comprueba que el servidor Express y la conexión con PostgreSQL en el puerto 5432 estén activos.
* **Respuesta Exitosa (200)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-27T20:00:00.000Z",
    "service": "campo-backend",
    "database": "connected"
  }
  ```

---

## 5. Variables de Entorno y Configuración

El archivo `.env` en la raíz del proyecto contiene la configuración del entorno:

```env
# Conexión a la base de datos PostgreSQL local (esquema agricultura)
DATABASE_URL="postgresql://postgres:admin@localhost:5432/campo?schema=agricultura"

# Configuración del servidor Express
PORT=3000
NODE_ENV=development

# Azure Blob Storage (Opcional)
# Si se deja vacío, los archivos adjuntos se guardan automáticamente en ./uploads/
AZURE_STORAGE_CONNECTION_STRING=""
AZURE_STORAGE_CONTAINER_NAME="archivos-campo"
```

### Comandos de Ejecución:
* **`npm run dev`**: Inicia el servidor de desarrollo en caliente con `ts-node-dev`.
* **`npm run build`**: Compila todo el código TypeScript a JavaScript en `dist/`.
* **`npm start`**: Ejecuta la versión compilada en `dist/index.js` para producción.
* **`npm run prisma:generate`**: Genera el cliente tipado de Prisma.
* **`npx prisma db push`**: Sincroniza y crea las tablas directamente en PostgreSQL.
