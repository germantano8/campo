-- 1. Creación del schema
CREATE SCHEMA IF NOT EXISTS agricultura;

-- Configurar search_path para ejecutar las sentencias dentro del schema
SET search_path TO agricultura, public;

-- ============================================================================
-- 2. Entidad: CULTIVOS
-- ============================================================================
CREATE TABLE agricultura.cultivos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cultivos_nombre UNIQUE (nombre)
);

-- ============================================================================
-- 3. Entidad: LOTES
-- ============================================================================
CREATE TABLE agricultura.lotes (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    hectareas NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lotes_hectareas_positivas CHECK (hectareas > 0),
    CONSTRAINT uq_lotes_nombre UNIQUE (nombre)
);

-- ============================================================================
-- 4. Entidad: TRABAJOS (Supertype consolidado)
-- Absorbe 'trabajo_lote' garantizando 1 lote por trabajo y trazabilidad de hectáreas
-- ============================================================================
CREATE TABLE agricultura.trabajos (
    id BIGSERIAL PRIMARY KEY,
    lote_id BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    hectareas NUMERIC(10, 2) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trabajos_lote FOREIGN KEY (lote_id)
        REFERENCES agricultura.lotes (id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_trabajos_tipo CHECK (tipo IN ('SIEMBRA', 'FUMIGACION', 'COSECHA')),
    CONSTRAINT chk_trabajos_hectareas_positivas CHECK (hectareas > 0)
);

-- Índices de búsqueda y performance para trabajos
CREATE INDEX idx_trabajos_lote_id ON agricultura.trabajos (lote_id);
CREATE INDEX idx_trabajos_fecha ON agricultura.trabajos (fecha);
CREATE INDEX idx_trabajos_tipo ON agricultura.trabajos (tipo);

-- ============================================================================
-- 5. Subtipo: SIEMBRAS
-- ============================================================================
CREATE TABLE agricultura.siembras (
    id BIGSERIAL PRIMARY KEY,
    trabajo_id BIGINT NOT NULL,
    cultivo_id BIGINT NOT NULL,
    variedad_semilla VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_siembras_trabajo UNIQUE (trabajo_id),
    CONSTRAINT fk_siembras_trabajo FOREIGN KEY (trabajo_id)
        REFERENCES agricultura.trabajos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_siembras_cultivo FOREIGN KEY (cultivo_id)
        REFERENCES agricultura.cultivos (id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_siembras_cultivo_id ON agricultura.siembras (cultivo_id);

-- ============================================================================
-- 6. Subtipo: FUMIGACIONES (Simplificada)
-- cultivo_id es opcional (permite registrar barbecho químico / lote limpio)
-- ============================================================================
CREATE TABLE agricultura.fumigaciones (
    id BIGSERIAL PRIMARY KEY,
    trabajo_id BIGINT NOT NULL,
    cultivo_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fumigaciones_trabajo UNIQUE (trabajo_id),
    CONSTRAINT fk_fumigaciones_trabajo FOREIGN KEY (trabajo_id)
        REFERENCES agricultura.trabajos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fumigaciones_cultivo FOREIGN KEY (cultivo_id)
        REFERENCES agricultura.cultivos (id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_fumigaciones_cultivo_id ON agricultura.fumigaciones (cultivo_id);

-- ============================================================================
-- 7. Subtipo: COSECHAS
-- ============================================================================
CREATE TABLE agricultura.cosechas (
    id BIGSERIAL PRIMARY KEY,
    trabajo_id BIGINT NOT NULL,
    cultivo_id BIGINT NOT NULL,
    rendimiento NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cosechas_trabajo UNIQUE (trabajo_id),
    CONSTRAINT fk_cosechas_trabajo FOREIGN KEY (trabajo_id)
        REFERENCES agricultura.trabajos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cosechas_cultivo FOREIGN KEY (cultivo_id)
        REFERENCES agricultura.cultivos (id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_cosechas_rendimiento_no_negativo CHECK (rendimiento >= 0)
);

CREATE INDEX idx_cosechas_cultivo_id ON agricultura.cosechas (cultivo_id);