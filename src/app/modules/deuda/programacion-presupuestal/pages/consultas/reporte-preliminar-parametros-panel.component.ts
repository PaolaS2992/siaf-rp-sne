import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { FocoDirective } from '../../../../../shared/ui/foco/foco.directive';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { RadioComponent } from '../../../../../shared/ui/radio/radio.component';
import { SidePanelAnimacion } from '../../../../../shared/ui/side-panel-animacion';
import { TextFieldComponent } from '../../../../../shared/ui/text-field/text-field.component';
import {
  ACREEDOR_OPTIONS,
  ANIO_OPTIONS,
  COMPONENTES,
  MONEDAS,
  ReporteParametros,
  TIPOS_DEUDA,
} from '../../models/reporte-preliminar.model';

/**
 * Panel lateral «Parámetros de consulta» del Reporte preliminar del gobierno: rango de años, tipo de deuda, acreedor y
 * componente (selección múltiple con «Seleccionar todo») y la moneda con un grupo de radios. «Aplicar consulta» se
 * habilita con el rango de años y la moneda y, al editar una consulta ya aplicada (`requireChange`), solo si cambió
 * algún valor. Trabaja sobre un borrador: cerrar sin aplicar no cambia la
 * consulta y al reabrir muestra los últimos valores. Composición a medida con piezas del kit (`siaf-input`,
 * `siaf-radio-group`, `siaf-button`), como el panel `siaf-query-parameters-panel` del catálogo.
 */
