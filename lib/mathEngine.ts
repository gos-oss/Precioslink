export interface PricingInputs {
  superficieVendible: number;
  costoDuroM2: number;
  canjeTierraPct: number;      // ej: 0.13 (13%)
  canjeHonorariosPct: number;  // ej: 0.10 (10%)
  tasaIIBB: number;            // ej: 0.025 (2.5%)
  tasaTEM: number;             // ej: 0.0125 (1.25%)
  comisionVenta: number;       // ej: 0.035 (3.5%)
  margenObjetivo: number;      // ej: 0.20 (20%)
  tipoCambio: number;          // ej: 1500
}

export function calcularPrecioSugerido(inputs: PricingInputs) {
  // 1. Metros Libres
  const metrosLibres = inputs.superficieVendible * (1 - (inputs.canjeTierraPct + inputs.canjeHonorariosPct));
  
  // 2. Costo Directo Total (Simplificado para el ejemplo)
  const costoDirectoTotal = inputs.superficieVendible * inputs.costoDuroM2;
  
  // 3. Grossing-up Impositivo (Fórmula matricial adaptada)
  const factorRetencion = 1 - ((inputs.tasaIIBB + inputs.tasaTEM) * ((1 - inputs.canjeTierraPct - inputs.canjeHonorariosPct) * (1 + inputs.margenObjetivo) / (1 - inputs.canjeTierraPct - inputs.canjeHonorariosPct)));
  
  const subtotalAntesComision = costoDirectoTotal / factorRetencion;
  
  // 4. Costo Integral Total
  const gastosComerciales = (subtotalAntesComision / (1 - inputs.margenObjetivo)) * inputs.comisionVenta;
  const costoIntegralTotal = subtotalAntesComision + gastosComerciales;
  
  // 5. Precios
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
