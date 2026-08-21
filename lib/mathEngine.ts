export interface PricingInputs {
  superficieVendible: number;
  costoDuroM2: number;
  valorTerrenoUSD: number; 
  canjeTierraPct: number;
  canjeHonorariosPct: number;
  tasaIIBB: number;
  tasaTEM: number;
  comisionVenta: number;
  margenObjetivo: number;
  tipoCambio: number;
  pctIVA: number;
  pctAdmin: number;
  pctImprevistos: number;
  pctAjuste: number; 
}

export function calcularPrecioSugerido(inputs: PricingInputs) {
  const porcentajeCanjes = inputs.canjeTierraPct + inputs.canjeHonorariosPct;
  const metrosLibres = inputs.superficieVendible * (1 - porcentajeCanjes);

  // 1. COSTO FÍSICO DEL 100% DEL EDIFICIO
  const construccion = inputs.superficieVendible * inputs.costoDuroM2;
  const imprevistos = construccion * inputs.pctImprevistos; 
  const iva = construccion * inputs.pctIVA;                 
  const administracion = construccion * inputs.pctAdmin;    
  const terrenoFijo = inputs.valorTerrenoUSD || 0; 
  const honorarioFijo = 0;
  
  const subtotal1 = construccion + imprevistos + iva + administracion + terrenoFijo + honorarioFijo;

  const sumaDeducciones = inputs.tasaIIBB + inputs.tasaTEM + inputs.comisionVenta + inputs.margenObjetivo;
  
  if (sumaDeducciones >= 1) {
    throw new Error("Las deducciones superan el 100%");
  }

  const ventasTotalesNecesariasCash = subtotal1 / (1 - sumaDeducciones);
  const iibbYTem = ventasTotalesNecesariasCash * (inputs.tasaIIBB + inputs.tasaTEM);
  const comercializacion = ventasTotalesNecesariasCash * inputs.comisionVenta;

  const subtotal2 = subtotal1 + iibbYTem + comercializacion;

  const precioBaseUSD = ventasTotalesNecesariasCash / Math.max(metrosLibres, 1);

  // 2. CÁLCULO DE CANJE A COSTO DE OBRA (Como tú indicaste)
  // ¿Cuánto me costó físicamente levantar los metros que voy a entregar?
  const costoFisicoTotal = construccion + imprevistos + iva + administracion;
  const terrenoCanje = costoFisicoTotal * inputs.canjeTierraPct;
  const honorariosCanje = costoFisicoTotal * inputs.canjeHonorariosPct;

  // 3. EL COSTO TOTAL REAL DEL PROYECTO
  // No sumamos el canje aquí porque ya está pagado dentro del 'costoFisicoTotal' (Subtotal 1)
  // De lo contrario, inflaríamos el costo artificialmente.
  const totalCostoVivienda = subtotal2;

  const precioSugeridoUSD = precioBaseUSD * (1 + inputs.pctAjuste); 
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
