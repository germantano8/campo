import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LotesComponent } from './pages/lotes/lotes.component';
import { AcopioComponent } from './pages/acopio/acopio.component';
import { TrabajosComponent } from './pages/trabajos/trabajos.component';
import { ComprobantesComponent } from './pages/comprobantes/comprobantes.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'lotes', component: LotesComponent },
  { path: 'acopio', component: AcopioComponent },
  { path: 'trabajos', component: TrabajosComponent },
  { path: 'comprobantes', component: ComprobantesComponent },
  { path: '**', redirectTo: 'dashboard' },
];

