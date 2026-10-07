import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import {
  DeudaProyeccionRegistro,
  FiltrosAvanzados,
  formatearMonto,
  nombreCampo,
  nombreComponente,
  opcionesDeCampo,
} from '../../models/reporte-preliminar.model';

/** Fila lista para pintar en la tabla agrupada (grupo con subtotales u hoja de detalle). */
interface FilaAgrupada {
  id: string;
  tipo: 'grupo' | 'hoja';
  nivel: number;
  label: string;
  registros: number;
  amortizacion: number;
  interes: number;
  comision: number;
  total: number;
  tieneHijos: boolean;
  expandido: boolean;
}

interface GrupoNodo {
  id: string;
  label: string;
  registros: number;
  amortizacion: number;
  interes: number;
  comision: number;
  total: number;
  hijos: GrupoNodo[];
  hojas: { label: string; amortizacion: number; interes: number; comision: number; total: number }[];
}

const suma = (registros: readonly DeudaProyeccionRegistro[], campo: 'amortizacion' | 'interes' | 'comision'): number =>
  registros.reduce((acc, r) => acc + r[campo], 0);

const valorLabel = (campo: string, valor: string): string => opcionesDeCampo(campo).find((o) => o.value === valor)?.label ?? valor;

/**
 * Tabla agrupada del «Reporte preliminar del gobierno» (Pantalla 5). Compone con piezas del kit (`siaf-icon` y los
 * tokens del design system) una tabla de filas colapsables alineadas por columnas: cada grupo (Año › Tipo de deuda ›
 * Acreedor…) muestra sus subtotales y, al expandirlo, sus hojas (componentes). Con el tipo de resultado «Agregado» solo
 * se ven los subtotales de cada grupo, sin el detalle.
 *
 * No hay en el catálogo una tabla agrupada con subtotales, así que esta vista es una composición propia de la pantalla
 * (no un componente reutilizable del `/ui-kit`), como acordamos para reproducir la imagen sin inventar componentes.
 */
