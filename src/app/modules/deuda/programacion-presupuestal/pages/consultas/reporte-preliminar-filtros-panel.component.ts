import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { FocoDirective } from '../../../../../shared/ui/foco/foco.directive';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { RadioComponent } from '../../../../../shared/ui/radio/radio.component';
import { SidePanelAnimacion } from '../../../../../shared/ui/side-panel-animacion';
import { TextFieldComponent, TextFieldOption } from '../../../../../shared/ui/text-field/text-field.component';
import { CAMPOS_REPORTE, CondicionFiltro, FiltrosAvanzados, opcionesDeCampo } from '../../models/reporte-preliminar.model';

const TIPO_RESULTADO_OPTIONS: TextFieldOption[] = [
  { label: 'Agrupado', value: 'agrupado' },
  { label: 'Agregado', value: 'agregado' },
];

/**
 * Panel lateral «Filtros avanzados» del Reporte preliminar del gobierno: condiciones para refinar el resultado y el
 * tipo de resultado (Agrupado o Agregado) con sus niveles de agrupación, que se agregan y quitan. Composición a medida
 * con piezas del kit (`siaf-input`, `siaf-radio-group`, `siaf-button`, `siaf-icon`). El asa de arrastre es indicativa:
 * el orden se cambia quitando y volviendo a agregar los campos.
 */
