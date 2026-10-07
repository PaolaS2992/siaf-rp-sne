import { Routes } from '@angular/router';

/** Módulo de deuda del taller. Por ahora, solo la consulta «Reporte preliminar del gobierno». */
export const DEUDA_ROUTES: Routes = [
  {
    path: 'procesos/programacion-presupuestal-deuda/reporte-preliminar-gobierno',
    loadComponent: () =>
      import('./programacion-presupuestal/pages/consultas/reporte-preliminar-consultas.component').then(
        (m) => m.ReportePreliminarConsultasComponent,
      ),
  },
];