@Component({
  selector: 'siaf-reporte-preliminar-tabla-agrupada',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="siaf-table-scroll overflow-x-auto rounded-siaf-sm border border-[var(--sys-color-divider-default)]" role="region" tabindex="0" aria-label="Reporte agrupado">
      <div class="min-w-[760px]">
        <!-- Cabecera -->
        <div class="grid grid-cols-[minmax(0,1fr)_140px_140px_140px_140px] items-center border-b border-[var(--sys-color-divider-default)] bg-[var(--sys-color-bg-surfaces-surface-high)]">
          <div class="px-siaf-md py-siaf-sm text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Componente</div>
          <div class="px-siaf-md py-siaf-sm text-right text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Amortización</div>
          <div class="px-siaf-md py-siaf-sm text-right text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Interés</div>
          <div class="px-siaf-md py-siaf-sm text-right text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Comisión</div>
          <div class="px-siaf-md py-siaf-sm text-right text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Total</div>
        </div>

        <!-- Filas -->
        @for (fila of filasVisibles(); track fila.id) {
          <div
            class="grid grid-cols-[minmax(0,1fr)_140px_140px_140px_140px] items-center border-b border-[var(--sys-color-divider-default)] text-sm"
            [class.bg-surface]="fila.tipo === 'grupo'"
            [class.font-semibold]="fila.tipo === 'grupo'"
            [style.color]="fila.tipo === 'grupo' ? 'var(--sys-color-text-neutral-high)' : 'var(--sys-color-text-neutral-medium)'"
          >
            <div class="flex min-w-0 items-center gap-siaf-xs py-siaf-sm pr-siaf-md" [style.paddingLeft.px]="12 + fila.nivel * 20">
              @if (fila.tieneHijos) {
                <button
                  class="inline-flex size-6 shrink-0 items-center justify-center rounded-siaf-sm text-[var(--sys-color-text-neutral-activated)] transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  type="button"
                  [attr.aria-expanded]="fila.expandido"
                  [attr.aria-label]="(fila.expandido ? 'Contraer ' : 'Expandir ') + fila.label"
                  (click)="alternar(fila.id)"
                >
                  <siaf-icon [name]="fila.expandido ? 'expand_more' : 'chevron_right'" [size]="20" />
                </button>
              } @else {
                <span class="inline-block size-6 shrink-0"></span>
              }
              <span class="truncate">{{ fila.label }}</span>
              @if (fila.tipo === 'grupo') {
                <span class="shrink-0 text-xs font-normal text-text-muted">({{ fila.registros }} {{ fila.registros === 1 ? 'registro' : 'registros' }})</span>
              }
            </div>
            <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(fila.amortizacion) }}</div>
            <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(fila.interes) }}</div>
            <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(fila.comision) }}</div>
            <div class="px-siaf-md py-siaf-sm text-right tabular-nums font-semibold">{{ formato(fila.total) }}</div>
          </div>
        }

        <!-- Total general -->
        <div class="grid grid-cols-[minmax(0,1fr)_140px_140px_140px_140px] items-center bg-[var(--sys-color-bg-surfaces-surface-high)] text-sm font-bold text-[var(--sys-color-text-neutral-high)]">
          <div class="px-siaf-md py-siaf-sm">Total general</div>
          <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(totales().amortizacion) }}</div>
          <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(totales().interes) }}</div>
          <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(totales().comision) }}</div>
          <div class="px-siaf-md py-siaf-sm text-right tabular-nums">{{ formato(totales().total) }}</div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportePreliminarTablaAgrupadaComponent {
  private readonly _rows = signal<DeudaProyeccionRegistro[]>([]);
  private readonly _niveles = signal<string[]>([]);
  private readonly _tipoResultado = signal<FiltrosAvanzados['tipoResultado']>('agrupado');
  private readonly colapsados = signal<Set<string>>(new Set());

  @Input({ required: true }) set rows(valor: DeudaProyeccionRegistro[]) {
    this._rows.set(valor ?? []);
  }
  @Input() set niveles(valor: string[]) {
    this._niveles.set(valor ?? []);
  }
  @Input() set tipoResultado(valor: FiltrosAvanzados['tipoResultado']) {
    this._tipoResultado.set(valor);
  }

  readonly formato = formatearMonto;

  readonly totales = computed(() => {
    const filas = this._rows();
    const amortizacion = suma(filas, 'amortizacion');
    const interes = suma(filas, 'interes');
    const comision = suma(filas, 'comision');
    return { amortizacion, interes, comision, total: amortizacion + interes + comision };
  });

  private readonly arbol = computed<GrupoNodo[]>(() => this.construir(this._rows(), this._niveles(), ''));

  readonly filasVisibles = computed<FilaAgrupada[]>(() => {
    const filas: FilaAgrupada[] = [];
    const detalle = this._tipoResultado() === 'agrupado';
    const colapsados = this.colapsados();

    const recorrer = (grupos: GrupoNodo[], nivel: number): void => {
      for (const grupo of grupos) {
        const tieneHijos = detalle && (grupo.hijos.length > 0 || grupo.hojas.length > 0);
        const expandido = tieneHijos && !colapsados.has(grupo.id);
        filas.push({
          id: grupo.id,
          tipo: 'grupo',
          nivel,
          label: grupo.label,
          registros: grupo.registros,
          amortizacion: grupo.amortizacion,
          interes: grupo.interes,
          comision: grupo.comision,
          total: grupo.total,
          tieneHijos,
          expandido,
        });

        if (!expandido) continue;

        if (grupo.hijos.length) {
          recorrer(grupo.hijos, nivel + 1);
        } else {
          for (const hoja of grupo.hojas) {
            filas.push({
              id: `${grupo.id}/${hoja.label}`,
              tipo: 'hoja',
              nivel: nivel + 1,
              label: hoja.label,
              registros: 0,
              amortizacion: hoja.amortizacion,
              interes: hoja.interes,
              comision: hoja.comision,
              total: hoja.total,
              tieneHijos: false,
              expandido: false,
            });
          }
        }
      }
    };

    recorrer(this.arbol(), 0);
    return filas;
  });

  alternar(id: string): void {
    this.colapsados.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  private construir(registros: DeudaProyeccionRegistro[], niveles: string[], prefijo: string): GrupoNodo[] {
    if (!niveles.length) {
      // Sin más niveles: las hojas son los componentes (agregados).
      return [];
    }

    const [campo, ...resto] = niveles;
    const porValor = new Map<string, DeudaProyeccionRegistro[]>();
    for (const registro of registros) {
      const clave = String(registro[campo as keyof DeudaProyeccionRegistro]);
      const lista = porValor.get(clave) ?? [];
      lista.push(registro);
      porValor.set(clave, lista);
    }

    const grupos: GrupoNodo[] = [];
    for (const [valor, sub] of porValor) {
      const id = `${prefijo}${campo}=${valor}`;
      const amortizacion = suma(sub, 'amortizacion');
      const interes = suma(sub, 'interes');
      const comision = suma(sub, 'comision');
      grupos.push({
        id,
        label: `${nombreCampo(campo)}: ${valorLabel(campo, valor)}`,
        registros: sub.length,
        amortizacion,
        interes,
        comision,
        total: amortizacion + interes + comision,
        hijos: resto.length ? this.construir(sub, resto, `${id}/`) : [],
        hojas: resto.length ? [] : this.hojasPorComponente(sub),
      });
    }

    grupos.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return grupos;
  }

  /** Hojas del grupo más interno: un renglón por componente, con sus importes sumados. */
  private hojasPorComponente(registros: DeudaProyeccionRegistro[]): GrupoNodo['hojas'] {
    const porComponente = new Map<string, DeudaProyeccionRegistro[]>();
    for (const registro of registros) {
      const lista = porComponente.get(registro.componente) ?? [];
      lista.push(registro);
      porComponente.set(registro.componente, lista);
    }

    return [...porComponente.entries()]
      .map(([componente, sub]) => {
        const amortizacion = suma(sub, 'amortizacion');
        const interes = suma(sub, 'interes');
        const comision = suma(sub, 'comision');
        return { label: nombreComponente(componente), amortizacion, interes, comision, total: amortizacion + interes + comision };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
}