@Component({
  selector: 'siaf-reporte-preliminar-filtros-panel',
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
            <h2 class="m-0 flex-1 text-base font-bold uppercase leading-normal tracking-[0.02px] text-text" [id]="idTitulo">Filtros avanzados</h2>
            <button
              class="inline-flex size-10 items-center justify-center rounded-siaf-md text-text transition hover:bg-surface-muted active:bg-[var(--sys-color-bg-states-light-pressed)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
              type="button"
              aria-label="Cerrar Filtros avanzados"
              (click)="cerrar()"
            >
              <siaf-icon name="close" [size]="24" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-siaf-md pb-siaf-md pt-siaf-sm">
            <!-- Condiciones -->
            <section class="flex flex-col gap-siaf-md">
              <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-medium)]">Condiciones</h3>

              @if (!condiciones().length) {
                <p class="m-0 rounded-siaf-sm bg-surface-muted px-siaf-md py-siaf-sm text-sm text-text-muted">
                  Agrega una o más condiciones para refinar los resultados.
                </p>
              } @else {
                @for (condicion of condiciones(); track $index; let i = $index) {
                  <div class="flex items-start gap-siaf-sm">
                    <div class="grid min-w-0 flex-1 grid-cols-1 gap-siaf-xs sm:grid-cols-2">
                      <siaf-input
                        type="select"
                        label="Campo"
                        [autoSuccess]="false"
                        [options]="campos"
                        [value]="condicion.campo"
                        (valueChange)="cambiarCondicionCampo(i, $event)"
                      />
                      <siaf-input
                        type="select"
                        label="Valor"
                        [autoSuccess]="false"
                        [options]="opcionesDeCampo(condicion.campo)"
                        [value]="condicion.valor"
                        (valueChange)="cambiarCondicionValor(i, $event)"
                      />
                    </div>
                    <button
                      class="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-siaf-md text-text-muted transition hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      type="button"
                      aria-label="Quitar condición"
                      (click)="quitarCondicion(i)"
                    >
                      <siaf-icon name="delete_outline" [size]="20" />
                    </button>
                  </div>
                }
              }

              <div>
                <siaf-button variant="text" size="sm" icon="add" (click)="agregarCondicion()">Agregar condición</siaf-button>
              </div>
            </section>

            <hr class="my-siaf-lg border-t border-[var(--sys-color-divider-default)]" />

            <!-- Tipo de resultado -->
            <section class="flex flex-col gap-siaf-md">
              <h3 class="m-0 text-sm font-bold uppercase tracking-[0.02px] text-[var(--sys-color-text-neutral-medium)]">Tipo de resultado</h3>

              <siaf-radio-group
                name="reporte-tipo-resultado"
                [inline]="true"
                [options]="tipoResultadoOptions"
                [value]="tipoResultado()"
                (valueChange)="tipoResultado.set($any($event))"
              />

              @for (nivel of niveles(); track $index; let i = $index) {
                <div
                  class="flex items-center gap-siaf-sm rounded-siaf-sm border-t-2 border-transparent transition"
                  [class.opacity-40]="arrastrando() === i"
                  [style.borderTopColor]="dragOverIndex() === i && arrastrando() !== null && arrastrando() !== i ? 'var(--sys-color-border-states-focus)' : 'transparent'"
                  [attr.draggable]="arrastreListo() === i ? 'true' : null"
                  (dragstart)="onDragStart(i, $event)"
                  (dragover)="onDragOver(i, $event)"
                  (dragleave)="onDragLeave(i)"
                  (drop)="onDrop(i, $event)"
                  (dragend)="onDragEnd()"
                >
                  <button
                    class="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-siaf-md text-text-muted transition hover:bg-surface-muted hover:text-text active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    type="button"
                    [attr.data-handle]="i"
                    aria-label="Reordenar campo de agrupación: arrástrelo, o use las flechas arriba y abajo"
                    (mousedown)="prepararArrastre(i)"
                    (mouseup)="cancelarPreparacion()"
                    (keydown)="onHandleKeydown(i, $event)"
                  >
                    <siaf-icon name="drag_indicator" [size]="20" />
                  </button>
                  <div class="min-w-0 flex-1">
                    <siaf-input
                      type="select"
                      label="Campo"
                      [autoSuccess]="false"
                      [options]="campos"
                      [value]="nivel"
                      (valueChange)="cambiarNivel(i, $event)"
                    />
                  </div>
                  <button
                    class="inline-flex size-8 shrink-0 items-center justify-center rounded-siaf-md text-text-muted transition hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    type="button"
                    aria-label="Quitar campo de agrupación"
                    (click)="quitarNivel(i)"
                  >
                    <siaf-icon name="delete_outline" [size]="20" />
                  </button>
                </div>
              }

              <div>
                <siaf-button variant="text" size="sm" icon="add" [disabled]="niveles().length >= campos.length" (click)="agregarNivel()">
                  Agregar campo
                </siaf-button>
              </div>
            </section>
          </div>

          <footer class="flex shrink-0 items-center justify-end gap-siaf-xs px-siaf-md py-siaf-sm">
            <siaf-button variant="outline" (click)="limpiar()">Limpiar todo</siaf-button>
            <siaf-button variant="filled" (click)="aplicar()">Aplicar consulta</siaf-button>
          </footer>
        </aside>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportePreliminarFiltrosPanelComponent implements OnChanges {
  @Input() open = false;
  /** Filtros con los que arranca el borrador cada vez que se abre. */
  @Input() values: FiltrosAvanzados | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() applied = new EventEmitter<FiltrosAvanzados>();

  readonly anim = new SidePanelAnimacion();
  readonly idTitulo = 'siaf-reporte-filtros-titulo';

  readonly campos = CAMPOS_REPORTE;
  readonly tipoResultadoOptions = TIPO_RESULTADO_OPTIONS;
  readonly opcionesDeCampo = opcionesDeCampo;

  private readonly defecto: FiltrosAvanzados = { tipoResultado: 'agrupado', niveles: ['anio', 'tipoDeuda', 'acreedor'], condiciones: [] };

  readonly tipoResultado = signal<'agrupado' | 'agregado'>('agrupado');
  readonly niveles = signal<string[]>([]);
  readonly condiciones = signal<CondicionFiltro[]>([]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Índice cuyo asa se está presionando: solo desde el asa arranca el arrastre (no desde el input). */
  readonly arrastreListo = signal<number | null>(null);
  /** Índice de la fila que se está arrastrando. */
  readonly arrastrando = signal<number | null>(null);
  /** Índice de la fila sobre la que se soltaría, para pintar la guía de destino. */
  readonly dragOverIndex = signal<number | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      if (this.open) {
        const base = this.values ?? this.defecto;
        this.tipoResultado.set(base.tipoResultado);
        this.niveles.set([...base.niveles]);
        this.condiciones.set(base.condiciones.map((c) => ({ ...c })));
      }
      this.anim.actualizar(this.open);
    }
  }

  agregarCondicion(): void {
    this.condiciones.update((actual) => [...actual, { campo: '', valor: '' }]);
  }

  cambiarCondicionCampo(indice: number, valor: string | number | string[]): void {
    this.condiciones.update((actual) => actual.map((c, i) => (i === indice ? { campo: String(valor), valor: '' } : c)));
  }

  cambiarCondicionValor(indice: number, valor: string | number | string[]): void {
    this.condiciones.update((actual) => actual.map((c, i) => (i === indice ? { ...c, valor: String(valor) } : c)));
  }

  quitarCondicion(indice: number): void {
    this.condiciones.update((actual) => actual.filter((_, i) => i !== indice));
  }

  agregarNivel(): void {
    const usados = new Set(this.niveles());
    const libre = this.campos.find((c) => !usados.has(c.value));
    if (libre) this.niveles.update((actual) => [...actual, libre.value]);
  }

  cambiarNivel(indice: number, valor: string | number | string[]): void {
    this.niveles.update((actual) => actual.map((n, i) => (i === indice ? String(valor) : n)));
  }

  quitarNivel(indice: number): void {
    this.niveles.update((actual) => actual.filter((_, i) => i !== indice));
  }

  /** Mueve un nivel de una posición a otra; ese orden es el que se usa para agrupar. */
  private moverNivel(desde: number, hacia: number): void {
    this.niveles.update((actual) => {
      const copia = [...actual];
      const [item] = copia.splice(desde, 1);
      copia.splice(hacia, 0, item);
      return copia;
    });
  }

  // ── Arrastrar y soltar (nativo): solo se inicia desde el asa ──
  prepararArrastre(indice: number): void {
    this.arrastreListo.set(indice);
  }

  cancelarPreparacion(): void {
    if (this.arrastrando() === null) this.arrastreListo.set(null);
  }

  onDragStart(indice: number, evento: DragEvent): void {
    // Sin presionar el asa, el arrastre no procede (así el select sigue usable).
    if (this.arrastreListo() !== indice) {
      evento.preventDefault();
      return;
    }
    this.arrastrando.set(indice);
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
      evento.dataTransfer.setData('text/plain', String(indice));
    }
  }

  onDragOver(indice: number, evento: DragEvent): void {
    if (this.arrastrando() === null) return;
    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move';
    this.dragOverIndex.set(indice);
  }

  onDragLeave(indice: number): void {
    if (this.dragOverIndex() === indice) this.dragOverIndex.set(null);
  }

  onDrop(indice: number, evento: DragEvent): void {
    evento.preventDefault();
    const desde = this.arrastrando();
    if (desde !== null && desde !== indice) this.moverNivel(desde, indice);
    this.onDragEnd();
  }

  onDragEnd(): void {
    this.arrastrando.set(null);
    this.arrastreListo.set(null);
    this.dragOverIndex.set(null);
  }

  /** Alternativa accesible al arrastre: flechas arriba/abajo mueven el campo enfocado. */
  onHandleKeydown(indice: number, evento: KeyboardEvent): void {
    if (evento.key === 'ArrowUp' && indice > 0) {
      evento.preventDefault();
      this.moverNivel(indice, indice - 1);
      this.enfocarAsa(indice - 1);
    } else if (evento.key === 'ArrowDown' && indice < this.niveles().length - 1) {
      evento.preventDefault();
      this.moverNivel(indice, indice + 1);
      this.enfocarAsa(indice + 1);
    }
  }

  private enfocarAsa(indice: number): void {
    // Tras reordenar, el foco sigue al asa en su nueva posición.
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-handle="${indice}"]`)?.focus());
  }

  limpiar(): void {
    this.tipoResultado.set('agrupado');
    this.niveles.set([]);
    this.condiciones.set([]);
  }

  aplicar(): void {
    this.applied.emit({
      tipoResultado: this.tipoResultado(),
      niveles: this.niveles().filter((n) => !!n),
      condiciones: this.condiciones().filter((c) => c.campo && c.valor),
    });
  }

  cerrar(): void {
    this.closed.emit();
  }
}
