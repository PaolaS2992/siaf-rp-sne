import { ACREEDORES, ANIOS, COMPONENTES, DeudaProyeccionRegistro, MONEDAS } from './reporte-preliminar.model';

/**
 * Genera un valor pseudoaleatorio pero determinista a partir de una semilla de texto, para que el dataset del taller
 * sea siempre el mismo (sin backend) y los subtotales cuadren en cada recarga.
 */
function valorDeterminista(semilla: string, minimo: number, maximo: number): number {
  let hash = 2166136261;
  for (let i = 0; i < semilla.length; i++) {
    hash ^= semilla.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const fraccion = ((hash >>> 0) % 100000) / 100000;
  return minimo + fraccion * (maximo - minimo);
}

/** Dos decimales, como los importes reales del reporte. */
const dosDecimales = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Dataset simulado del «Reporte preliminar del gobierno»: una fila por cada combinación de año, acreedor (con su tipo de
 * deuda), componente y moneda. Los importes son ficticios pero estables. Al no ser datos que el usuario edite, no se
 * guardan en `localStorage`: el backend simulado los devuelve generados.
 */
export function generarReportePreliminar(): DeudaProyeccionRegistro[] {
  const registros: DeudaProyeccionRegistro[] = [];

  for (const anio of ANIOS) {
    for (const acreedor of ACREEDORES) {
      for (const componente of COMPONENTES) {
        for (const moneda of MONEDAS) {
          const semilla = `${anio}-${acreedor.value}-${componente.value}-${moneda.value}`;
          // El componente «Activa - hipotético» proyecta valores altos; el resto, montos moderados.
          const escala = componente.value === 'activa-hipotetico' ? 1 : componente.value.startsWith('activa') ? 0.6 : 0.35;
          const factorMoneda = moneda.value === 'dolares' ? 0.27 : 1;

          registros.push({
            anio,
            tipoDeuda: acreedor.tipoDeuda,
            acreedor: acreedor.value,
            componente: componente.value,
            moneda: moneda.value,
            amortizacion: dosDecimales(valorDeterminista(`${semilla}-amo`, 50_000_000, 800_000_000) * escala * factorMoneda),
            interes: dosDecimales(valorDeterminista(`${semilla}-int`, 5_000_000, 120_000_000) * escala * factorMoneda),
            comision: dosDecimales(valorDeterminista(`${semilla}-com`, 100_000, 4_500_000) * escala * factorMoneda),
          });
        }
      }
    }
  }

  return registros;
}
