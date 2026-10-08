import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AgroApiService } from '../../services/agro-api.service';
import { Comprobante, Tercero, Trabajo } from '../../models/agro.models';

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
        <div>
          <button
            (click)="abrirModalEmitir()"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
          >
            <span>➕</span> Emitir Factura / Cobro
          </button>
        </div>
      </div>

      <!-- Barra de Filtros: Dirección, Buscador y Rango de Fechas -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <!-- Filtros por Dirección -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              (click)="filtrarDireccion('')"
              [class]="filtroActual() === '' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Todos ({{ comprobantes().length }})
            </button>
            <button
              (click)="filtrarDireccion('RECIBIDA')"
              [class]="filtroActual() === 'RECIBIDA' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              📥 Recibidas
            </button>
            <button
              (click)="filtrarDireccion('EMITIDA')"
              [class]="filtroActual() === 'EMITIDA' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            >
              📤 Emitidas
            </button>
          </div>

          <!-- Buscador de Comprobantes -->
          <div class="relative flex-1 max-w-xs">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs pointer-events-none">🔍</span>
            <input
              type="text"
              [ngModel]="busqueda()"
              (ngModelChange)="busqueda.set($event)"
              placeholder="Buscar por lote, cliente, tipo, obs, número..."
              class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-500"
            />
          </div>
        </div>

        <!-- Rango de Fechas de Emisión -->
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span class="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Fecha Emisión:</span>
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
          <button
            (click)="abrirModalEmitir()"
            class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
          >
            Registrar Primera Factura
          </button>
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
                      @if (c.trabajoId) {
                        <span class="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">
                          Labor #{{ c.trabajoId }}@if ($any(c).trabajo?.lote?.nombre) { ({{ $any(c).trabajo?.lote?.nombre }}) }
                        </span>
                      }
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

      <!-- Modal "Emitir Factura / Cobro a Cliente" -->
      @if (mostrarModalEmitir()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-lg font-bold text-slate-900">Registrar Factura Emitida</h3>
                <p class="text-xs text-slate-500">Comprobante de ingreso por venta de cereal, labores o servicios a clientes.</p>
              </div>
              <button (click)="mostrarModalEmitir.set(false)" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form (ngSubmit)="guardarFacturaEmitida()" class="mt-4 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Cliente / Destinatario</label>
                  <select
                    [(ngModel)]="formEmitir.terceroId"
                    name="terceroId"
                    required
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option [value]="''">Selecciona cliente...</option>
                    @for (t of terceros(); track t.id) {
                      <option [value]="t.id">{{ t.nombre }} ({{ t.tipo }})</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Tipo de Comprobante</label>
                  <select
                    [(ngModel)]="formEmitir.tipoComprobante"
                    name="tipoComprobante"
                    required
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="FACTURA_A">Factura A (Resp. Inscripto)</option>
                    <option value="FACTURA_B">Factura B (Cons. Final / Exento)</option>
                    <option value="FACTURA_C">Factura C (Monotributo / Servicios)</option>
                    <option value="RECIBO">Recibo de Cobro</option>
                    <option value="REMITO">Remito</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha de Emisión</label>
                  <input
                    type="date"
                    [(ngModel)]="formEmitir.fechaEmision"
                    name="fechaEmision"
                    required
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Moneda</label>
                  <select
                    [(ngModel)]="formEmitir.moneda"
                    name="moneda"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="ARS">ARS ($ Pesos Argentinos)</option>
                    <option value="USD">USD (U$S Dólares)</option>
                  </select>
                </div>
              </div>

              <!-- Bloque de Importes con cálculo automático de IVA -->
              <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Subtotal Neto ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      [(ngModel)]="formEmitir.subtotal"
                      (ngModelChange)="calcularTotales()"
                      name="subtotal"
                      required
                      placeholder="Ej. 100000"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Alícuota IVA</label>
                    <select
                      [(ngModel)]="formEmitir.alicuotaIva"
                      (ngModelChange)="calcularTotales()"
                      name="alicuotaIva"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option [ngValue]="21">21 % (Tasa General)</option>
                      <option [ngValue]="10.5">10.5 % (Bienes de Capital / Granos)</option>
                      <option [ngValue]="0">0 % (Exento / Factura C)</option>
                    </select>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <span class="text-slate-500">IVA Calculado: <strong class="font-mono text-slate-700">\${{ formEmitir.iva | number:'1.2-2' }}</strong></span>
                  <div class="text-right">
                    <span class="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">Total Factura:</span>
                    <span class="text-lg font-black text-emerald-700 font-mono">
                      \${{ formEmitir.total | number:'1.2-2' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Vincular opcionalmente a una Labor Agrícola -->
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">
                  🚜 Vincular a Labor Agrícola (Opcional)
                </label>
                <select
                  [(ngModel)]="formEmitir.trabajoId"
                  name="trabajoId"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option [value]="''">Ninguna labor vinculada (cobro directo)</option>
                  @for (tr of trabajos(); track tr.id) {
                    <option [value]="tr.id">
                      #{{ tr.id }} - {{ tr.tipo }} ({{ tr.lote?.nombre || 'Lote #' + tr.loteId }}) - {{ tr.fecha | date:'dd/MM/yyyy' }}
                    </option>
                  }
                </select>
                <span class="text-[11px] text-slate-400 mt-0.5 block">
                  Permite saber qué labor en el campo originó este cobro.
                </span>
              </div>

              <!-- Archivo Adjunto PDF de AFIP -->
              <div class="p-3 bg-white border border-slate-200 rounded-xl">
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  📄 Comprobante PDF de AFIP / ARCA (Opcional)
                </label>
                <input
                  type="file"
                  (change)="onArchivoSeleccionado($event)"
                  accept=".pdf,image/*"
                  class="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <span class="text-[11px] text-slate-400 mt-1 block">
                  Podés subir la factura descargada de AFIP ahora o adjuntarla después desde la tabla.
                </span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Observaciones / Concepto</label>
                <input
                  type="text"
                  [(ngModel)]="formEmitir.observaciones"
                  name="observaciones"
                  placeholder="Ej. Servicio de fumigación terrestre 160 ha, CAE 74123..."
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div class="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  (click)="mostrarModalEmitir.set(false)"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="guardandoComprobante()"
                  class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50"
                >
                  {{ guardandoComprobante() ? 'Guardando...' : 'Guardar Factura' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ComprobantesComponent implements OnInit {
  private api = inject(AgroApiService);
  private route = inject(ActivatedRoute);

  comprobantes = signal<Comprobante[]>([]);
  terceros = signal<Tercero[]>([]);
  trabajos = signal<Trabajo[]>([]);
  filtroActual = signal<string>('');

  cargando = signal<boolean>(true);
  errorMensaje = signal<string>('');
  subiendoAdjunto = signal<string | null>(null);

  mostrarModalEmitir = signal<boolean>(false);
  guardandoComprobante = signal<boolean>(false);

  archivoSeleccionado: File | null = null;

  formEmitir = {
    terceroId: '',
    tipoComprobante: 'FACTURA_A',
    fechaEmision: new Date().toISOString().substring(0, 10),
    moneda: 'ARS',
    subtotal: null as number | null,
    alicuotaIva: 21,
    iva: 0 as number,
    total: 0 as number,
    trabajoId: '',
    observaciones: '',
  };

  busqueda = signal<string>('');
  fechaDesde = signal<string>('');
  fechaHasta = signal<string>('');

  comprobantesFiltrados = computed(() => {
    const f = this.filtroActual();
    const q = this.busqueda().trim().toLowerCase();
    const dDesde = this.fechaDesde();
    const dHasta = this.fechaHasta();
    let items = this.comprobantes();

    if (f) {
      items = items.filter((c) => c.direccion === f);
    }
    if (q) {
      items = items.filter((c) => {
        const id = String(c.id);
        const tercero = c.tercero?.nombre?.toLowerCase() || '';
        const tipo = c.tipoComprobante?.toLowerCase() || '';
        const obs = c.observaciones?.toLowerCase() || '';
        const total = String(c.total);
        const lote = (c as any).trabajo?.lote?.nombre?.toLowerCase() || '';
        return id.includes(q) || tercero.includes(q) || tipo.includes(q) || obs.includes(q) || total.includes(q) || lote.includes(q);
      });
    }
    if (dDesde) {
      items = items.filter((c) => c.fechaEmision && String(c.fechaEmision).substring(0, 10) >= dDesde);
    }
    if (dHasta) {
      items = items.filter((c) => c.fechaEmision && String(c.fechaEmision).substring(0, 10) <= dHasta);
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

  parseNumero(val: any): number {
    return Number(val) || 0;
  }

  ngOnInit(): void {
    this.cargarComprobantes();
    this.cargarDatosAuxiliares();

    // Si viene desde un enlace rápido con queryParams (ej. desde una labor)
    this.route.queryParams.subscribe((params) => {
      if (params['trabajoId'] || params['terceroId']) {
        this.abrirModalEmitir();
        if (params['terceroId']) this.formEmitir.terceroId = params['terceroId'];
        if (params['trabajoId']) this.formEmitir.trabajoId = params['trabajoId'];
      }
    });
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

  cargarDatosAuxiliares(): void {
    this.api.getTerceros().subscribe({
      next: (data) => this.terceros.set(data || []),
      error: (e) => console.error(e),
    });

    this.api.getTrabajos().subscribe({
      next: (data) => this.trabajos.set(data || []),
      error: (e) => console.error(e),
    });
  }

  filtrarDireccion(dir: string): void {
    this.filtroActual.set(dir);
  }

  abrirModalEmitir(): void {
    this.archivoSeleccionado = null;
    this.formEmitir = {
      terceroId: '',
      tipoComprobante: 'FACTURA_A',
      fechaEmision: new Date().toISOString().substring(0, 10),
      moneda: 'ARS',
      subtotal: null,
      alicuotaIva: 21,
      iva: 0,
      total: 0,
      trabajoId: '',
      observaciones: '',
    };
    this.mostrarModalEmitir.set(true);
  }

  calcularTotales(): void {
    const sub = Number(this.formEmitir.subtotal) || 0;
    const ali = Number(this.formEmitir.alicuotaIva) || 0;
    const ivaCalc = +(sub * (ali / 100)).toFixed(2);
    this.formEmitir.iva = ivaCalc;
    this.formEmitir.total = +(sub + ivaCalc).toFixed(2);
  }

  onArchivoSeleccionado(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.archivoSeleccionado = event.target.files[0];
    }
  }

  guardarFacturaEmitida(): void {
    if (!this.formEmitir.terceroId) {
      alert('Por favor selecciona un cliente');
      return;
    }
    if (!this.formEmitir.total || this.formEmitir.total <= 0) {
      alert('Por favor ingresa un importe válido para la factura');
      return;
    }

    this.guardandoComprobante.set(true);

    const formData = new FormData();
    formData.append('terceroId', this.formEmitir.terceroId);
    formData.append('direccion', 'EMITIDA');
    formData.append('tipoComprobante', this.formEmitir.tipoComprobante);
    formData.append('fechaEmision', this.formEmitir.fechaEmision);
    formData.append('moneda', this.formEmitir.moneda);
    formData.append('subtotal', String(this.formEmitir.subtotal || this.formEmitir.total));
    formData.append('iva', String(this.formEmitir.iva));
    formData.append('total', String(this.formEmitir.total));

    if (this.formEmitir.trabajoId) {
      formData.append('trabajoId', this.formEmitir.trabajoId);
    }
    if (this.formEmitir.observaciones) {
      formData.append('observaciones', this.formEmitir.observaciones);
    }
    if (this.archivoSeleccionado) {
      formData.append('archivo', this.archivoSeleccionado);
    }

    this.api.createComprobante(formData).subscribe({
      next: () => {
        this.guardandoComprobante.set(false);
        this.mostrarModalEmitir.set(false);
        alert('Factura emitida registrada con éxito.');
        this.cargarComprobantes();
      },
      error: (e) => {
        this.guardandoComprobante.set(false);
        alert('Error al registrar factura: ' + (e.error?.error || e.message));
      },
    });
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
