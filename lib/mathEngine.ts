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
  // 1. Calculamos los metros que realmente podemos vender (Cash)
  const porcentajeCanjes = inputs.canjeTierraPct + inputs.canjeHonorariosPct;
  const metrosLibres = inputs.superficieVendible * (1 - porcentajeCanjes);

  // 2. Calculamos todos los Costos Duros y Fijos
  const construccion = inputs.superficieVendible * inputs.costoDuroM2;
  const imprevistos = construccion * inputs.pctImprevistos; 
  const iva = construccion * inputs.pctIVA;                 
  const administracion = construccion * inputs.pctAdmin;    
  const terrenoFijo = inputs.valorTerrenoUSD || 0; 
  const honorarioFijo = 0;
  
  const subtotal1 = construccion + imprevistos + iva + administracion + terrenoFijo + honorarioFijo;

  // 3. Calculamos la facturación en efectivo necesaria para cubrir costos y márgenes
  const sumaDeducciones = inputs.tasaIIBB + inputs.tasaTEM + inputs.comisionVenta + inputs.margenObjetivo;
  
  if (sumaDeducciones >= 1) {
    throw new Error("Las deducciones superan el 100%");
  }

  // Esto es lo que necesitamos facturar (solo con los metros libres)
  const ventasTotalesNecesariasCash = subtotal1 / (1 - sumaDeducciones);

  const iibbYTem = ventasTotalesNecesariasCash * (inputs.tasaIIBB + inputs.tasaTEM);
  const comercializacion = ventasTotalesNecesariasCash * inputs.comisionVenta;

  const subtotal2 = subtotal1 + iibbYTem + comercializacion;

  // 4. EL PRECIO BASE POR METRO CUADRADO
  // Se obtiene dividiendo el dinero necesario por los metros libres
  const precioBaseUSD = ventasTotalesNecesariasCash / Math.max(metrosLibres, 1);

  // 5. CÁLCULO DE CANJES (LA CORRECCIÓN)
  // Ahora el canje se aplica sobre el VALOR TOTAL DEL PROYECTO (Precio m2 * Total de metros)
  const valorTotalProyecto = precioBaseUSD * inputs.superficieVendible;
  
  const terrenoCanje = valorTotalProyecto * inputs.canjeTierraPct;
  const honorariosCanje = valorTotalProyecto * inputs.canjeHonorariosPct;

  // El Total del Costo ahora refleja la suma del cash invertido + el valor de mercado de los canjes
  const totalCostoVivienda = subtotal2 + terrenoCanje + honorariosCanje;

  // 6. PRECIO SUGERIDO FINAL (Aplicando el ajuste premium/discount)
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
