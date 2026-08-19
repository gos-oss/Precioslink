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
  pctImprevistos: number; // NUEVO
  pctIVA: number;         // NUEVO
  pctAdmin: number;       // NUEVO
}

export function calcularPrecioSugerido(inputs: PricingInputs) {
  // 1. Metros Libres
  const porcentajeCanjes = inputs.canjeTierraPct + inputs.canjeHonorariosPct;
  const metrosLibres = inputs.superficieVendible * (1 - porcentajeCanjes);

  // 2. Primer Bloque: Costos Directos
  const construccion = inputs.superficieVendible * inputs.costoDuroM2;
  const imprevistos = construccion * inputs.pctImprevistos; // AHORA ES DINAMICO
  const iva = construccion * inputs.pctIVA;                 // AHORA ES DINAMICO
  const administracion = construccion * inputs.pctAdmin;    // AHORA ES DINAMICO
  const terrenoFijo = 0; 
  const honorarioFijo = 0;
  
  const subtotal1 = construccion + imprevistos + iva + administracion + terrenoFijo + honorarioFijo;

  // 3. Grossing-up y Segundo Bloque: Gastos de Comercialización e Impuestos
  const sumaDeducciones = inputs.tasaIIBB + inputs.tasaTEM + inputs.comisionVenta + inputs.margenObjetivo;
  
  // Protección matemática
  if (sumaDeducciones >= 1) {
    throw new Error("Las deducciones superan el 100%");
  }

  const ventasTotalesNecesarias = subtotal1 / (1 - sumaDeducciones);

  const iibbYTem = ventasTotalesNecesarias * (inputs.tasaIIBB + inputs.tasaTEM);
  const comercializacion = ventasTotalesNecesarias * inputs.comisionVenta;

  const subtotal2 = subtotal1 + iibbYTem + comercializacion;

  // 4. Tercer Bloque: Valorización del Canje
  const terrenoCanje = ventasTotalesNecesarias * inputs.canjeTierraPct;
  const honorariosCanje = ventasTotalesNecesarias * inputs.canjeHonorariosPct;

  const totalCostoVivienda = subtotal2 + terrenoCanje + honorariosCanje;

  // 5. Precios Finales
  const precioSugeridoUSD = ventasTotalesNecesarias / Math.max(metrosLibres, 1);
  const precioSugeridoARS = precioSugeridoUSD * inputs.tipoCambio;

  return {
    metrosLibres,
    precioSugeridoUSD,
    precioSugeridoARS,
    ticket: {
      construccion,
      imprevistos,
      iva,
      administracion,
      terrenoFijo,
      honorarioFijo,
      subtotal1,
      iibbYTem,
      comercializacion,
      subtotal2,
      terrenoCanje,
      honorariosCanje,
      totalCostoVivienda
    }
  };
}
