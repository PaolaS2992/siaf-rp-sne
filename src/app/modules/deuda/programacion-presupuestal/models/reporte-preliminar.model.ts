import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';

/**
 * Modelo del «Reporte preliminar del gobierno» (Programación presupuestal de deuda › Consultas). Datos simulados del
 * taller: cada registro es una proyección de deuda para un año, tipo de deuda, acreedor, componente y moneda, con sus
 * importes de amortización, interés y comisión. No hay backend real: los responde `src/app/mock/`.
 */
export interface DeudaProyeccionRegistro {
  anio: number;
  /** Código del tipo de deuda (`externa` | `interna`). */
  tipoDeuda: string;
  /** Código del acreedor. */
  acreedor: string;
  /** Código del componente. */
  componente: string;
  /** Código de la moneda (`soles` | `dolares`). */
  moneda: string;
  amortizacion: number;
  interes: number;
  comision: number;
}

/** Parámetros con los que se consulta el reporte (panel «Parámetros de consulta»). */
export interface ReporteParametros {
  anioDesde: string;
  anioHasta: string;
  /** Tipos de deuda seleccionados; vacío = todos. */
  tipoDeuda: string[];
  /** Acreedores seleccionados; vacío = todos. */
  acreedor: string[];
  /** Componentes seleccionados; vacío = todos. */
  componente: string[];
  moneda: string;
}

/** Una condición del panel «Filtros avanzados»: el campo vale exactamente ese valor. */
export interface CondicionFiltro {
  campo: string;
  valor: string;
}

/** Refinamiento del resultado (panel «Filtros avanzados»): condiciones y tipo de resultado con sus niveles. */
export interface FiltrosAvanzados {
  /** `agrupado` muestra los grupos con su detalle; `agregado`, solo los subtotales de cada grupo. */
  tipoResultado: 'agrupado' | 'agregado';
  /** Campos de agrupación, en orden (del más externo al más interno). */
  niveles: string[];
  condiciones: CondicionFiltro[];
}

/** Años disponibles para el rango «Año desde» / «Año hasta». */
export const ANIOS: readonly number[] = [2027, 2028, 2029, 2030, 2031];

export const ANIO_OPTIONS: TextFieldOption[] = ANIOS.map((a) => ({ label: String(a), value: String(a) }));

export const TIPOS_DEUDA: TextFieldOption[] = [
  { label: 'Deuda externa', value: 'externa' },
  { label: 'Deuda interna', value: 'interna' },
];

/** Acreedores por tipo de deuda: 5 externos y 3 internos (8 en total, como en «Acreedor: 8 Seleccionados»). */
export const ACREEDORES: readonly { value: string; label: string; tipoDeuda: string }[] = [
  { value: 'bid', label: 'Banco Interamericano de Desarrollo', tipoDeuda: 'externa' },
  { value: 'birf', label: 'Banco Internacional de Reconstrucción y Fomento', tipoDeuda: 'externa' },
  { value: 'caf', label: 'Corporación Andina de Fomento', tipoDeuda: 'externa' },
  { value: 'jica', label: 'Agencia de Cooperación Internacional del Japón (JICA)', tipoDeuda: 'externa' },
  { value: 'kfw', label: 'Banco de Desarrollo KfW', tipoDeuda: 'externa' },
  { value: 'bonos-soberanos', label: 'Bonos Soberanos', tipoDeuda: 'interna' },
  { value: 'bonos-globales', label: 'Bonos Globales', tipoDeuda: 'interna' },
  { value: 'banco-nacion', label: 'Banco de la Nación', tipoDeuda: 'interna' },
];

export const ACREEDOR_OPTIONS: TextFieldOption[] = ACREEDORES.map((a) => ({ label: a.label, value: a.value }));

export const COMPONENTES: TextFieldOption[] = [
  { label: 'Deuda pasiva', value: 'deuda-pasiva' },
  { label: 'OAD', value: 'oad' },
  { label: 'Incremento de intereses - OAD', value: 'incremento-intereses-oad' },
  { label: 'Activa - saldo por desembolsar', value: 'activa-saldo-desembolsar' },
  { label: 'Activa - hipotético', value: 'activa-hipotetico' },
];

export const MONEDAS: TextFieldOption[] = [
  { label: 'Soles', value: 'soles' },
  { label: 'Dólares', value: 'dolares' },
];

/** Campos por los que se puede agrupar o condicionar el resultado (panel «Filtros avanzados»). */
export const CAMPOS_REPORTE: TextFieldOption[] = [
  { label: 'Año', value: 'anio' },
  { label: 'Tipo de deuda', value: 'tipoDeuda' },
  { label: 'Acreedor', value: 'acreedor' },
  { label: 'Componente', value: 'componente' },
  { label: 'Moneda', value: 'moneda' },
];

/** Opciones de «Valor» de una condición, según el campo elegido. */
export function opcionesDeCampo(campo: string): TextFieldOption[] {
  switch (campo) {
    case 'anio':
      return ANIO_OPTIONS;
    case 'tipoDeuda':
      return TIPOS_DEUDA;
    case 'acreedor':
      return ACREEDOR_OPTIONS;
    case 'componente':
      return COMPONENTES;
    case 'moneda':
      return MONEDAS;
    default:
      return [];
  }
}

const buscarLabel = (opciones: readonly TextFieldOption[], value: string): string =>
  opciones.find((o) => o.value === value)?.label ?? value;

export const nombreCampo = (value: string): string => buscarLabel(CAMPOS_REPORTE, value);
export const nombreTipoDeuda = (value: string): string => buscarLabel(TIPOS_DEUDA, value);
export const nombreAcreedor = (value: string): string => buscarLabel(ACREEDOR_OPTIONS, value);
export const nombreComponente = (value: string): string => buscarLabel(COMPONENTES, value);
export const nombreMoneda = (value: string): string => buscarLabel(MONEDAS, value);

/** Formato de importe del reporte: miles con punto y decimales con coma (649.920.983,27). */
export const formatearMonto = (valor: number): string =>
  valor.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
