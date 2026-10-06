import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AgroApiService } from '../../services/agro-api.service';
import { Lote, SaldoCereal, Trabajo } from '../../models/agro.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- Banner de Bienvenida -->
      <div class="bg-gradient-to-r from-agro-800 to-agro-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-700/60 border border-agro-500/30 text-agro-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Campaña Activa 2026
          </div>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">Panel de Control Agrícola</h1>
          <p class="mt-2 text-agro-100 text-sm sm:text-base leading-relaxed">
            Monitoreo en tiempo real de parcelas propias y arrendadas, balance de cereal en acopio, trazabilidad agronómica y facturación contable.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a routerLink="/acopio" class="inline-flex items-center gap-2 px-4 py-2 bg-agro-500 hover:bg-agro-600 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg">
              🌾 Liquidar Cereal
            </a>
            <a routerLink="/trabajos" class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-sm font-medium transition-all backdrop-blur-sm">
              🚜 Registrar Labor
            </a>
            <a routerLink="/lotes" class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-sm font-medium transition-all backdrop-blur-sm">
              📍 Administrar Lotes
            </a>
          </div>
        </div>
        <div class="absolute -right-8 -bottom-10 opacity-10 text-white select-none pointer-events-none text-9xl">
          🌾
        </div>
      </div>

      <!-- Tarjetas de Métricas Clave -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <!-- Hectáreas Operadas -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Superficie Total</span>
            <div class="w-10 h-10 rounded-xl bg-agro-100 text-agro-700 flex items-center justify-center text-lg font-bold">
              🗺️
            </div>
          </div>
          <div class="mt-4">
            <div class="text-3xl font-extrabold text-slate-800">{{ totalHectareas() | number:'1.1-2' }} <span class="text-sm font-medium text-slate-500">ha</span></div>
            <p class="mt-1 text-xs text-slate-500 flex items-center gap-1">
              Distribuido en <strong class="text-slate-700">{{ lotes().length }}</strong> parcelas/lotes
            </p>
          </div>
        </div>

        <!-- Cereal Acopiado -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Cereal en Silo/Acopio</span>
            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
              🌾
            </div>
          </div>
          <div class="mt-4">
            <div class="text-3xl font-extrabold text-slate-800">{{ (totalKgAcopio() / 1000) | number:'1.1-2' }} <span class="text-sm font-medium text-slate-500">Tn</span></div>
            <p class="mt-1 text-xs text-slate-500 flex items-center gap-1">
              ({{ totalKgAcopio() | number:'1.0-0' }} kg en stock neto)
            </p>
          </div>
        </div>

        <!-- Labores Registradas -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Labores Registradas</span>
            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
              🚜
            </div>
          </div>
          <div class="mt-4">
            <div class="text-3xl font-extrabold text-slate-800">{{ trabajos().length }}</div>
            <p class="mt-1 text-xs text-slate-500 flex items-center gap-1">
              Siembras, aplicaciones y cosechas
            </p>
          </div>
        </div>
      </div>

      <!-- Sección de Estado de Acopio y Lotes Destacados -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Saldos de Acopio por Tercero -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Saldos de Cereal en Acopio</h2>
              <p class="text-xs text-slate-500">Stock neto disponible por productor y grano</p>
            </div>
            <a routerLink="/acopio" class="text-xs font-semibold text-agro-700 hover:text-agro-800 hover:underline">
              Ver movimientos &rarr;
            </a>
          </div>

          @if (saldos().length === 0) {
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p class="text-slate-400 text-sm">No hay saldos de cereal registrados.</p>
              <a routerLink="/acopio" class="mt-2 inline-block text-xs font-semibold text-agro-600 hover:underline">Registrar primer movimiento</a>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                    <th class="pb-3">Productor / Dueño</th>
                    <th class="pb-3">Cultivo</th>
                    <th class="pb-3 text-right">Saldo en Kilos</th>
                    <th class="pb-3 text-right">Toneladas</th>
                    <th class="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (item of saldos(); track item.terceroId + '-' + item.cultivoId) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 font-semibold text-slate-800 flex items-center gap-2">
                        <span class="w-7 h-7 rounded-lg bg-agro-100 text-agro-800 flex items-center justify-center text-xs font-bold">
                          {{ item.terceroNombre.charAt(0) }}
                        </span>
                        {{ item.terceroNombre }}
                      </td>
                      <td class="py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                          {{ item.cultivoNombre }}
                        </span>
                      </td>
                      <td class="py-3 text-right font-mono font-bold text-slate-800">
                        {{ item.saldoKg | number:'1.0-0' }} kg
                      </td>
                      <td class="py-3 text-right font-mono text-slate-600">
                        {{ (item.saldoKg / 1000) | number:'1.1-2' }} Tn
                      </td>
                      <td class="py-3 text-right">
                        <a routerLink="/acopio" class="text-xs font-medium text-agro-600 hover:text-agro-800 hover:underline">
                          Liquidar
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Distribución de Lotes por Régimen -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-lg font-bold text-slate-800">Régimen de Tenencia</h2>
                <p class="text-xs text-slate-500">Distribución de hectáreas por tipo</p>
              </div>
              <a routerLink="/lotes" class="text-xs font-semibold text-agro-700 hover:text-agro-800 hover:underline">
                Ver lotes &rarr;
              </a>
            </div>

            <div class="space-y-4">
              <!-- Propios -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div class="flex justify-between text-xs font-medium mb-1">
                  <span class="text-emerald-700 font-bold flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Propios
                  </span>
                  <span class="text-slate-700 font-bold">{{ hectareasPropias() | number:'1.1-1' }} ha</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-emerald-500 h-2 rounded-full" [style.width.%]="porcentajePropias()"></div>
                </div>
              </div>

              <!-- Alquilados -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div class="flex justify-between text-xs font-medium mb-1">
                  <span class="text-blue-700 font-bold flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Arrendados / Alquilados
                  </span>
                  <span class="text-slate-700 font-bold">{{ hectareasAlquiladas() | number:'1.1-1' }} ha</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-blue-500 h-2 rounded-full" [style.width.%]="porcentajeAlquiladas()"></div>
                </div>
              </div>

              <!-- Terceros -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div class="flex justify-between text-xs font-medium mb-1">
                  <span class="text-amber-700 font-bold flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Servicio a Terceros
                  </span>
                  <span class="text-slate-700 font-bold">{{ hectareasTerceros() | number:'1.1-1' }} ha</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-amber-500 h-2 rounded-full" [style.width.%]="porcentajeTerceros()"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Soporta arriendo a % o quintales</span>
            <span class="font-bold text-agro-700">100% Trazable</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(AgroApiService);

  lotes = signal<Lote[]>([]);
  saldos = signal<SaldoCereal[]>([]);
  trabajos = signal<Trabajo[]>([]);

  totalHectareas = computed(() => {
    return this.lotes().reduce((acc, l) => acc + Number(l.hectareas || 0), 0);
  });

  hectareasPropias = computed(() => {
    return this.lotes()
      .filter(l => l.regimen === 'PROPIO')
      .reduce((acc, l) => acc + Number(l.hectareas || 0), 0);
  });

  hectareasAlquiladas = computed(() => {
    return this.lotes()
      .filter(l => l.regimen === 'ALQUILADO')
      .reduce((acc, l) => acc + Number(l.hectareas || 0), 0);
  });

  hectareasTerceros = computed(() => {
    return this.lotes()
      .filter(l => l.regimen === 'SERVICIO_TERCERO')
      .reduce((acc, l) => acc + Number(l.hectareas || 0), 0);
  });

  porcentajePropias = computed(() => {
    const total = this.totalHectareas();
    return total > 0 ? (this.hectareasPropias() / total) * 100 : 0;
  });

  porcentajeAlquiladas = computed(() => {
    const total = this.totalHectareas();
    return total > 0 ? (this.hectareasAlquiladas() / total) * 100 : 0;
  });

  porcentajeTerceros = computed(() => {
    const total = this.totalHectareas();
    return total > 0 ? (this.hectareasTerceros() / total) * 100 : 0;
  });

  totalKgAcopio = computed(() => {
    return this.saldos().reduce((acc, s) => acc + Number(s.saldoKg || 0), 0);
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.api.getLotes().subscribe({
      next: (data) => this.lotes.set(data),
      error: (e) => console.error('Error cargando lotes:', e),
    });

    this.api.getSaldosAcopio().subscribe({
      next: (data) => this.saldos.set(data),
      error: (e) => console.error('Error cargando saldos:', e),
    });

    this.api.getTrabajos().subscribe({
      next: (data) => this.trabajos.set(data),
      error: (e) => console.error('Error cargando trabajos:', e),
    });
  }
}

