import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AgroApiService } from '../../services/agro-api.service';
import { Trabajo, Lote, Cultivo } from '../../models/agro.models';

@Component({
  selector: 'app-trabajos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado de Página -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Labores y Trabajos Agrícolas</h1>
          <p class="text-sm text-slate-500">Registro operativo de siembras, pulverizaciones y cosechas con trazabilidad de rendimientos.</p>
        </div>
        <button
          (click)="abrirModalNuevo()"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
        >
          <span>🚜</span> Nueva Labor
        </button>
      </div>

      <!-- Filtros por Tipo de Labor -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          (click)="filtrarTipo('')"
          [class]="filtroActual() === '' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          Todas ({{ trabajos().length }})
        </button>
        <button
          (click)="filtrarTipo('SIEMBRA')"
          [class]="filtroActual() === 'SIEMBRA' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          🌱 Siembras
        </button>
        <button
          (click)="filtrarTipo('FUMIGACION')"
          [class]="filtroActual() === 'FUMIGACION' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          🧪 Fumigaciones / Barbecho
        </button>
        <button
          (click)="filtrarTipo('COSECHA')"
          [class]="filtroActual() === 'COSECHA' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
        >
          🌾 Cosechas & Rendimiento
        </button>
      </div>

      <!-- Estado de Carga -->
      @if (cargando()) {
        <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div class="inline-block w-8 h-8 border-4 border-agro-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-2 text-xs font-semibold text-slate-500">Cargando labores y trabajos agrícolas...</p>
        </div>
      }

      <!-- Mensaje de Error -->
      @if (errorMensaje()) {
        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ errorMensaje() }}</span>
          </div>
          <button (click)="cargarDatos()" class="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700">
            Reintentar
          </button>
        </div>
      }

      <!-- Estado Vacío -->
      @if (!cargando() && !errorMensaje() && trabajosFiltrados().length === 0) {
        <div class="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <span class="text-4xl">🚜</span>
          <h3 class="mt-2 font-bold text-slate-800">No hay labores registradas</h3>
          <p class="text-xs text-slate-500 mt-1">No se encontraron trabajos para el filtro seleccionado.</p>
          <button (click)="abrirModalNuevo()" class="mt-4 px-4 py-2 bg-agro-600 hover:bg-agro-700 text-white text-xs font-semibold rounded-xl">
            Registrar Primera Labor
          </button>
        </div>
      }

      <!-- Tabla de Labores -->
      @if (!cargando() && !errorMensaje() && trabajosFiltrados().length > 0) {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th class="pb-3">Fecha</th>
                  <th class="pb-3">Lote / Parcela</th>
                  <th class="pb-3">Tipo de Labor</th>
                  <th class="pb-3">Detalle Agronómico</th>
                  <th class="pb-3 text-right">Superficie</th>
                  <th class="pb-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (t of trabajosFiltrados(); track t.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {{ t.fecha | date:'dd/MM/yyyy' }}
                    </td>
                    <td class="py-3 font-semibold text-slate-800">
                      {{ t.lote?.nombre || 'Lote #' + t.loteId }}
                    </td>
                    <td class="py-3">
                      <span
                        [class]="
                          t.tipo === 'SIEMBRA'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : t.tipo === 'FUMIGACION'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        "
                        class="px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap"
                      >
                        {{ t.tipo === 'SIEMBRA' ? '🌱 Siembra' : t.tipo === 'FUMIGACION' ? '🧪 Fumigación' : '🌾 Cosecha' }}
                      </span>
                    </td>
                    <td class="py-3 text-xs text-slate-600">
                      @if (t.siembra) {
                        <div>Cultivo: <strong>{{ t.siembra.cultivo?.nombre }}</strong> | Semilla: {{ t.siembra.variedadSemilla }}</div>
                      }
                      @if (t.fumigacion) {
                        <div>Aplicación fitosanitaria @if (t.fumigacion.cultivo) { en <strong>{{ t.fumigacion.cultivo.nombre }}</strong> } @else { (Barbecho químico) }</div>
                      }
                      @if (t.cosecha) {
                        <div>Cosecha: <strong>{{ t.cosecha.cultivo?.nombre }}</strong> | Rendimiento: <strong class="text-purple-700 font-bold font-mono">{{ t.cosecha.rendimiento }} qq/ha</strong></div>
                      }
                      @if (t.observaciones) {
                        <div class="text-slate-400 italic mt-0.5">{{ t.observaciones }}</div>
                      }
                    </td>
                    <td class="py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      {{ parseNumero(t.hectareas) | number:'1.1-2' }} ha
                    </td>
                    <td class="py-3 text-right whitespace-nowrap">
                      <button
                        (click)="eliminarTrabajo(t.id)"
                        class="text-xs text-slate-400 hover:text-rose-600 font-semibold p-1"
                        title="Eliminar labor"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Modal Nueva Labor -->
      @if (mostrarModalNuevo()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-900">Registrar Labor de Campo</h3>
              <button (click)="mostrarModalNuevo.set(false)" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form (ngSubmit)="guardarTrabajo()" class="mt-4 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Lote</label>
                  <select [(ngModel)]="formTrabajo.loteId" name="loteId" required class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                    <option [value]="''">Selecciona lote...</option>
                    @for (l of lotes(); track l.id) {
                      <option [value]="l.id">{{ l.nombre }} ({{ l.hectareas }} ha)</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Tipo de Labor</label>
                  <select [(ngModel)]="formTrabajo.tipo" name="tipo" required class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                    <option value="SIEMBRA">🌱 Siembra</option>
                    <option value="FUMIGACION">🧪 Fumigación</option>
                    <option value="COSECHA">🌾 Cosecha</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Superficie Intervenida (ha)</label>
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="formTrabajo.hectareas"
                    name="hectareas"
                    required
                    placeholder="Ej. 120.5"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    [(ngModel)]="formTrabajo.fecha"
                    name="fecha"
                    required
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  />
                </div>
              </div>

              <!-- Campos específicos de Siembra -->
              @if (formTrabajo.tipo === 'SIEMBRA') {
                <div class="p-3 bg-green-50/50 rounded-xl border border-green-100 space-y-3">
                  <div>
                    <label class="block text-xs font-semibold text-green-900 mb-1">Cultivo Sembrado</label>
                    <select [(ngModel)]="formTrabajo.cultivoId" name="cultivoId" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                      <option [value]="''">Selecciona cultivo...</option>
                      @for (c of cultivos(); track c.id) {
                        <option [value]="c.id">{{ c.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-green-900 mb-1">Variedad / Semilla</label>
                    <input
                      type="text"
                      [(ngModel)]="formTrabajo.variedadSemilla"
                      name="variedadSemilla"
                      required
                      placeholder="Ej. DM 46i20 IPRO o DK 72-10"
                      class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              }

              <!-- Campos específicos de Fumigación -->
              @if (formTrabajo.tipo === 'FUMIGACION') {
                <div class="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <label class="block text-xs font-semibold text-amber-900 mb-1">Cultivo en Pie (Opcional - dejar vacío si es Barbecho)</label>
                  <select [(ngModel)]="formTrabajo.cultivoId" name="cultivoId" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                    <option [value]="''">Barbecho químico (sin cultivo)</option>
                    @for (c of cultivos(); track c.id) {
                      <option [value]="c.id">{{ c.nombre }}</option>
                    }
                  </select>
                </div>
              }

              <!-- Campos específicos de Cosecha -->
              @if (formTrabajo.tipo === 'COSECHA') {
                <div class="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                  <div>
                    <label class="block text-xs font-semibold text-purple-900 mb-1">Cultivo Cosechado</label>
                    <select [(ngModel)]="formTrabajo.cultivoId" name="cultivoId" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
                      <option [value]="''">Selecciona cultivo...</option>
                      @for (c of cultivos(); track c.id) {
                        <option [value]="c.id">{{ c.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-purple-900 mb-1">Rendimiento Obtenido (Quintales por ha)</label>
                    <input
                      type="number"
                      step="0.01"
                      [(ngModel)]="formTrabajo.rendimiento"
                      name="rendimiento"
                      required
                      placeholder="Ej. 38.5 qq/ha"
                      class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              }

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Observaciones</label>
                <input
                  type="text"
                  [(ngModel)]="formTrabajo.observaciones"
                  name="observaciones"
                  placeholder="Detalles de la labor, clima o insumos..."
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div class="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  (click)="mostrarModalNuevo.set(false)"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Guardar Labor
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class TrabajosComponent implements OnInit {
  private api = inject(AgroApiService);

  trabajos = signal<Trabajo[]>([]);
  lotes = signal<Lote[]>([]);
  cultivos = signal<Cultivo[]>([]);
  filtroActual = signal<string>('');
  mostrarModalNuevo = signal<boolean>(false);

  cargando = signal<boolean>(true);
  errorMensaje = signal<string>('');

  trabajosFiltrados = computed(() => {
    const f = this.filtroActual();
    const items = this.trabajos();
    if (!f) return items;
    return items.filter((t) => t.tipo === f);
  });

  formTrabajo: any = {
    loteId: '',
    tipo: 'SIEMBRA',
    fecha: new Date().toISOString().substring(0, 10),
    hectareas: null,
    cultivoId: '',
    variedadSemilla: '',
    rendimiento: null,
    observaciones: '',
  };

  parseNumero(val: any): number {
    return Number(val) || 0;
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    forkJoin({
      trabajos: this.api.getTrabajos(),
      lotes: this.api.getLotes(),
      cultivos: this.api.getCultivos(),
    }).subscribe({
      next: (res) => {
        this.trabajos.set(res.trabajos || []);
        this.lotes.set(res.lotes || []);
        this.cultivos.set(res.cultivos || []);
        this.cargando.set(false);
      },
      error: (e) => {
        console.error('Error cargando labores:', e);
        this.errorMensaje.set('No se pudo conectar con el backend (puerto 3000)');
        this.cargando.set(false);
      },
    });
  }

  filtrarTipo(tipo: string): void {
    this.filtroActual.set(tipo);
  }

  abrirModalNuevo(): void {
    this.formTrabajo = {
      loteId: '',
      tipo: 'SIEMBRA',
      fecha: new Date().toISOString().substring(0, 10),
      hectareas: null,
      cultivoId: '',
      variedadSemilla: '',
      rendimiento: null,
      observaciones: '',
    };
    this.mostrarModalNuevo.set(true);
  }

  guardarTrabajo(): void {
    const payload: any = {
      loteId: this.formTrabajo.loteId,
      tipo: this.formTrabajo.tipo,
      fecha: this.formTrabajo.fecha,
      hectareas: this.formTrabajo.hectareas,
      observaciones: this.formTrabajo.observaciones || undefined,
    };

    if (this.formTrabajo.tipo === 'SIEMBRA') {
      payload.siembra = {
        cultivoId: this.formTrabajo.cultivoId,
        variedadSemilla: this.formTrabajo.variedadSemilla,
      };
    } else if (this.formTrabajo.tipo === 'FUMIGACION') {
      payload.fumigacion = {
        cultivoId: this.formTrabajo.cultivoId || undefined,
      };
    } else if (this.formTrabajo.tipo === 'COSECHA') {
      payload.cosecha = {
        cultivoId: this.formTrabajo.cultivoId,
        rendimiento: this.formTrabajo.rendimiento,
      };
    }

    this.api.createTrabajo(payload).subscribe({
      next: () => {
        this.mostrarModalNuevo.set(false);
        this.cargarDatos();
      },
      error: (e) => alert('Error al crear labor: ' + (e.error?.error || e.message)),
    });
  }

  eliminarTrabajo(id: string): void {
    if (confirm('¿Estás seguro de eliminar esta labor?')) {
      this.api.deleteTrabajo(id).subscribe({
        next: () => this.cargarDatos(),
        error: (e) => alert('Error: ' + (e.error?.error || e.message)),
      });
    }
  }
}
