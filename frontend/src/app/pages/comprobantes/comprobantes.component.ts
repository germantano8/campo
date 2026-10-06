import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgroApiService } from '../../services/agro-api.service';
import { Comprobante } from '../../models/agro.models';

@Component({
  selector: 'app-comprobantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado de Página -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Comprobantes y Facturación</h1>
          <p class="text-sm text-slate-500">Historial contable de facturas emitidas y recibidas, con repositorio de archivos PDF e imágenes.</p>
        </div>
      </div>

      <!-- Filtros por Dirección -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          (click)="filtrarDireccion('')"
          [class]="filtroActual() === '' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          Todos ({{ comprobantes().length }})
        </button>
        <button
          (click)="filtrarDireccion('RECIBIDA')"
          [class]="filtroActual() === 'RECIBIDA' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          📥 Recibidas (Liquidaciones y Gastos)
        </button>
        <button
          (click)="filtrarDireccion('EMITIDA')"
          [class]="filtroActual() === 'EMITIDA' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          📤 Emitidas (Cobros a Terceros)
        </button>
      </div>

      <!-- Estado de Carga -->
      @if (cargando()) {
        <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div class="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-2 text-xs font-semibold text-slate-500">Cargando comprobantes y facturas...</p>
        </div>
      }

      <!-- Mensaje de Error -->
      @if (errorMensaje()) {
        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ errorMensaje() }}</span>
          </div>
          <button (click)="cargarComprobantes()" class="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700">
            Reintentar
          </button>
        </div>
      }

      <!-- Estado Vacío -->
      @if (!cargando() && !errorMensaje() && comprobantesFiltrados().length === 0) {
        <div class="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <span class="text-4xl">🧾</span>
          <h3 class="mt-2 font-bold text-slate-800">No hay comprobantes</h3>
          <p class="text-xs text-slate-500 mt-1">No se encontraron facturas o liquidaciones para el filtro seleccionado.</p>
        </div>
      }

      <!-- Tabla de Comprobantes -->
      @if (!cargando() && !errorMensaje() && comprobantesFiltrados().length > 0) {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th class="pb-3">ID / Fecha</th>
                  <th class="pb-3">Tercero / Cliente</th>
                  <th class="pb-3">Tipo Comprobante</th>
                  <th class="pb-3">Descripción / Obs</th>
                  <th class="pb-3 text-right">Importe Total</th>
                  <th class="pb-3 text-right">Archivo Adjunto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (c of comprobantesFiltrados(); track c.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 text-xs whitespace-nowrap">
                      <span class="font-bold text-slate-800">#{{ c.id }}</span>
                      <span class="text-slate-400 block">{{ c.fechaEmision | date:'dd/MM/yyyy' }}</span>
                    </td>
                    <td class="py-3 font-semibold text-slate-800">
                      {{ c.tercero?.nombre || 'Tercero #' + c.terceroId }}
                    </td>
                    <td class="py-3">
                      <span
                        [class]="
                          c.direccion === 'RECIBIDA'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        "
                        class="px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap"
                      >
                        {{ c.tipoComprobante }} ({{ c.direccion === 'RECIBIDA' ? 'Recibida' : 'Emitida' }})
                      </span>
                    </td>
                    <td class="py-3 text-xs text-slate-600">
                      {{ c.observaciones || '-' }}
                    </td>
                    <td class="py-3 text-right font-mono font-bold text-slate-900 text-base whitespace-nowrap">
                      \${{ parseNumero(c.total) | number:'1.2-2' }}
                    </td>
                    <td class="py-3 text-right whitespace-nowrap">
                      @if (subiendoAdjunto() === c.id) {
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium">
                          <span class="w-3 h-3 border-2 border-agro-600 border-t-transparent rounded-full animate-spin"></span>
                          Subiendo...
                        </span>
                      } @else if (c.archivosAdjuntos && c.archivosAdjuntos.length > 0) {
                        <div class="inline-flex items-center gap-1.5">
                          <a
                            [href]="obtenerUrlArchivo(c.archivosAdjuntos[0])"
                            target="_blank"
                            class="inline-flex items-center gap-1 px-3 py-1 bg-agro-50 hover:bg-agro-100 text-agro-700 border border-agro-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            📄 Ver PDF
                          </a>
                          <label
                            class="cursor-pointer text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded text-xs transition-colors"
                            title="Cambiar o reemplazar PDF adjunto"
                          >
                            ✏️
                            <input
                              type="file"
                              (change)="subirAdjunto(c.id, $event)"
                              accept=".pdf,image/*"
                              class="hidden"
                            />
                          </label>
                        </div>
                      } @else {
                        <div>
                          <label class="cursor-pointer inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200 shadow-sm">
                            <span>📎 Subir PDF</span>
                            <input
                              type="file"
                              (change)="subirAdjunto(c.id, $event)"
                              accept=".pdf,image/*"
                              class="hidden"
                            />
                          </label>
                        </div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class ComprobantesComponent implements OnInit {
  private api = inject(AgroApiService);

  comprobantes = signal<Comprobante[]>([]);
  filtroActual = signal<string>('');

  cargando = signal<boolean>(true);
  errorMensaje = signal<string>('');
  subiendoAdjunto = signal<string | null>(null);

  comprobantesFiltrados = computed(() => {
    const f = this.filtroActual();
    const items = this.comprobantes();
    if (!f) return items;
    return items.filter((c) => c.direccion === f);
  });

  parseNumero(val: any): number {
    return Number(val) || 0;
  }

  ngOnInit(): void {
    this.cargarComprobantes();
  }

  cargarComprobantes(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    this.api.getComprobantes().subscribe({
      next: (data) => {
        this.comprobantes.set(data || []);
        this.cargando.set(false);
      },
      error: (e) => {
        console.error('Error cargando comprobantes:', e);
        this.errorMensaje.set('No se pudo conectar con el backend (puerto 3000)');
        this.cargando.set(false);
      },
    });
  }

  filtrarDireccion(dir: string): void {
    this.filtroActual.set(dir);
  }

  obtenerUrlArchivo(adjunto: any): string {
    const rawPath = adjunto.urlPublica || adjunto.storagePath;
    if (!rawPath) return '#';
    if (rawPath.startsWith('http')) return rawPath;
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return `http://localhost:3000${cleanPath}`;
  }

  subirAdjunto(comprobanteId: string, event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      this.subiendoAdjunto.set(comprobanteId);
      this.api.subirAdjuntoComprobante(comprobanteId, file).subscribe({
        next: () => {
          this.subiendoAdjunto.set(null);
          this.cargarComprobantes();
        },
        error: (e) => {
          this.subiendoAdjunto.set(null);
          alert('Error al subir adjunto: ' + (e.error?.error || e.message));
        },
      });
    }
  }
}
