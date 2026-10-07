import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ParametroAplicado, ParametrosAplicadosComponent } from '../../../../../shared/components/parametros-aplicados/parametros-aplicados.component';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../../shared/components/page-shell/page-shell.component';
import type { QueryReportExportFormat } from '../../../../../shared/types/query-report.types';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../../shared/ui/empty-state/empty-state.component';
import { IconDropdownMenuComponent, IconDropdownMenuItem } from '../../../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component';
import { ReportTableColumn, ReportTableComponent, ReportTableRow } from '../../../../../shared/ui/report-table/report-table.component';
import { TableSkeletonComponent } from '../../../../../shared/ui/table-skeleton/table-skeleton.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { ReportePreliminarApiService } from '../../api/reporte-preliminar-api.service';
import { CONSULTAS_PROCESS_ID, PROCESS_ROUTE } from '../../config/reporte-preliminar.rutas';
import {
  ACREEDOR_OPTIONS,
  COMPONENTES,
  DeudaProyeccionRegistro,
  FiltrosAvanzados,
  ReporteParametros,
  TIPOS_DEUDA,
  formatearMonto,
  nombreAcreedor,
  nombreComponente,
  nombreMoneda,
  nombreTipoDeuda,
} from '../../models/reporte-preliminar.model';
import { exportarReportePreliminar } from '../../utils/reporte-preliminar-export.util';
import { ReportePreliminarFiltrosPanelComponent } from './reporte-preliminar-filtros-panel.component';
import { ReportePreliminarParametrosPanelComponent } from './reporte-preliminar-parametros-panel.component';
import { ReportePreliminarTablaAgrupadaComponent } from './reporte-preliminar-tabla-agrupada.component';

/** Parámetros con los que se abre el panel la primera vez (rango completo y todos los criterios), como en la imagen. */
const PARAMETROS_INICIALES: ReporteParametros = {
  anioDesde: '2027',
  anioHasta: '2031',
  tipoDeuda: TIPOS_DEUDA.map((o) => o.value),
  acreedor: ACREEDOR_OPTIONS.map((o) => o.value),
  componente: COMPONENTES.slice(0, 3).map((o) => o.value),
  moneda: 'soles',
};

const COLUMNAS: ReportTableColumn[] = [
  { key: 'tipoDeuda', label: 'Tipo de deuda', width: 150 },
  { key: 'acreedor', label: 'Acreedor', width: 260 },
  { key: 'componente', label: 'Componentes', width: 230 },
  { key: 'moneda', label: 'Moneda', width: 110 },
  { key: 'anio', label: 'Año', width: 90 },
  { key: 'amortizacion', label: 'Amortización', width: 160, align: 'right' },
  { key: 'interes', label: 'Interés', width: 150, align: 'right' },
  { key: 'comision', label: 'Comisión', width: 150, align: 'right' },
  { key: 'total', label: 'Total', width: 170, align: 'right', fixed: true },
];

const norm = (t: string): string => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * «Reporte preliminar del gobierno» (Programación presupuestal de deuda › Consultas). Flujo de consulta y reporte armado
 * a medida con piezas del kit: estado vacío, panel de parámetros, «Parámetros aplicados», tabla lineal de resultados y,
 * desde «Filtros avanzados», la vista agrupada (Año › Tipo de deuda › Acreedor…) con subtotales.
 */
