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

  // 1. COSTOS FIJOS DIRECTOS (Base)
  const construccion = costoDuroM2 * superficieVendible;
  const terrenoFijo = valorTerrenoUSD || 0; 
  const imprevistos = construccion * pctImprevistos;
  const administracion = construccion * pctAdmin;
  const iva = construccion * pctIVA; 

  const subtotal1 = construccion + terrenoFijo + imprevistos + administracion + iva;

  // 2. AISLAR CANJES Y VENTAS EFECTIVAS
  const pctCanjeTotal = canjeTierraPct + canjeHonorariosPct;
  const pctVentaEfectiva = Math.max(0, 1 - pctCanjeTotal); // Solo el % que realmente sale a la venta

  // 3. FÓRMULA FINANCIERA (Gross Up Resolviendo la X del Costo Total)
  // factorImpuestos: Se divide por (1 + pctIVA) para que IIBB y TEM se calculen sobre el NETO DE IVA.
  const factorComision = comisionVenta;
  const factorImpuestos = (tasaIIBB + tasaTEM) / (1 + pctIVA); 
  
  // Ecuación algebraica despejada: 
  // Costo Total = Subtotal 1 / [ %VentaEfectiva * (1 - (1+Margen) * (Comision + ImpuestosNetos)) ]
  const denominador = pctVentaEfectiva * (1 - (1 + margenObjetivo) * (factorComision + factorImpuestos));
  
  const totalCostoVivienda = subtotal1 / denominador;
  
  // 4. CALCULAR MONTOS EXACTOS
  const terrenoCanje = totalCostoVivienda * canjeTierraPct;
  const honorariosCanje = totalCostoVivienda * canjeHonorariosPct;
  
  // La venta total objetivo sumándole el margen de ganancia
  let ventasTotalesEstimadas = totalCostoVivienda * (1 + margenObjetivo);
  
  // Aplicamos el Premium/Descuento si el usuario lo configuró en pantalla
  ventasTotalesEstimadas = ventasTotalesEstimadas * (1 + (pctAjuste || 0));

  // 5. CÁLCULO DE EGRESOS COMERCIALES E IMPUESTOS
  const ventasEfectivasBrutas = ventasTotalesEstimadas * pctVentaEfectiva; // Lo que realmente se factura
  const ventasEfectivasNetas = ventasEfectivasBrutas / (1 + pctIVA); // Base imponible para Rentas

  const iibbYTem = ventasEfectivasNetas * (tasaIIBB + tasaTEM);
  const comercializacion = ventasEfectivasBrutas * comisionVenta;
  
  // 6. ARMAR EL TICKET PARA LA UI
  const subtotal2 = subtotal1 + iibbYTem + comercializacion;
  const precioSugeridoUSD = ventasTotalesEstimadas / superficieVendible;
  
  return {
    precioSugeridoUSD,
    metrosLibres: superficieVendible * pctVentaEfectiva, 
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
