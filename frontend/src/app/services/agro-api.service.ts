import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Cultivo,
  Lote,
  Tercero,
  Trabajo,
  MovimientoCereal,
  SaldoCereal,
  Comprobante,
  ArchivoAdjunto,
} from '../models/agro.models';

@Injectable({
  providedIn: 'root',
})
export class AgroApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Cultivos
  getCultivos(): Observable<Cultivo[]> {
    return this.http.get<Cultivo[]>(`${this.baseUrl}/cultivos`);
  }

  // Terceros
  getTerceros(tipo?: string): Observable<Tercero[]> {
    const params: any = {};
    if (tipo) params.tipo = tipo;
    return this.http.get<Tercero[]>(`${this.baseUrl}/terceros`, { params });
  }

  createTercero(data: Partial<Tercero>): Observable<Tercero> {
    return this.http.post<Tercero>(`${this.baseUrl}/terceros`, data);
  }

  // Lotes
  getLotes(regimen?: string): Observable<Lote[]> {
    const params: any = {};
    if (regimen) params.regimen = regimen;
    return this.http.get<Lote[]>(`${this.baseUrl}/lotes`, { params });
  }

  getLoteById(id: string): Observable<Lote> {
    return this.http.get<Lote>(`${this.baseUrl}/lotes/${id}`);
  }

  createLote(data: any): Observable<Lote> {
    return this.http.post<Lote>(`${this.baseUrl}/lotes`, data);
  }

  deleteLote(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/lotes/${id}`);
  }

  // Trabajos
  getTrabajos(loteId?: string, tipo?: string): Observable<Trabajo[]> {
    const params: any = {};
    if (loteId) params.loteId = loteId;
    if (tipo) params.tipo = tipo;
    return this.http.get<Trabajo[]>(`${this.baseUrl}/trabajos`, { params });
  }

  createTrabajo(data: any): Observable<Trabajo> {
    return this.http.post<Trabajo>(`${this.baseUrl}/trabajos`, data);
  }

  deleteTrabajo(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/trabajos/${id}`);
  }

  // Acopio de Cereal
  getSaldosAcopio(): Observable<SaldoCereal[]> {
    return this.http.get<SaldoCereal[]>(`${this.baseUrl}/acopio/saldos`);
  }

  getMovimientosAcopio(terceroId?: string, cultivoId?: string): Observable<MovimientoCereal[]> {
    const params: any = {};
    if (terceroId) params.terceroId = terceroId;
    if (cultivoId) params.cultivoId = cultivoId;
    return this.http.get<MovimientoCereal[]>(`${this.baseUrl}/acopio/movimientos`, { params });
  }

  registrarMovimientoAcopio(data: {
    terceroId: string;
    cultivoId: string;
    tipo: string;
    cantidadKg: number;
    fecha?: string;
    observaciones?: string;
  }): Observable<MovimientoCereal> {
    return this.http.post<MovimientoCereal>(`${this.baseUrl}/acopio/movimiento`, data);
  }

  // Liquidación Todo en Uno (soporta multipart/form-data con archivo adjunto de factura)
  liquidarCereal(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/acopio/liquidar`, formData);
  }

  // Comprobantes
  getComprobantes(terceroId?: string, direccion?: string): Observable<Comprobante[]> {
    const params: any = {};
    if (terceroId) params.terceroId = terceroId;
    if (direccion) params.direccion = direccion;
    return this.http.get<Comprobante[]>(`${this.baseUrl}/comprobantes`, { params });
  }

  subirAdjuntoComprobante(comprobanteId: string, file: File): Observable<ArchivoAdjunto> {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.http.post<ArchivoAdjunto>(`${this.baseUrl}/comprobantes/${comprobanteId}/adjuntos`, formData);
  }
}

