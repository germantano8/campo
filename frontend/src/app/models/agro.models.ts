export interface Cultivo {
  id: string;
  nombre: string;
}

export interface Tercero {
  id: string;
  nombre: string;
  tipo: 'PROPIETARIO' | 'CLIENTE' | 'AMBOS';
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  cbu?: string;
}

export interface Lote {
  id: string;
  nombre: string;
  hectareas: number | string;
  regimen: 'PROPIO' | 'ALQUILADO' | 'SERVICIO_TERCERO';
  propietarioId?: string | null;
  modalidadAlquiler?: 'PORCENTAJE' | 'QUINTALES_FIJOS' | null;
  valorAlquiler?: number | string | null;
  propietario?: Tercero | null;
  _count?: {
    trabajos: number;
  };
  trabajos?: Trabajo[];
}

export interface Trabajo {
  id: string;
  loteId: string;
  tipo: 'SIEMBRA' | 'FUMIGACION' | 'COSECHA';
  fecha: string;
  hectareas: number | string;
  observaciones?: string;
  lote?: Lote;
  siembra?: {
    id: string;
    cultivoId: string;
    variedadSemilla: string;
    cultivo?: Cultivo;
  };
  fumigacion?: {
    id: string;
    cultivoId?: string;
    cultivo?: Cultivo;
  };
  cosecha?: {
    id: string;
    cultivoId: string;
    rendimiento: number | string;
    cultivo?: Cultivo;
  };
}

export interface MovimientoCereal {
  id: string;
  terceroId: string;
  cultivoId: string;
  tipo: 'INGRESO_COSECHA' | 'VENTA_LIQUIDACION' | 'RETIRO_GRANO' | 'AJUSTE';
  cantidadKg: number | string;
  fecha: string;
  observaciones?: string;
  tercero?: Tercero;
  cultivo?: Cultivo;
  comprobanteId?: string;
  cosechaId?: string;
  cosecha?: {
    id: string;
    trabajo?: Trabajo;
  };
}

export interface SaldoCereal {
  terceroId: string;
  terceroNombre: string;
  cultivoId: string;
  cultivoNombre: string;
  saldoKg: number;
}

export interface ArchivoAdjunto {
  id: string;
  nombreOriginal: string;
  nombreAlmacenado: string;
  mimeType: string;
  storageProvider: string;
  storagePath: string;
  urlPublica?: string;
}

export interface Comprobante {
  id: string;
  terceroId: string;
  direccion: 'EMITIDA' | 'RECIBIDA';
  tipoComprobante: string;
  fechaEmision: string;
  moneda: string;
  subtotal: number | string;
  iva?: number | string;
  total: number | string;
  observaciones?: string;
  trabajoId?: string;
  trabajo?: Trabajo;
  tercero?: Tercero;
  archivosAdjuntos?: ArchivoAdjunto[];
}