@Component({
  selector: 'siaf-reporte-preliminar-consultas',
  standalone: true,
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    FormTableSearchComponent,
    IconDropdownMenuComponent,
    PageHeaderComponent,
    PageShellComponent,
    ParametrosAplicadosComponent,
    ReportTableComponent,
    ReportePreliminarFiltrosPanelComponent,
    ReportePreliminarParametrosPanelComponent,
    ReportePreliminarTablaAgrupadaComponent,
    TableSkeletonComponent,
  ],
  template: `
    <siaf-page-shell [breadcrumbs]="breadcrumbs">
      <siaf-page-header pageHeader title="Reporte preliminar del gobierno">
        <div actions class="flex flex-wrap items-center justify-end gap-siaf-sm">
          <siaf-button variant="outline" icon="bookmark_border" [disabled]="!parametros()">Favoritos</siaf-button>
          <siaf-button variant="filled" icon="manage_search" (click)="abrirParametros()">Parámetros</siaf-button>
        </div>
      </siaf-page-header>

      @if (!parametros()) {
        <section class="flex min-h-[320px] flex-1 flex-col justify-center rounded-siaf-md bg-surface px-siaf-lg py-siaf-xl" data-consulta-vacia>
          <siaf-empty-state
            illustration="no-records"
            title="Aún no se encontraron resultados"
            description="Ingrese los parámetros de consulta para visualizar la información disponible."
          />
        </section>
      } @else {
        <div class="flex min-h-0 flex-1 flex-col gap-siaf-sm overflow-y-auto">
          <section class="shrink-0 rounded-siaf-md bg-surface p-siaf-md" data-parametros>
            <siaf-parametros-aplicados [parametros]="parametrosAplicados()" (cardSelected)="editarParametro($event)" />
          </section>

          <section class="flex shrink-0 flex-col rounded-siaf-md bg-surface" data-resultado>
            <header class="flex min-h-14 flex-wrap items-center gap-siaf-md px-siaf-lg pt-siaf-md">
              <h2 class="m-0 min-w-0 flex-1 text-base font-bold uppercase leading-normal tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">Resultado de reporte</h2>
              <siaf-icon-dropdown-menu
                label="Exportar"
                icon="open_in_new"
                density="standard"
                [items]="opcionesExportacion"
                [menuWidth]="200"
                [disabled]="cargando() || !registrosVisibles().length"
                (selected)="exportar($event)"
              />
            </header>

            <div class="flex flex-col gap-siaf-lg px-siaf-lg pb-siaf-md pt-siaf-md">
              <siaf-form-table-search
                variant="reports"
                [value]="busqueda()"
                ariaLabel="Buscar en el resultado"
                (valueChange)="busqueda.set($event)"
                (filter)="panelFiltros.set(true)"
              />

              @if (cargando()) {
                <siaf-table-skeleton [columns]="columnas.length" [rows]="6" ariaLabel="Cargando el resultado del reporte" />
              } @else if (filtros(); as f) {
                <siaf-reporte-preliminar-tabla-agrupada
                  [rows]="registrosVisibles()"
                  [niveles]="f.niveles"
                  [tipoResultado]="f.tipoResultado"
                />
              } @else {
                <siaf-report-table
                  [columns]="columnas"
                  [rows]="filasLineales()"
                  rowKey="id"
                  ariaLabel="Resultado del reporte preliminar del gobierno"
                />
              }
            </div>
          </section>
        </div>
      }
    </siaf-page-shell>

    <siaf-reporte-preliminar-parametros-panel
      [open]="panelParametros()"
      [values]="valoresPanel()"
      [focusField]="focusField()"
      [requireChange]="parametros() !== null"
      (closed)="panelParametros.set(false)"
      (applied)="consultar($event)"
    />

    <siaf-reporte-preliminar-filtros-panel
      [open]="panelFiltros()"
      [values]="filtros()"
      (closed)="panelFiltros.set(false)"
      (applied)="aplicarFiltros($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportePreliminarConsultasComponent {
  private readonly api = inject(ReportePreliminarApiService);

  readonly breadcrumbs = buildProcessBreadcrumbs(CONSULTAS_PROCESS_ID, PROCESS_ROUTE);
  readonly columnas = COLUMNAS;
  readonly opcionesExportacion: IconDropdownMenuItem[] = [
    { label: 'Excel', value: 'excel', icon: 'table_view' },
    { label: 'CSV', value: 'csv', icon: 'table_chart' },
    { label: 'PDF', value: 'pdf', icon: 'picture_as_pdf' },
  ];

  readonly parametros = signal<ReporteParametros | null>(null);
  readonly valoresPanel = signal<ReporteParametros>(PARAMETROS_INICIALES);
  readonly filtros = signal<FiltrosAvanzados | null>(null);
  readonly panelParametros = signal(false);
  readonly panelFiltros = signal(false);
  /** Campo del panel a enfocar al abrirlo desde una tarjeta de «Parámetros aplicados». */
  readonly focusField = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly busqueda = signal('');

  private readonly dataset = signal<DeudaProyeccionRegistro[]>([]);

  /** Registros que cumplen los parámetros de consulta y las condiciones de «Filtros avanzados». */
  readonly registrosConsultados = computed<DeudaProyeccionRegistro[]>(() => {
    const p = this.parametros();
    if (!p) return [];
    const desde = Number(p.anioDesde);
    const hasta = Number(p.anioHasta);
    const condiciones = this.filtros()?.condiciones ?? [];

    return this.dataset().filter((r) => {
      if (r.anio < desde || r.anio > hasta) return false;
      if (p.tipoDeuda.length && !p.tipoDeuda.includes(r.tipoDeuda)) return false;
      if (p.acreedor.length && !p.acreedor.includes(r.acreedor)) return false;
      if (p.componente.length && !p.componente.includes(r.componente)) return false;
      if (r.moneda !== p.moneda) return false;
      return condiciones.every((c) => String(r[c.campo as keyof DeudaProyeccionRegistro]) === c.valor);
    });
  });

  /** Aplica además el buscador de texto sobre las etiquetas visibles. */
  readonly registrosVisibles = computed<DeudaProyeccionRegistro[]>(() => {
    const termino = norm(this.busqueda().trim());
    const registros = this.registrosConsultados();
    if (!termino) return registros;
    return registros.filter((r) =>
      [nombreTipoDeuda(r.tipoDeuda), nombreAcreedor(r.acreedor), nombreComponente(r.componente), nombreMoneda(r.moneda), String(r.anio)]
        .some((valor) => norm(valor).includes(termino)),
    );
  });

  readonly filasLineales = computed<ReportTableRow[]>(() =>
    this.registrosVisibles().map((r, i) => ({
      id: `${r.anio}-${r.acreedor}-${r.componente}-${r.moneda}-${i}`,
      tipoDeuda: nombreTipoDeuda(r.tipoDeuda),
      acreedor: nombreAcreedor(r.acreedor),
      componente: nombreComponente(r.componente),
      moneda: nombreMoneda(r.moneda),
      anio: String(r.anio),
      amortizacion: formatearMonto(r.amortizacion),
      interes: formatearMonto(r.interes),
      comision: formatearMonto(r.comision),
      total: formatearMonto(r.amortizacion + r.interes + r.comision),
    })),
  );

  readonly parametrosAplicados = computed<ParametroAplicado[]>(() => {
    const p = this.parametros();
    if (!p) return [];
    // Para un multi-select: el valor resume («3 Seleccionados») y `detalle` lleva las etiquetas para el globo en hover.
    const multi = (sel: string[], nombre: (v: string) => string): Pick<ParametroAplicado, 'value' | 'detalle'> => ({
      value: sel.length ? `${sel.length} Seleccionados` : 'Todos',
      detalle: sel.map(nombre),
    });
    return [
      { label: 'Año desde - Año hasta', key: 'anioDesde', value: `${p.anioDesde} - ${p.anioHasta}`, icon: 'date_range' },
      { label: 'Tipo de deuda', key: 'tipoDeuda', ...multi(p.tipoDeuda, nombreTipoDeuda), icon: 'category' },
      { label: 'Acreedor', key: 'acreedor', ...multi(p.acreedor, nombreAcreedor), icon: 'account_balance' },
      { label: 'Componente', key: 'componente', ...multi(p.componente, nombreComponente), icon: 'widgets' },
      { label: 'Moneda', key: 'moneda', value: nombreMoneda(p.moneda), icon: 'payments' },
    ];
  });

  /** «Parámetros» de la cabecera: abre el panel sin forzar el foco en un campo. */
  abrirParametros(): void {
    this.focusField.set(null);
    this.panelParametros.set(true);
  }

  /** Clic en una tarjeta de «Parámetros aplicados»: abre el panel con ese campo enfocado y su lista abierta. */
  editarParametro(key: string): void {
    this.focusField.set(key);
    this.panelParametros.set(true);
  }

  consultar(parametros: ReporteParametros): void {
    this.parametros.set(parametros);
    this.valoresPanel.set(parametros);
    this.filtros.set(null);
    this.busqueda.set('');
    this.panelParametros.set(false);
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (registros) => {
        this.dataset.set(registros);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  aplicarFiltros(filtros: FiltrosAvanzados): void {
    // Sin niveles no hay agrupación posible: se vuelve a la tabla lineal.
    this.filtros.set(filtros.niveles.length ? filtros : { ...filtros, niveles: [] });
    if (!filtros.niveles.length) this.filtros.set(null);
    this.panelFiltros.set(false);
  }

  exportar(formato: string): void {
    const format = ['excel', 'csv', 'pdf'].includes(formato) ? (formato as QueryReportExportFormat) : null;
    if (!format) return;
    void exportarReportePreliminar(format, this.columnas, this.filasLineales());
  }
}
