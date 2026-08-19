export interface PricingInputs {
  superficieVendible: number;
  costoDuroM2: number;
  valorTerrenoUSD: number; // NUEVO: Valor de compra de la tierra en efectivo
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

  const construccion = inputs.superficieVendible * inputs.costoDuroM2;
  const imprevistos = construccion * inputs.pctImprevistos; 
  const iva = construccion * inputs.pctIVA;                 
  const administracion = construccion * inputs.pctAdmin;    
  
  // AHORA EL TERRENO FIJO TOMA EL VALOR DEL INPUT
  const terrenoFijo = inputs.valorTerrenoUSD || 0; 
  const honorarioFijo = 0;
  
  // El subtotal 1 ahora incluye el valor del terreno que se pagó en efectivo
  const subtotal1 = construccion + imprevistos + iva + administracion + terrenoFijo + honorarioFijo;

  const sumaDeducciones = inputs.tasaIIBB + inputs.tasaTEM + inputs.comisionVenta + inputs.margenObjetivo;
  
  if (sumaDeducciones >= 1) {
    throw new Error("Las deducciones superan el 100%");
  }

  const ventasTotalesNecesarias = subtotal1 / (1 - sumaDeducciones);

  const iibbYTem = ventasTotalesNecesarias * (inputs.tasaIIBB + inputs.tasaTEM);
  const comercializacion = ventasTotalesNecesarias * inputs.comisionVenta;

  const subtotal2 = subtotal1 + iibbYTem + comercializacion;

  const terrenoCanje = ventasTotalesNecesarias * inputs.canjeTierraPct;
  const honorariosCanje = ventasTotalesNecesarias * inputs.canjeHonorariosPct;

  const totalCostoVivienda = subtotal2 + terrenoCanje + honorariosCanje;

  const precioBaseUSD = ventasTotalesNecesarias / Math.max(metrosLibres, 1);
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
