import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { DeudaProyeccionRegistro } from '../models/reporte-preliminar.model';

/**
 * Endpoint del «Reporte preliminar del gobierno». En el taller lo responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real sería la misma URL.
 */
@Injectable({ providedIn: 'root' })
export class ReportePreliminarApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  /** Proyecciones de deuda del reporte (dataset completo; la pantalla filtra y agrupa). */
  listar(): Observable<DeudaProyeccionRegistro[]> {
    return this.http.get<DeudaProyeccionRegistro[]>(`${this.base}/reporte-preliminar-gobierno`);
  }
}
