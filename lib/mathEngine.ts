export interface PricingInputs {
  superficieVendible: number;
  costoDuroM2: number;
  canjeTierraPct: number;
  canjeHonorariosPct: number;
  tasaIIBB: number;
  tasaTEM: number;
  comisionVenta: number;
  margenObjetivo: number;
  tipoCambio: number;
}

export function calcularPrecioSugerido(inputs: PricingInputs) {
  // 1. Metros Libres Reales
  const metrosLibres = inputs.superficieVendible * (1 - (inputs.canjeTierraPct + inputs.canjeHonorariosPct));
  
  // 2. Costo Directo Total
  const costoDirectoTotal = inputs.superficieVendible * inputs.costoDuroM2;
  
  // 3. Grossing-up Impositivo (Asegura el margen sobre ingresos brutos)
  const factorRetencion = 1 - ((inputs.tasaIIBB + inputs.tasaTEM) * ((1 - inputs.canjeTierraPct - inputs.canjeHonorariosPct) * (1 + inputs.margenObjetivo) / (1 - inputs.canjeTierraPct - inputs.canjeHonorariosPct)));
  
  const subtotalAntesComision = costoDirectoTotal / factorRetencion;
  
  // 4. Costo Integral Total
  const gastosComerciales = (subtotalAntesComision / (1 - inputs.margenObjetivo)) * inputs.comisionVenta;
  const costoIntegralTotal = subtotalAntesComision + gastosComerciales;
  
  // 5. Precios Finales
  const costoRealPorMetroLibre = costoIntegralTotal / Math.max(metrosLibres, 1);
  const precioSugeridoUSD = costoRealPorMetroLibre / (1 - inputs.margenObjetivo);
  const precioSugeridoARS = precioSugeridoUSD * inputs.tipoCambio;

  return {
    metrosLibres,
    costoIntegralTotal,
    precioSugeridoUSD,
    precioSugeridoARS
  };
}
