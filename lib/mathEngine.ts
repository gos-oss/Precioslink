export function calcularPrecioSugerido(params: any) {
  const {
    superficieVendible, 
    costoDuroM2, 
    valorTerrenoUSD, 
    canjeTierraPct, 
    canjeHonorariosPct,
    margenObjetivo, 
    tasaIIBB, 
    tasaTEM, 
    comisionVenta, 
    tipoCambio,
    pctIVA, 
    pctAdmin, 
    pctImprevistos, 
    pctAjuste
  } = params;

  // 1. COSTOS FIJOS DIRECTOS (Base de Construcción)
  const construccion = costoDuroM2 * superficieVendible;
  const terrenoFijo = valorTerrenoUSD || 0; 
  const imprevistos = construccion * pctImprevistos;
  const administracion = construccion * pctAdmin;
  const iva = construccion * pctIVA; 

  const subtotalCostosFijos = construccion + terrenoFijo + imprevistos + administracion + iva;

  // 2. AISLAR CANJES Y VENTAS REALES
  const pctCanjeTotal = canjeTierraPct + canjeHonorariosPct;
  const pctVentaEfectiva = Math.max(0, 1 - pctCanjeTotal); // Solo el % que realmente sale al mercado a venderse

  // 3. FÓRMULA FINANCIERA (Gross Up Corregido)
  const tasaImpuestosYComisiones = tasaIIBB + tasaTEM + comisionVenta;
  
  // El modelo ahora entiende que los Impuestos y Comisiones SOLO aplican al % de venta efectiva.
  const porcentajesEgresos = (pctVentaEfectiva * tasaImpuestosYComisiones) + pctCanjeTotal + margenObjetivo;

  // Precio de venta = Costos Fijos / (1 - % de todos los egresos y márgenes)
  let ventasTotalesEstimadas = subtotalCostosFijos / (1 - porcentajesEgresos);
  
  // Aplicamos el Premium/Descuento si se configuró en la interfaz
  ventasTotalesEstimadas = ventasTotalesEstimadas * (1 + (pctAjuste || 0));

  // 4. CALCULAR LOS MONTOS EXACTOS
  // Ahora tomamos solo la "porción de plata real" que entra para calcular los impuestos
  const ventasEfectivasMonetarias = ventasTotalesEstimadas * pctVentaEfectiva;
  
  const iibbYTem = ventasEfectivasMonetarias * (tasaIIBB + tasaTEM);
  const comercializacion = ventasEfectivasMonetarias * comisionVenta;
  
  const terrenoCanje = ventasTotalesEstimadas * canjeTierraPct;
  const honorariosCanje = ventasTotalesEstimadas * canjeHonorariosPct;

  // 5. ARMAR EL TICKET PARA LA UI
  const subtotal1 = subtotalCostosFijos; 
  const subtotal2 = subtotal1 + iibbYTem + comercializacion;
  const totalCostoVivienda = subtotal2 + terrenoCanje + honorariosCanje;

  const precioSugeridoUSD = ventasTotalesEstimadas / superficieVendible;
  
  return {
    precioSugeridoUSD,
    metrosLibres: superficieVendible * pctVentaEfectiva, // Ahora muestra exacto los m2 que quedan para vender
    ticket: {
      construccion,
      terrenoFijo,
      imprevistos,
      iva,
      administracion,
      subtotal1,
      iibbYTem,
      comercializacion,
      subtotal2,
      terrenoCanje,
      honorariosCanje,
      totalCostoVivienda
    }
  }
}