@Component({
  selector: 'siaf-reporte-preliminar-parametros-panel',
  standalone: true,
  imports: [ButtonComponent, FocoDirective, IconComponent, RadioComponent, TextFieldComponent],
  template: `
    @if (anim.visible()) {
      <section
        class="siaf-sidepanel-overlay fixed inset-y-0 left-0 right-0 z-50 bg-black/55 pl-0 lg:pl-[65px]"
        [class.cerrando]="anim.cerrando()"
        aria-modal="true"
        role="dialog"
        [attr.aria-labelledby]="idTitulo"
        (click)="cerrar()"
      >
        <aside
          class="absolute bottom-0 right-0 top-0 flex w-full max-w-[420px] flex-col overflow-hidden border-l border-[var(--sys-color-divider-default)] bg-surface shadow-siaf-elevation-8"
          [siafFoco]="open"
          (siafFocoEscape)="cerrar()"
          (click)="$event.stopPropagation()"
        >
          <header class="flex h-14 shrink-0 items-center gap-siaf-xs px-siaf-md">
            <h2 class="m-0 flex-1 text-base font-bold uppercase leading-normal tracking-[0.02px] text-text" [id]="idTitulo">Parámetros de consulta</h2>
            <button
              class="inline-flex size-10 items-center justify-center rounded-siaf-md text-text transition hover:bg-surface-muted active:bg-[var(--sys-color-bg-states-light-pressed)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
              type="button"
              aria-label="Cerrar Parámetros de consulta"
              (click)="cerrar()"
            >
              <siaf-icon name="close" [size]="24" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-siaf-md pb-siaf-md pt-siaf-sm">
            <div class="flex flex-col gap-siaf-lg">
              <siaf-input
                type="select"
                label="Año desde"
                data-field="anioDesde"
                [required]="true"
                [autoSuccess]="false"
                [options]="anioOptions"
                [value]="borrador().anioDesde"
                (valueChange)="cambiar('anioDesde', $event)"
              />
              <siaf-input
                type="select"
                label="Año hasta"
                data-field="anioHasta"
                [required]="true"
                [autoSuccess]="false"
                [options]="anioOptions"
                [value]="borrador().anioHasta"
                (valueChange)="cambiar('anioHasta', $event)"
              />
              <siaf-input
                type="select-multiple"
                label="Tipo de deuda"
                data-field="tipoDeuda"
                selectAllLabel="Todos"
                [autoSuccess]="false"
                [options]="tiposDeuda"
                [value]="borrador().tipoDeuda"
                (valueChange)="cambiar('tipoDeuda', $event)"
              />
              <siaf-input
                type="select-multiple"
                label="Acreedor"
                data-field="acreedor"
                selectAllLabel="Todos"
                [autoSuccess]="false"
                [options]="acreedores"
                [value]="borrador().acreedor"
                (valueChange)="cambiar('acreedor', $event)"
              />
              <siaf-input
                type="select-multiple"
                label="Componente"
                data-field="componente"
                selectAllLabel="Todos"
                [autoSuccess]="false"
                [options]="componentes"
                [value]="borrador().componente"
                (valueChange)="cambiar('componente', $event)"
              />
              <siaf-radio-group
                name="reporte-moneda"
                label="Moneda"
                data-field="moneda"
                [required]="true"
                [inline]="true"
                [options]="monedas"
                [value]="borrador().moneda"
                (valueChange)="cambiar('moneda', $event)"
              />
            </div>
          </div>

          <footer class="flex shrink-0 items-center justify-end gap-siaf-xs px-siaf-md py-siaf-sm">
            <siaf-button variant="outline" (click)="limpiar()">Limpiar todo</siaf-button>
            <siaf-button variant="filled" [disabled]="!puedeAplicar()" (click)="aplicar()">Aplicar consulta</siaf-button>
          </footer>
        </aside>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportePreliminarParametrosPanelComponent implements OnChanges {
  @Input() open = false;
  /** Valores con los que arranca el borrador cada vez que se abre. */
  @Input() values: ReporteParametros | null = null;
  /** Campo a enfocar (y, si es un select, abrir su lista) al abrir el panel. Null = no fuerza foco. */
  @Input() focusField: string | null = null;
  /** Cuando es true, «Aplicar consulta» queda deshabilitado hasta que cambie algún valor (edición de una consulta). */
  @Input() requireChange = false;

  @Output() closed = new EventEmitter<void>();
  @Output() applied = new EventEmitter<ReporteParametros>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly anim = new SidePanelAnimacion();
  readonly idTitulo = 'siaf-reporte-parametros-titulo';

  readonly anioOptions = ANIO_OPTIONS;
  readonly tiposDeuda = TIPOS_DEUDA;
  readonly acreedores = ACREEDOR_OPTIONS;
  readonly componentes = COMPONENTES;
  readonly monedas = MONEDAS;

  private readonly vacio: ReporteParametros = { anioDesde: '', anioHasta: '', tipoDeuda: [], acreedor: [], componente: [], moneda: '' };
  readonly borrador = signal<ReporteParametros>(this.vacio);
  /** Foto de los valores con que se abrió el panel, para detectar si cambió algo. */
  private readonly original = signal<ReporteParametros>(this.vacio);

  readonly completo = computed(() => {
    const b = this.borrador();
    return !!b.anioDesde && !!b.anioHasta && !!b.moneda;
  });

  /** ¿El borrador difiere de los valores con que se abrió el panel? */
  readonly cambiado = computed(() => !this.iguales(this.borrador(), this.original()));

  /**
   * «Aplicar consulta» se habilita con los obligatorios y, si se exige, con al menos un cambio. Es un método (no un
   * `computed`) porque depende de `requireChange`, que es un `@Input` plano: así se reevalúa en cada ciclo de detección.
   */
  puedeAplicar(): boolean {
    return this.completo() && (!this.requireChange || this.cambiado());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      if (this.open) {
        const base = { ...(this.values ?? this.vacio) };
        this.borrador.set(base);
        this.original.set(base);
        this.enfocarCampo();
      }
      this.anim.actualizar(this.open);
    }
  }

  /** Al abrir desde una tarjeta de «Parámetros aplicados»: enfoca el campo y, si es un select, abre su lista. */
  private enfocarCampo(): void {
    const key = this.focusField;
    if (!key) return;
    // Espera a que el panel esté pintado y el foco inicial (la X) ya se haya aplicado.
    setTimeout(() => {
      const campo = this.host.nativeElement.querySelector<HTMLElement>(`[data-field="${key}"]`);
      if (!campo) return;
      const select = campo.querySelector<HTMLElement>('button[aria-haspopup="listbox"]');
      if (select) {
        select.focus();
        if (select.getAttribute('aria-expanded') !== 'true') select.click();
        return;
      }
      const radio = campo.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? campo.querySelector<HTMLInputElement>('input[type="radio"]');
      radio?.focus();
    }, 180);
  }

  cambiar(clave: keyof ReporteParametros, valor: string | number | string[]): void {
    this.borrador.update((actual) => ({
      ...actual,
      [clave]: Array.isArray(valor) ? valor : String(valor),
    }));
  }

  limpiar(): void {
    this.borrador.set({ ...this.vacio });
  }

  aplicar(): void {
    if (!this.puedeAplicar()) return;
    this.applied.emit({ ...this.borrador() });
  }

  private iguales(a: ReporteParametros, b: ReporteParametros): boolean {
    const lista = (x: string[]): string => [...x].sort().join('|');
    return (
      a.anioDesde === b.anioDesde &&
      a.anioHasta === b.anioHasta &&
      a.moneda === b.moneda &&
      lista(a.tipoDeuda) === lista(b.tipoDeuda) &&
      lista(a.acreedor) === lista(b.acreedor) &&
      lista(a.componente) === lista(b.componente)
    );
  }

  cerrar(): void {
    this.closed.emit();
  }
}
