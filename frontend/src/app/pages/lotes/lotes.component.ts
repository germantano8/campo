import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgroApiService } from '../../services/agro-api.service';
import { Lote, Tercero, Trabajo } from '../../models/agro.models';

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado de Página -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Gestión de Lotes y Campos</h1>
          <p class="text-sm text-slate-500">Administra parcelas propias, arrendadas y campos de terceros con trazabilidad de labores.</p>
        </div>
        <button
          (click)="abrirModalNuevo()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
        >
          <span>➕</span> Nuevo Lote
        </button>
      </div>

      <!-- Barra de Filtros: Régimen, Buscador y Rango de Fechas -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <!-- Filtros por Régimen -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              (click)="filtrarRegimen('')"
              [class]="filtroActual() === '' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Todos ({{ lotes().length }})
            </button>
            <button
              (click)="filtrarRegimen('PROPIO')"
              [class]="filtroActual() === 'PROPIO' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              🌱 Propios
            </button>
            <button
              (click)="filtrarRegimen('ALQUILADO')"
              [class]="filtroActual() === 'ALQUILADO' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              📜 Arrendados
            </button>
            <button
              (click)="filtrarRegimen('SERVICIO_TERCERO')"
              [class]="filtroActual() === 'SERVICIO_TERCERO' ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              🚜 Servicios
            </button>
          </div>

          <!-- Buscador de Lotes -->
          <div class="relative flex-1 max-w-xs">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs pointer-events-none">🔍</span>
            <input
              type="text"
              [ngModel]="busqueda()"
              (ngModelChange)="busqueda.set($event)"
              placeholder="Buscar lote, parcela, dueño..."
              class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-500"
            />
          </div>
        </div>

        <!-- Rango de Fechas de Registro -->
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span class="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Fecha Registro:</span>
          <div class="flex items-center gap-1">
            <label class="text-[11px] text-slate-500">Desde:</label>
            <input
              type="date"
              [ngModel]="fechaDesde()"
              (ngModelChange)="fechaDesde.set($event)"
              class="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            />
          </div>
          <div class="flex items-center gap-1">
            <label class="text-[11px] text-slate-500">Hasta:</label>
            <input
              type="date"
              [ngModel]="fechaHasta()"
              (ngModelChange)="fechaHasta.set($event)"
              class="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            />
          </div>
          @if (hayFiltros()) {
            <button
              (click)="limpiarFiltros()"
              class="ml-auto text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-rose-50 transition-colors"
            >
              ✕ Limpiar filtros
            </button>
          }
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (cargando()) {
        <div class="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <div class="inline-block w-8 h-8 border-4 border-agro-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-2 text-xs font-semibold text-slate-500">Cargando parcelas y campos...</p>
        </div>
      }

      <!-- Mensaje de Error -->
      @if (errorMensaje()) {
        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>⚠️ {{ errorMensaje() }}</span>
          <button (click)="cargarLotes()" class="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700">
            Reintentar
          </button>
        </div>
      }

      <!-- Estado Vacío -->
      @if (!cargando() && !errorMensaje() && lotesFiltrados().length === 0) {
        <div class="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <span class="text-4xl">🌾</span>
          <h3 class="mt-2 font-bold text-slate-800">No se encontraron lotes</h3>
          <p class="text-xs text-slate-500 mt-1">No hay parcelas registradas para el filtro seleccionado.</p>
          <button (click)="abrirModalNuevo()" class="mt-4 px-4 py-2 bg-agro-600 hover:bg-agro-700 text-white text-xs font-semibold rounded-xl">
            Registrar Primer Lote
          </button>
        </div>
      }

      <!-- Grilla de Lotes -->
      @if (!cargando() && !errorMensaje()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (lote of lotesFiltrados(); track lote.id) {
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div class="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 class="font-bold text-slate-900 text-lg group-hover:text-agro-700 transition-colors">
                    {{ lote.nombre }}
                  </h3>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      [class]="
                        lote.regimen === 'PROPIO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : lote.regimen === 'ALQUILADO'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      "
                      class="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    >
                      {{ lote.regimen === 'PROPIO' ? 'Propio' : lote.regimen === 'ALQUILADO' ? 'Arrendado' : 'Servicio Tercero' }}
                    </span>
                    @if (lote.modalidadAlquiler) {
                      <span class="text-xs text-slate-500 font-medium">
                        {{ lote.modalidadAlquiler === 'PORCENTAJE' ? lote.valorAlquiler + '% a cosecha' : lote.valorAlquiler + ' qq/ha' }}
                      </span>
                    }
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-2xl font-black text-slate-800">{{ lote.hectareas }}</span>
                  <span class="text-xs text-slate-400 block font-semibold">HECTÁREAS</span>
                </div>
              </div>

              <!-- Info Propietario / Tercero -->
              @if (lote.propietario) {
                <div class="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Propietario / Cliente:</span>
                  <div class="font-semibold text-slate-800 text-sm mt-0.5">{{ lote.propietario.nombre }}</div>
                  @if (lote.propietario.telefono) {
                    <div class="text-slate-500 mt-0.5">📞 {{ lote.propietario.telefono }}</div>
                  }
                </div>
              }
            </div>

            <!-- Botones y Acciones -->
            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs text-slate-400">
                Historial: <strong>{{ lote._count?.trabajos || 0 }}</strong> labores
              </span>
              <div class="flex items-center gap-2">
                <button
                  (click)="verDetalle(lote.id)"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-agro-50 text-agro-700 hover:bg-agro-100 transition-colors"
                >
                  Ver Labores 🔍
                </button>
              </div>
            </div>
          </div>
        }
      </div>
      }

      <!-- Modal Detalle de Lote e Historial de Labores -->
      @if (loteSeleccionado()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 class="text-xl font-bold text-slate-900">{{ loteSeleccionado()?.nombre }}</h2>
                <p class="text-xs text-slate-500">Superficie: {{ loteSeleccionado()?.hectareas }} ha | Régimen: {{ loteSeleccionado()?.regimen }}</p>
              </div>
              <button (click)="loteSeleccionado.set(null)" class="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
            </div>

            <div class="mt-5">
              <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Historial Cronológico de Labores</h4>
              @if ((loteSeleccionado()?.trabajos?.length || 0) === 0) {
                <div class="text-center py-8 bg-slate-50 rounded-xl text-slate-400 text-sm">
                  Aún no se han registrado siembras, fumigaciones o cosechas en este lote.
                </div>
              } @else {
                <div class="space-y-3">
                  @for (t of loteSeleccionado()?.trabajos; track t.id) {
                    <div class="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between">
                      <div>
                        <div class="flex items-center gap-2">
                          <span
                            [class]="
                              t.tipo === 'SIEMBRA'
                                ? 'bg-green-100 text-green-800'
                                : t.tipo === 'FUMIGACION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            "
                            class="px-2 py-0.5 rounded text-xs font-bold"
                          >
                            {{ t.tipo }}
                          </span>
                          <span class="text-xs font-semibold text-slate-500">{{ t.fecha }}</span>
                        </div>
                        <div class="text-xs text-slate-600 mt-2">
                          @if (t.siembra) {
                            <div>Cultivo: <strong>{{ t.siembra.cultivo?.nombre }}</strong> (Semilla: {{ t.siembra.variedadSemilla }})</div>
                          }
                          @if (t.fumigacion) {
                            <div>Aplicación fitosanitaria @if(t.fumigacion.cultivo) { sobre {{ t.fumigacion.cultivo.nombre }} }</div>
                          }
                          @if (t.cosecha) {
                            <div>Cosechado: <strong>{{ t.cosecha.cultivo?.nombre }}</strong> - Rendimiento: <strong class="text-agro-700">{{ t.cosecha.rendimiento }} qq/ha</strong></div>
                          }
                          @if (t.observaciones) {
                            <div class="text-slate-400 italic mt-1">{{ t.observaciones }}</div>
                          }
                        </div>
                      </div>
                      <div class="text-right text-xs font-mono font-bold text-slate-700">
                        {{ t.hectareas }} ha
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 text-right">
              <button (click)="loteSeleccionado.set(null)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Nuevo Lote -->
      @if (mostrarModalNuevo()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-900">Registrar Nuevo Lote</h3>
              <button (click)="mostrarModalNuevo.set(false)" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form (ngSubmit)="guardarNuevoLote()" class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre del Lote</label>
                <input
                  type="text"
                  [(ngModel)]="nuevoLote.nombre"
                  name="nombre"
                  required
                  placeholder="Ej. Lote 5 - El Molino"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Superficie (Hectáreas)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="nuevoLote.hectareas"
                  name="hectareas"
                  required
                  placeholder="Ej. 120.5"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Régimen de Tenencia</label>
                <select
                  [(ngModel)]="nuevoLote.regimen"
                  name="regimen"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
                >
                  <option value="PROPIO">🌱 Propio</option>
                  <option value="ALQUILADO">📜 Arrendado / Alquilado</option>
                  <option value="SERVICIO_TERCERO">🚜 Servicio a Terceros</option>
                </select>
              </div>

              @if (nuevoLote.regimen !== 'PROPIO') {
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Dueño / Cliente Asociado</label>
                  <select
                    [(ngModel)]="nuevoLote.propietarioId"
                    name="propietarioId"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
                  >
                    <option [value]="null">Selecciona un tercero...</option>
                    @for (t of terceros(); track t.id) {
                      <option [value]="t.id">{{ t.nombre }} ({{ t.tipo }})</option>
                    }
                  </select>
                </div>
              }

              @if (nuevoLote.regimen === 'ALQUILADO') {
                <div class="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div>
                    <label class="block text-xs font-semibold text-blue-900 mb-1">Modalidad Alquiler</label>
                    <select
                      [(ngModel)]="nuevoLote.modalidadAlquiler"
                      name="modalidadAlquiler"
                      class="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    >
                      <option value="PORCENTAJE">Porcentaje (%) a cosecha</option>
                      <option value="QUINTALES_FIJOS">Quintales Fijos (qq/ha)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-blue-900 mb-1">
                      {{ nuevoLote.modalidadAlquiler === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Quintales por ha' }}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      [(ngModel)]="nuevoLote.valorAlquiler"
                      name="valorAlquiler"
                      placeholder="Ej. 18 o 12.5"
                      class="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              }

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
                  Guardar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class LotesComponent implements OnInit {
  private api = inject(AgroApiService);

  lotes = signal<Lote[]>([]);
  terceros = signal<Tercero[]>([]);
  filtroActual = signal<string>('');
  loteSeleccionado = signal<Lote | null>(null);
  mostrarModalNuevo = signal<boolean>(false);
  cargando = signal<boolean>(true);
  errorMensaje = signal<string>('');

  busqueda = signal<string>('');
  fechaDesde = signal<string>('');
  fechaHasta = signal<string>('');

  lotesFiltrados = computed(() => {
    const f = this.filtroActual();
    const q = this.busqueda().trim().toLowerCase();
    const dDesde = this.fechaDesde();
    const dHasta = this.fechaHasta();
    let items = this.lotes();

    if (f) {
      items = items.filter((l) => l.regimen === f);
    }
    if (q) {
      items = items.filter((l) =>
        (l.nombre && l.nombre.toLowerCase().includes(q)) ||
        (l.propietario?.nombre && l.propietario.nombre.toLowerCase().includes(q))
      );
    }
    if (dDesde) {
      items = items.filter((l: any) => l.createdAt && String(l.createdAt).substring(0, 10) >= dDesde);
    }
    if (dHasta) {
      items = items.filter((l: any) => l.createdAt && String(l.createdAt).substring(0, 10) <= dHasta);
    }
    return items;
  });

  hayFiltros = computed(() => {
    return !!(this.filtroActual() || this.busqueda() || this.fechaDesde() || this.fechaHasta());
  });

  limpiarFiltros(): void {
    this.filtroActual.set('');
    this.busqueda.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
  }

  nuevoLote: any = {
    nombre: '',
    hectareas: null,
    regimen: 'PROPIO',
    propietarioId: null,
    modalidadAlquiler: 'PORCENTAJE',
    valorAlquiler: null,
  };

  ngOnInit(): void {
    this.cargarLotes();
    this.cargarTerceros();
  }

  cargarLotes(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');
    this.api.getLotes().subscribe({
      next: (data) => {
        this.lotes.set(data);
        this.cargando.set(false);
      },
      error: (e) => {
        console.error('Error cargando lotes:', e);
        this.errorMensaje.set('No se pudo conectar con el backend (puerto 3000)');
        this.cargando.set(false);
      },
    });
  }

  cargarTerceros(): void {
    this.api.getTerceros().subscribe({
      next: (data) => this.terceros.set(data),
      error: (e) => console.error(e),
    });
  }

  filtrarRegimen(regimen: string): void {
    this.filtroActual.set(regimen);
  }

  verDetalle(id: string): void {
    this.api.getLoteById(id).subscribe({
      next: (data) => this.loteSeleccionado.set(data),
      error: (e) => console.error(e),
    });
  }

  abrirModalNuevo(): void {
    this.nuevoLote = {
      nombre: '',
      hectareas: null,
      regimen: 'PROPIO',
      propietarioId: null,
      modalidadAlquiler: 'PORCENTAJE',
      valorAlquiler: null,
    };
    this.mostrarModalNuevo.set(true);
  }

  guardarNuevoLote(): void {
    this.api.createLote(this.nuevoLote).subscribe({
      next: () => {
        this.mostrarModalNuevo.set(false);
        this.cargarLotes();
      },
      error: (e) => alert('Error al crear lote: ' + (e.error?.error || e.message)),
    });
  }
}

