import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AgroApiService } from '../../services/agro-api.service';
import { SaldoCereal, MovimientoCereal, Tercero, Cultivo } from '../../models/agro.models';

@Component({
  selector: 'app-acopio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado de Página -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Acopio y Cuenta Corriente de Granos</h1>
          <p class="text-sm text-slate-500">Control de stock de granos por productor, ingresos de cosecha y liquidaciones con facturación integrada.</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="abrirModalMovimiento()"
            class="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span>⚖️</span> Movimiento de Stock
          </button>
          <button
            (click)="abrirModalLiquidar()"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <span>💰</span> Liquidar / Vender Cereal
          </button>
        </div>
      </div>

      <!-- Estado de Carga -->
      @if (cargando()) {
        <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div class="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-2 text-xs font-semibold text-slate-500">Cargando saldos y movimientos de cereal...</p>
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

      @if (!cargando() && !errorMensaje()) {
        <!-- Tarjetas de Saldos Netos por Productor y Grano -->
        <div>
          <h2 class="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span>🌾</span> Stock de Granos Disponibles en Silo / Acopio
          </h2>

          @if (saldos().length === 0) {
            <div class="p-6 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
              <span class="text-3xl">🌾</span>
              <p class="text-sm font-semibold text-slate-700 mt-2">No hay stock de cereal en acopio actualmente</p>
              <p class="text-xs text-slate-400 mt-1">Los ingresos se registran automáticamente con las cosechas o mediante un movimiento manual de stock.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              @for (s of saldos(); track s.terceroId + '-' + s.cultivoId) {
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        🌾 {{ s.cultivoNombre }}
                      </span>
                      <span class="text-xs font-semibold text-slate-400">Stock Disponible</span>
                    </div>
                    <h3 class="text-base font-bold text-slate-800 mt-3">{{ s.terceroNombre }}</h3>
                    <div class="mt-2 flex items-baseline gap-2">
                      <span class="text-3xl font-black text-slate-900">{{ parseNumero(s.saldoKg) | number:'1.0-0' }}</span>
                      <span class="text-xs font-bold text-slate-500">kg</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5 font-mono">
                      ({{ (parseNumero(s.saldoKg) / 1000) | number:'1.1-2' }} Toneladas métricas)
                    </p>
                  </div>

                  <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">Cuenta Corriente</span>
                    <button
                      (click)="iniciarLiquidacionDirecta(s)"
                      class="text-xs font-bold text-amber-600 hover:text-amber-800 hover:underline"
                    >
                      Liquidar este lote &rarr;
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Historial de Movimientos de Cereal -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Historial de Movimientos</h2>
              <p class="text-xs text-slate-500">Ingresos de cosecha, mermas, retiros y ventas liquidadas</p>
            </div>
            <span class="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {{ movimientos().length }} movimientos
            </span>
          </div>

          @if (movimientos().length === 0) {
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <span class="text-3xl">📋</span>
              <p class="mt-2 text-sm font-semibold text-slate-700">No hay movimientos registrados</p>
              <p class="text-xs text-slate-400 mt-1">Registra un movimiento de stock o una cosecha para comenzar.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                    <th class="pb-3">Fecha</th>
                    <th class="pb-3">Productor / Dueño</th>
                    <th class="pb-3">Cultivo</th>
                    <th class="pb-3">Tipo de Operación</th>
                    <th class="pb-3 text-right">Cantidad (kg)</th>
                    <th class="pb-3">Observaciones / Factura</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (m of movimientos(); track m.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 text-xs font-medium text-slate-500 whitespace-nowrap">
                        {{ m.fecha | date:'dd/MM/yyyy' }}
                      </td>
                      <td class="py-3 font-semibold text-slate-800">
                        {{ m.tercero?.nombre || 'Tercero #' + m.terceroId }}
                      </td>
                      <td class="py-3">
                        <span class="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {{ m.cultivo?.nombre || 'Grano #' + m.cultivoId }}
                        </span>
                      </td>
                      <td class="py-3">
                        <span
                          [class]="
                            m.tipo === 'INGRESO_COSECHA'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.tipo === 'VENTA_LIQUIDACION'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          "
                          class="px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap"
                        >
                          {{ m.tipo === 'INGRESO_COSECHA' ? '📥 Ingreso Cosecha' : m.tipo === 'VENTA_LIQUIDACION' ? '💰 Venta / Liquidación' : m.tipo }}
                        </span>
                      </td>
                      <td
                        class="py-3 text-right font-mono font-bold whitespace-nowrap"
                        [class]="parseNumero(m.cantidadKg) < 0 ? 'text-rose-600' : 'text-emerald-700'"
                      >
                        {{ parseNumero(m.cantidadKg) > 0 ? '+' : '' }}{{ parseNumero(m.cantidadKg) | number:'1.0-0' }} kg
                      </td>
                      <td class="py-3 text-xs text-slate-500">
                        {{ m.observaciones || '-' }}
                        @if (m.comprobanteId) {
                          <span class="ml-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-200 inline-block">
                            Factura #{{ m.comprobanteId }}
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Modal "Liquidar / Vender Cereal (Todo en Uno)" -->
      @if (mostrarModalLiquidar()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-lg font-bold text-slate-900">Venta de Cereal & Liquidación</h3>
                <p class="text-xs text-slate-500">Descuenta kilos del acopio, genera factura y adjunta el comprobante PDF.</p>
              </div>
              <button (click)="mostrarModalLiquidar.set(false)" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form (ngSubmit)="ejecutarLiquidacion()" class="mt-4 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Dueño / Productor</label>
                  <select
                    [(ngModel)]="liquidacionForm.terceroId"
                    name="terceroId"
                    required
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option [value]="''">Selecciona un productor...</option>
                    @for (t of terceros(); track t.id) {
                      <option [value]="t.id">{{ t.nombre }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Cereal a Vender</label>
                  <select
                    [(ngModel)]="liquidacionForm.cultivoId"
                    name="cultivoId"
                    required
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option [value]="''">Selecciona grano...</option>
                    @for (c of cultivos(); track c.id) {
                      <option [value]="c.id">{{ c.nombre }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Kilos a Liquidar</label>
                  <input
                    type="number"
                    [(ngModel)]="liquidacionForm.kilosAVender"
                    name="kilosAVender"
                    required
                    placeholder="Ej. 20000"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Precio por Kilo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="liquidacionForm.precioPorKilo"
                    name="precioPorKilo"
                    required
                    placeholder="Ej. 320.0"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <!-- Cálculo de Total Estimado -->
              @if (liquidacionForm.kilosAVender && liquidacionForm.precioPorKilo) {
                <div class="p-3 bg-amber-50 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
                  <span class="text-amber-900 font-semibold">Total Facturación Estimada:</span>
                  <span class="text-base font-black text-amber-900 font-mono">
                    \${{ (liquidacionForm.kilosAVender * liquidacionForm.precioPorKilo) | number:'1.0-2' }}
                  </span>
                </div>
              }

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha de la Operación</label>
                <input
                  type="date"
                  [(ngModel)]="liquidacionForm.fecha"
                  name="fecha"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                />
              </div>

              <!-- Subida de Archivo Adjunto (Factura PDF) -->
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  📄 Factura / Comprobante Adjunto (Opcional)
                </label>
                <input
                  type="file"
                  (change)="onArchivoSeleccionado($event)"
                  accept=".pdf,image/*"
                  class="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-agro-50 file:text-agro-700 hover:file:bg-agro-100"
                />
                <span class="text-[11px] text-slate-400 mt-1 block">
                  Si aún no tienes la factura, déjalo vacío y podrás subirla después desde Comprobantes.
                </span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Observaciones</label>
                <input
                  type="text"
                  [(ngModel)]="liquidacionForm.observaciones"
                  name="observaciones"
                  placeholder="Ej. Liquidación autorizada por Don Juan"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div class="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  (click)="mostrarModalLiquidar.set(false)"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Confirmar Liquidación
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal "Movimiento de Stock" (Sin Dinero) -->
      @if (mostrarModalMovimiento()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-900">Registrar Movimiento de Silo</h3>
              <button (click)="mostrarModalMovimiento.set(false)" class="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form (ngSubmit)="guardarMovimientoStock()" class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Productor / Dueño</label>
                <select [(ngModel)]="movimientoForm.terceroId" name="terceroId" required class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs">
                  <option [value]="''">Selecciona productor...</option>
                  @for (t of terceros(); track t.id) {
                    <option [value]="t.id">{{ t.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Cultivo</label>
                <select [(ngModel)]="movimientoForm.cultivoId" name="cultivoId" required class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs">
                  <option [value]="''">Selecciona grano...</option>
                  @for (c of cultivos(); track c.id) {
                    <option [value]="c.id">{{ c.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Tipo de Operación</label>
                <select [(ngModel)]="movimientoForm.tipo" name="tipo" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs">
                  <option value="INGRESO_COSECHA">Ingreso por Cosecha (+)</option>
                  <option value="RETIRO_GRANO">Retiro de Grano / Camión (-)</option>
                  <option value="AJUSTE">Ajuste de Balanza / Merma</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Kilos</label>
                <input
                  type="number"
                  [(ngModel)]="movimientoForm.cantidadKg"
                  name="cantidadKg"
                  required
                  placeholder="Ej. 50000 (positivo o negativo para ajuste)"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Observaciones</label>
                <input
                  type="text"
                  [(ngModel)]="movimientoForm.observaciones"
                  name="observaciones"
                  placeholder="Ej. Ingreso a silo 2"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div class="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  (click)="mostrarModalMovimiento.set(false)"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class AcopioComponent implements OnInit {
  private api = inject(AgroApiService);

  saldos = signal<SaldoCereal[]>([]);
  movimientos = signal<MovimientoCereal[]>([]);
  terceros = signal<Tercero[]>([]);
  cultivos = signal<Cultivo[]>([]);

  cargando = signal<boolean>(true);
  errorMensaje = signal<string>('');

  mostrarModalLiquidar = signal<boolean>(false);
  mostrarModalMovimiento = signal<boolean>(false);

  archivoSeleccionado: File | null = null;

  liquidacionForm: any = {
    terceroId: '',
    cultivoId: '',
    kilosAVender: null,
    precioPorKilo: null,
    fecha: new Date().toISOString().substring(0, 10),
    observaciones: '',
  };

  movimientoForm: any = {
    terceroId: '',
    cultivoId: '',
    tipo: 'INGRESO_COSECHA',
    cantidadKg: null,
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
      saldos: this.api.getSaldosAcopio(),
      movimientos: this.api.getMovimientosAcopio(),
      terceros: this.api.getTerceros(),
      cultivos: this.api.getCultivos(),
    }).subscribe({
      next: (res) => {
        this.saldos.set(res.saldos || []);
        this.movimientos.set(res.movimientos || []);
        this.terceros.set(res.terceros || []);
        this.cultivos.set(res.cultivos || []);
        this.cargando.set(false);
      },
      error: (e) => {
        console.error('Error cargando acopio:', e);
        this.errorMensaje.set('No se pudo conectar con el backend de acopio (puerto 3000)');
        this.cargando.set(false);
      },
    });
  }

  abrirModalLiquidar(): void {
    this.archivoSeleccionado = null;
    this.liquidacionForm = {
      terceroId: '',
      cultivoId: '',
      kilosAVender: null,
      precioPorKilo: null,
      fecha: new Date().toISOString().substring(0, 10),
      observaciones: '',
    };
    this.mostrarModalLiquidar.set(true);
  }

  iniciarLiquidacionDirecta(saldo: SaldoCereal): void {
    this.archivoSeleccionado = null;
    this.liquidacionForm = {
      terceroId: saldo.terceroId,
      cultivoId: saldo.cultivoId,
      kilosAVender: saldo.saldoKg,
      precioPorKilo: null,
      fecha: new Date().toISOString().substring(0, 10),
      observaciones: `Liquidación de ${saldo.cultivoNombre}`,
    };
    this.mostrarModalLiquidar.set(true);
  }

  onArchivoSeleccionado(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.archivoSeleccionado = event.target.files[0];
    }
  }

  ejecutarLiquidacion(): void {
    const formData = new FormData();
    formData.append('terceroId', this.liquidacionForm.terceroId);
    formData.append('cultivoId', this.liquidacionForm.cultivoId);
    formData.append('kilosAVender', String(this.liquidacionForm.kilosAVender));
    formData.append('precioPorKilo', String(this.liquidacionForm.precioPorKilo));
    formData.append('fecha', this.liquidacionForm.fecha);
    formData.append('crearComprobante', 'true');
    if (this.liquidacionForm.observaciones) {
      formData.append('observaciones', this.liquidacionForm.observaciones);
    }
    if (this.archivoSeleccionado) {
      formData.append('archivo', this.archivoSeleccionado);
    }

    this.api.liquidarCereal(formData).subscribe({
      next: () => {
        alert('Liquidación registrada con éxito. Se descontó el stock y se generó el comprobante.');
        this.mostrarModalLiquidar.set(false);
        this.cargarDatos();
      },
      error: (e) => alert('Error en liquidación: ' + (e.error?.error || e.message)),
    });
  }

  abrirModalMovimiento(): void {
    this.movimientoForm = {
      terceroId: '',
      cultivoId: '',
      tipo: 'INGRESO_COSECHA',
      cantidadKg: null,
      observaciones: '',
    };
    this.mostrarModalMovimiento.set(true);
  }

  guardarMovimientoStock(): void {
    this.api.registrarMovimientoAcopio(this.movimientoForm).subscribe({
      next: () => {
        this.mostrarModalMovimiento.set(false);
        this.cargarDatos();
      },
      error: (e) => alert('Error al registrar movimiento: ' + (e.error?.error || e.message)),
    });
  }
}
