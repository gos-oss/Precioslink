'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calculator, Percent, DollarSign, Edit2, Check, X, Activity, Calendar, SlidersHorizontal, CheckCircle2, MapPin, Receipt } from 'lucide-react'

const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ProyectoDetallePage({ params }: { params: { id: string } }) {
  // PESTAÑAS
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'financiador' | 'cobros'>('pricing')
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: 'exito' })

  // ==========================================
  // ESTADOS MÓDULO DE PRICING (ORIGINAL)
  // ==========================================
  const [proyecto, setProyecto] = useState<any>(null)
  const [configGlobal, setConfigGlobal] = useState<any>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  
  const [superficieVendible, setSuperficieVendible] = useState(5000)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [valorTerrenoUSD, setValorTerrenoUSD] = useState(0)
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [canjeHonorarios, setCanjeHonorarios] = useState(0.10)
  const [pctAdmin, setPctAdmin] = useState(0.0589)
  const [pctImprevistos, setPctImprevistos] = useState(0.06)
  const [pctAjuste, setPctAjuste] = useState(0)
  
  const [fechaReferencia, setFechaReferencia] = useState(getTodayDate())
  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // ==========================================
  // ESTADOS MÓDULO INVENTARIO Y COBROS
  // ==========================================
  const [unidades, setUnidades] = useState<any[]>([])
  const [operaciones, setOperaciones] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [nuevaUnidad, setNuevaUnidad] = useState({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
  
  // ESTADOS NUEVOS: DETALLE DE COBROS (MODAL)
  const [operacionSeleccionadaCobro, setOperacionSeleccionadaCobro] = useState<any>(null)
  const [cuotasOperacion, setCuotasOperacion] = useState<any[]>([])
  const [cargandoCuotas, setCargandoCuotas] = useState(false)

  // ==========================================
  // ESTADOS MÓDULO FINANCIADOR
  // ==========================================
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'PESOS'>('USD')
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState<number>(30)
  const [pagoEntrega, setPagoEntrega] = useState<number>(0)
  const [cuotasEspera, setCuotasEspera] = useState<number>(24)
  const [cuotasPosesion, setCuotasPosesion] = useState<number>(18)
  const [tasaPosesion, setTasaPosesion] = useState<number>(1.15)

  // ==========================================
  // CARGA DE DATOS GENERAL
  // ==========================================
  useEffect(() => {
    async function fetchData() {
      const [resProyecto, resConfig, resHistorial, resUnidades, resOperaciones] = await Promise.all([
        supabase.from('proyectos').select('*').eq('id', params.id).single(),
        supabase.from('configuracion_global').select('*').eq('id', 1).single(),
        supabase.from('historial_versiones_proyecto').select('*').eq('id_proyecto', params.id).order('id', { ascending: false }).limit(1),
        supabase.from('unidades').select('*').eq('id_proyecto', params.id).order('identificador', { ascending: true }),
        supabase.from('operaciones').select('*').eq('id_proyecto', params.id).order('created_at', { ascending: false })
      ])
      
      if (resProyecto.data) {
        setProyecto(resProyecto.data)
        if (resProyecto.data.superficie_vendible_m2) setSuperficieVendible(resProyecto.data.superficie_vendible_m2)
        if (resProyecto.data.valor_terreno_usd != null) setValorTerrenoUSD(resProyecto.data.valor_terreno_usd)
        if (resProyecto.data.gastos_admin != null) setPctAdmin(resProyecto.data.gastos_admin)
        if (resProyecto.data.imprevistos != null) setPctImprevistos(resProyecto.data.imprevistos)
        if (resProyecto.data.pct_ajuste != null) setPctAjuste(resProyecto.data.pct_ajuste)
      }
      
      if (resConfig.data) setConfigGlobal(resConfig.data)

      if (resHistorial.data && resHistorial.data.length > 0) {
        const ultimo = resHistorial.data[0]
        if (ultimo.costo_duro_m2) setCostoDuroM2(ultimo.costo_duro_m2)
        if (ultimo.valor_terreno_usd != null) setValorTerrenoUSD(ultimo.valor_terreno_usd)
        if (ultimo.canje_tierra_porcentaje != null) setCanjeTierra(ultimo.canje_tierra_porcentaje)
        if (ultimo.margen_objetivo != null) setMargenObjetivo(ultimo.margen_objetivo)
        if (ultimo.pct_ajuste != null) setPctAjuste(ultimo.pct_ajuste)
      }

      if (resUnidades.data) setUnidades(resUnidades.data)
      if (resOperaciones.data) setOperaciones(resOperaciones.data)
    }
    fetchData()
  }, [params.id])

  // ==========================================
  // LÓGICA PRICING (Original)
  // ==========================================
  useEffect(() => {
    if (proyecto && configGlobal) {
      try {
        const res = calcularPrecioSugerido({
          superficieVendible, costoDuroM2, valorTerrenoUSD, canjeTierraPct: canjeTierra, canjeHonorariosPct: canjeHonorarios,
          margenObjetivo, tasaIIBB: configGlobal.tasa_iibb, tasaTEM: configGlobal.tasa_tem,
          comisionVenta: configGlobal.comision_venta, tipoCambio: configGlobal.tipo_cambio,
          pctIVA: configGlobal.tasa_iva, pctAdmin, pctImprevistos, pctAjuste
        })
        setResultados(res)
      } catch (error) { console.error(error) }
    }
  }, [proyecto, configGlobal, superficieVendible, costoDuroM2, valorTerrenoUSD, margenObjetivo, canjeTierra, canjeHonorarios, pctAdmin, pctImprevistos, pctAjuste])

  const mostrarNotificacion = (mensaje: string, tipo: 'exito' | 'error' = 'exito') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: 'exito' }), 3500)
  }

  async function guardarHistorial() {
    if (!resultados || !proyecto || !configGlobal) return
    setGuardando(true)

    await supabase.from('proyectos').update({ 
      superficie_vendible_m2: superficieVendible, gastos_admin: pctAdmin, imprevistos: pctImprevistos, pct_ajuste: pctAjuste, valor_terreno_usd: valorTerrenoUSD 
    }).eq('id', proyecto.id)

    const { data: registroExistente } = await supabase.from('historial_versiones_proyecto').select('id').eq('id_proyecto', proyecto.id).eq('fecha_referencia', fechaReferencia).maybeSingle()

    const datosAguardar = {
      tipo_cambio: configGlobal.tipo_cambio, costo_duro_m2: costoDuroM2, valor_terreno_usd: valorTerrenoUSD,
      canje_tierra_porcentaje: canjeTierra, margen_objetivo: margenObjetivo, resultado_metros_libres: resultados.metrosLibres,
      resultado_costo_integral_total_usd: resultados.ticket.totalCostoVivienda, resultado_precio_promedio_usd: resultados.precioSugeridoUSD,
      pct_ajuste: pctAjuste
    }

    let errorProceso = null
    if (registroExistente) {
      const { error } = await supabase.from('historial_versiones_proyecto').update(datosAguardar).eq('id', registroExistente.id)
      errorProceso = error
    } else {
      const { error } = await supabase.from('historial_versiones_proyecto').insert({ ...datosAguardar, id_proyecto: proyecto.id, fecha_referencia: fechaReferencia })
      errorProceso = error
    }
    
    setGuardando(false)
    if (errorProceso) mostrarNotificacion('Error: ' + errorProceso.message, 'error')
    else mostrarNotificacion('Corte mensual fijado y actualizado')
  }

  async function guardarNombre() {
    if (!nuevoNombre.trim()) return
    const { error } = await supabase.from('proyectos').update({ nombre: nuevoNombre }).eq('id', proyecto.id)
    if (!error) { 
      setProyecto({ ...proyecto, nombre: nuevoNombre })
      setEditandoNombre(false)
      mostrarNotificacion('Nombre actualizado correctamente')
    }
  }

  // ==========================================
  // LÓGICA STOCK Y FINANCIADOR
  // ==========================================
  const unidadesDisponibles = unidades.filter((u) => u.estado === 'disponible')
  const m2Disponibles = unidadesDisponibles.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0)
  
  // Usamos el precio promedio calculado para el inventario
  const precioBaseActualUSD = resultados ? resultados.precioSugeridoUSD : 0
  const tcActivoActual = configGlobal ? configGlobal.tipo_cambio : 1530

  const valorInventarioUSD = unidadesDisponibles.reduce((acc, u) => {
    if (u.precio_lista_usd && Number(u.precio_lista_usd) > 0) return acc + Number(u.precio_lista_usd)
    const coef = Number(u.porcentaje_aplicar ?? 100) / 100
    return acc + Number(u.superficie_m2 || 0) * precioBaseActualUSD * coef
  }, 0)

  const unidadesFiltradas = unidades.filter((u) => {
    if (filtroEstado === 'todos') return true
    return u.estado === filtroEstado
  })

  const handleAgregarUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaUnidad.identificador || !nuevaUnidad.superficie_m2) return
    const { data, error } = await supabase.from('unidades').insert([{
      id_proyecto: params.id,
      identificador: nuevaUnidad.identificador,
      superficie_m2: Number(nuevaUnidad.superficie_m2),
      estado: nuevaUnidad.estado,
      porcentaje_aplicar: Number(nuevaUnidad.porcentaje_aplicar || 100),
    }]).select()
    if (!error && data) {
      setUnidades([...unidades, data[0]])
      setNuevaUnidad({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
      mostrarNotificacion('Unidad agregada correctamente')
    }
  }

  // Financiador Math
  const unidadFinanciar = unidadesDisponibles.find(u => u.id === unidadSeleccionada)
  const precioListaUSD = unidadFinanciar 
    ? (unidadFinanciar.precio_lista_usd && Number(unidadFinanciar.precio_lista_usd) > 0
        ? Number(unidadFinanciar.precio_lista_usd)
        : Number(unidadFinanciar.superficie_m2) * precioBaseActualUSD * (Number(unidadFinanciar.porcentaje_aplicar || 100) / 100))
    : 0

  const precioMoneda = moneda === 'USD' ? precioListaUSD : precioListaUSD * tcActivoActual
  const montoAnticipo = precioMoneda * (porcentajeAnticipo / 100)
  const saldoAFinanciar = Math.max(0, precioMoneda - montoAnticipo - pagoEntrega)
  
  const cuotasEquivalentes = cuotasEspera + (cuotasPosesion * tasaPosesion)
  const valorCuotaEspera = cuotasEquivalentes > 0 ? (saldoAFinanciar / cuotasEquivalentes) : 0
  const valorCuotaPosesion = valorCuotaEspera * tasaPosesion

  const handleRegistrarVenta = async () => {
    if (!unidadSeleccionada) return alert("Seleccione una unidad.")
    if (!window.confirm("¿Confirmar venta y generar Cuenta Corriente?")) return

    const { data: opData, error: opError } = await supabase.from('operaciones').insert([{
        id_proyecto: params.id, id_unidad: unidadSeleccionada, moneda: moneda, precio_total: precioMoneda, monto_anticipo: montoAnticipo, pago_entrega: pagoEntrega, saldo_financiado: saldoAFinanciar, cliente_nombre: 'Cliente Nuevo'
    }]).select()

    if (opError || !opData) return alert("Error al guardar la operación.")

    const idOperacion = opData[0].id
    const cuotasToInsert = []
    let fechaVencimiento = new Date()

    for (let i = 1; i <= cuotasEspera; i++) {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1)
      cuotasToInsert.push({ id_operacion: idOperacion, numero_cuota: i, tipo_cuota: 'ESPERA', monto_base: valorCuotaEspera, fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0] })
    }
    for (let i = 1; i <= cuotasPosesion; i++) {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1)
      cuotasToInsert.push({ id_operacion: idOperacion, numero_cuota: cuotasEspera + i, tipo_cuota: 'POSESION', monto_base: valorCuotaPosesion, fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0] })
    }

    if (cuotasToInsert.length > 0) await supabase.from('cuotas').insert(cuotasToInsert)
    await supabase.from('unidades').update({ estado: 'vendida' }).eq('id', unidadSeleccionada)

    setUnidades(unidades.map(u => u.id === unidadSeleccionada ? { ...u, estado: 'vendida' } : u))
    setOperaciones([opData[0], ...operaciones])
    setUnidadSeleccionada('')
    mostrarNotificacion("Venta registrada con éxito")
    setActiveTab('cobros')
  }

  // ==========================================
  // LÓGICA DE COBRANZA (NUEVO)
  // ==========================================
  const handleAbrirCobros = async (operacion: any) => {
    setOperacionSeleccionadaCobro(operacion)
    setCargandoCuotas(true)
    const { data, error } = await supabase
      .from('cuotas')
      .select('*')
      .eq('id_operacion', operacion.id)
      .order('numero_cuota', { ascending: true })

    if (data) setCuotasOperacion(data)
    setCargandoCuotas(false)
  }

  const handleCobrarCuota = async (cuotaId: string) => {
    if (!window.confirm("¿Confirmar el cobro de esta cuota?")) return
    
    const hoy = getTodayDate()
    const { error } = await supabase
      .from('cuotas')
      .update({ estado: 'pagada', fecha_pago: hoy })
      .eq('id', cuotaId)
      
    if (!error) {
       setCuotasOperacion(cuotasOperacion.map(c => c.id === cuotaId ? { ...c, estado: 'pagada', fecha_pago: hoy } : c))
       mostrarNotificacion("Cuota cobrada exitosamente")
    } else {
       mostrarNotificacion("Error al registrar cobro", "error")
    }
  }


  // ==========================================
  // LOADING STATE
  // ==========================================
  if (!proyecto || !configGlobal) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Sincronizando modelos...</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-zinc-100 font-sans text-zinc-900 selection:bg-indigo-100 relative print:bg-white print:p-0">
      
      {/* NOTIFICADOR POPUP */}
      <div className={`fixed bottom-8 right-8 z-50 flex items-center bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-zinc-700 transition-all duration-500 transform ${notificacion.mostrar ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'} print:hidden`}>
        {notificacion.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3" /> : <X className="w-5 h-5 text-rose-400 mr-3" />}
        <span className="font-medium text-sm">{notificacion.mensaje}</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-10 print:p-0">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors mb-4 tracking-wide">
              <ArrowLeft className="w-4 h-4 mr-1" /> VOLVER AL PORTAFOLIO
            </Link>
            {editandoNombre ? (
              <div className="flex items-center">
                <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="text-3xl font-black text-zinc-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent" autoFocus />
                <button onClick={guardarNombre} className="ml-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-colors"><Check className="w-5 h-5"/></button>
                <button onClick={() => setEditandoNombre(false)} className="ml-2 text-rose-500 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
              </div>
            ) : (
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 flex items-center group tracking-tight">
                {proyecto.nombre}
                <button onClick={() => { setNuevoNombre(proyecto.nombre); setEditandoNombre(true); }} className="ml-4 text-zinc-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-5 h-5" /></button>
              </h1>
            )}
            <p className="text-zinc-500 mt-2 font-medium">{proyecto.descripcion}</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-3">T.C. Activo</span>
            <span className="text-indigo-600 font-black text-lg">${configGlobal.tipo_cambio}</span>
          </div>
        </div>

        {/* NAVEGACIÓN PESTAÑAS */}
        <div className="flex gap-2 border-b border-zinc-200 print:hidden overflow-x-auto">
          {(['pricing', 'stock', 'financiador', 'cobros'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-6 text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab === 'pricing' ? '📊 Pricing Model' : tab === 'stock' ? '🏢 Inventario' : tab === 'financiador' ? '💼 Financiador' : '🪙 Cobros'}
            </button>
          ))}
        </div>

        {/* ============================== */}
        {/* 1. PESTAÑA PRICING             */}
        {/* ============================== */}
        {activeTab === 'pricing' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
            <div className="lg:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100">
                <h2 className="text-sm font-bold text-zinc-800 flex items-center uppercase tracking-widest">
                  <Calculator className="w-5 h-5 mr-3 text-indigo-500" /> Configuración del Escenario
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div className="col-span-1 md:col-span-2 bg-zinc-50 p-6 rounded-2xl border border-zinc-200">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Building2 className="w-4 h-4 mr-2 text-indigo-500" /> Superficie Vendible (m²)</label>
                  <input type="number" value={superficieVendible} onChange={(e) => setSuperficieVendible(Number(e.target.value))} className="w-full rounded-xl border-0 bg-white px-5 py-4 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-black text-xl" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-zinc-400" /> Costo Duro Obra (USD/m²)</label>
                  <input type="number" value={costoDuroM2} onChange={(e) => setCostoDuroM2(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><MapPin className="w-4 h-4 mr-2 text-zinc-400" /> Valor Terreno (USD Fijo)</label>
                  <input type="number" value={valorTerrenoUSD} onChange={(e) => setValorTerrenoUSD(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-zinc-400" /> Margen Objetivo</label>
                  <input type="number" step="0.01" value={margenObjetivo} onChange={(e) => setMargenObjetivo(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-zinc-400" /> Canje Tierra (%)</label>
                  <input type="number" step="0.01" value={canjeTierra} onChange={(e) => setCanjeTierra(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-zinc-400" /> Canje Honorarios (%)</label>
                  <input type="number" step="0.01" value={canjeHonorarios} onChange={(e) => setCanjeHonorarios(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-zinc-400" /> Gastos Adm. (Obra)</label>
                  <input type="number" step="0.001" value={pctAdmin} onChange={(e) => setPctAdmin(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-zinc-400" /> Imprevistos (Obra)</label>
                  <input type="number" step="0.001" value={pctImprevistos} onChange={(e) => setPctImprevistos(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold" />
                </div>
                
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-indigo-700 mb-3 flex items-center"><SlidersHorizontal className="w-4 h-4 mr-2" /> Pricing Premium/Discount</label>
                  <input type="number" step="0.01" value={pctAjuste} onChange={(e) => setPctAjuste(Number(e.target.value))} className="w-full rounded-xl border-0 bg-white px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-indigo-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-bold text-indigo-700" />
                  <p className="text-[10px] text-indigo-400 mt-2 font-medium">Ej: 0.05 para +5% premium.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-zinc-950 p-8 rounded-3xl shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10">
                <h2 className="text-[11px] font-bold text-zinc-400 mb-6 tracking-widest uppercase">Proyección Financiera</h2>
                {resultados && (
                  <div className="space-y-6">
                    <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
                      <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 font-bold">Precio Promedio</p>
                      <div className="flex items-baseline">
                        <span className="text-xl font-bold text-zinc-400 mr-2">USD</span>
                        <p className="text-4xl font-black text-white tracking-tight">{Math.round(resultados.precioSugeridoUSD).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-zinc-900 p-5 rounded-2xl font-mono text-[13px] text-zinc-400 border border-zinc-800 shadow-inner">
                      <div className="flex justify-between text-white font-bold mb-2"><span>CONSTRUCCION</span><span>${Math.round(resultados.ticket.construccion).toLocaleString()}</span></div>
                      {resultados.ticket.terrenoFijo > 0 && (
                        <div className="flex justify-between pl-3 text-emerald-400 font-semibold"><span>Terreno (Fijo)</span><span>${Math.round(resultados.ticket.terrenoFijo).toLocaleString()}</span></div>
                      )}
                      <div className="flex justify-between pl-3"><span>Imprevistos</span><span>{Math.round(resultados.ticket.imprevistos).toLocaleString()}</span></div>
                      <div className="flex justify-between pl-3"><span>IVA</span><span>{Math.round(resultados.ticket.iva).toLocaleString()}</span></div>
                      <div className="flex justify-between pl-3"><span>Administración</span><span>{Math.round(resultados.ticket.administracion).toLocaleString()}</span></div>
                      <div className="flex justify-between text-white font-bold border-y border-zinc-700/50 py-2 my-2"><span>Subtotal</span><span>${Math.round(resultados.ticket.subtotal1).toLocaleString()}</span></div>
                      
                      <div className="flex justify-between pl-3"><span>IIBB y TEM</span><span>{Math.round(resultados.ticket.iibbYTem).toLocaleString()}</span></div>
                      <div className="flex justify-between pl-3"><span>Comercializ.</span><span>{Math.round(resultados.ticket.comercializacion).toLocaleString()}</span></div>
                      <div className="flex justify-between text-white font-bold border-y border-zinc-700/50 py-2 my-2"><span>Subtotal</span><span>${Math.round(resultados.ticket.subtotal2).toLocaleString()}</span></div>
                      
                      <div className="flex justify-between pl-3"><span>Terreno Canje</span><span>{Math.round(resultados.ticket.terrenoCanje).toLocaleString()}</span></div>
                      <div className="flex justify-between pl-3"><span>Hon. Canje</span><span>{Math.round(resultados.ticket.honorariosCanje).toLocaleString()}</span></div>
                      <div className="flex justify-between text-emerald-400 font-bold bg-zinc-950 -mx-5 p-5 mt-5 border-t border-emerald-500/20 rounded-b-2xl"><span>TOTAL COSTO</span><span>${Math.round(resultados.ticket.totalCostoVivienda).toLocaleString()}</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 relative z-10">
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" /> Fecha del Corte
                  </label>
                  <input type="date" value={fechaReferencia} onChange={(e) => setFechaReferencia(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <button onClick={guardarHistorial} disabled={guardando} className={`w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl transition-all duration-300 ${guardando ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98]'}`}>
                  <Save className="w-5 h-5 mr-2" /> {guardando ? 'Guardando Corte...' : 'Fijar Corte Mensual'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* 2. PESTAÑA STOCK               */}
        {/* ============================== */}
        {activeTab === 'stock' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm h-fit">
              <h3 className="text-sm font-bold text-zinc-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span className="text-indigo-500">+</span> AGREGAR UNIDAD
              </h3>
              <form onSubmit={handleAgregarUnidad} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">IDENTIFICADOR (EJ: 4º A)</label>
                  <input type="text" value={nuevaUnidad.identificador} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, identificador: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">SUPERFICIE (M²)</label>
                  <input type="number" step="0.01" value={nuevaUnidad.superficie_m2} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, superficie_m2: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">% APLICAR / COEFICIENTE</label>
                  <input type="number" step="0.1" value={nuevaUnidad.porcentaje_aplicar} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, porcentaje_aplicar: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">ESTADO</label>
                  <select value={nuevaUnidad.estado} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, estado: e.target.value as any })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="disponible">Disponible</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm">Guardar Unidad</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">🔲 INVENTARIO ({unidades.length})</h3>
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-2 shadow-sm">
                  <span>LIBRE: {m2Disponibles.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
                  <span className="text-indigo-300">|</span>
                  <span className="text-indigo-700 font-black">USD {Math.round(valorInventarioUSD).toLocaleString('es-AR')}</span>
                </div>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 uppercase">
                  <option value="todos">TODOS</option><option value="disponible">DISPONIBLES</option><option value="reservada">RESERVADAS</option><option value="vendida">VENDIDAS</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-bold tracking-wider">
                      <th className="pb-3">Unidad</th><th className="pb-3">Superficie</th><th className="pb-3">% Aplicar</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Valor Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {unidadesFiltradas.length > 0 ? (
                      unidadesFiltradas.map((u) => {
                        const valorEstimado = u.precio_lista_usd && Number(u.precio_lista_usd) > 0 ? Number(u.precio_lista_usd) : Number(u.superficie_m2 || 0) * precioBaseActualUSD * (Number(u.porcentaje_aplicar || 100) / 100)
                        return (
                          <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 font-bold text-zinc-800">{u.identificador}</td>
                            <td className="py-3 text-zinc-600">{u.superficie_m2} m²</td>
                            <td className="py-3 text-zinc-600 font-bold">{u.porcentaje_aplicar || 100}%</td>
                            <td className="py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${u.estado === 'disponible' ? 'bg-emerald-100 text-emerald-700' : u.estado === 'reservada' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>{u.estado}</span>
                            </td>
                            <td className="py-3 text-right font-black text-zinc-900">USD {Math.round(valorEstimado).toLocaleString('es-AR')}</td>
                          </tr>
                        )
                      })
                    ) : (<tr><td colSpan={5} className="py-6 text-center text-zinc-400 italic">No hay unidades.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* 3. PESTAÑA FINANCIADOR         */}
        {/* ============================== */}
        {activeTab === 'financiador' && (
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm print:border-none print:shadow-none print:w-full">
            <h3 className="text-lg font-black text-zinc-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
              💼 PRESUPUESTO COMERCIAL
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 print:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">UNIDAD A COTIZAR</label>
                  <select value={unidadSeleccionada} onChange={(e) => setUnidadSeleccionada(e.target.value)} className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 print:appearance-none bg-zinc-50">
                    <option value="">Seleccione...</option>
                    {unidadesDisponibles.map(u => <option key={u.id} value={u.id}>{u.identificador} - {u.superficie_m2} m²</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">MONEDA</label>
                    <select value={moneda} onChange={(e) => setMoneda(e.target.value as 'USD'|'PESOS')} className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 print:appearance-none">
                      <option value="USD">USD</option><option value="PESOS">Pesos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">% ANTICIPO</label>
                    <input type="number" value={porcentajeAnticipo} onChange={(e) => setPorcentajeAnticipo(Number(e.target.value))} className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 print:border-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">CUOTAS ESPERA</label>
                    <input type="number" value={cuotasEspera} onChange={(e) => setCuotasEspera(Number(e.target.value))} className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 print:border-none bg-zinc-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">CUOTAS POSESIÓN</label>
                    <input type="number" value={cuotasPosesion} onChange={(e) => setCuotasPosesion(Number(e.target.value))} className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 print:border-none bg-zinc-50" />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 print:border-zinc-300 h-fit">
                <h4 className="text-xs font-black text-zinc-400 mb-5 uppercase tracking-widest">Resumen de Operación</h4>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-zinc-200/60 pb-3">
                    <span className="text-sm font-semibold text-zinc-600">Valor Lista</span>
                    <span className="text-sm font-black text-zinc-900">{moneda} {Math.round(precioMoneda).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/60 pb-3">
                    <span className="text-sm font-semibold text-zinc-600">Anticipo</span>
                    <span className="text-sm font-black text-indigo-600">{moneda} {Math.round(montoAnticipo).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between pb-2 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                    <span className="text-sm font-bold text-indigo-900">Saldo a Financiar</span>
                    <span className="text-sm font-black text-indigo-900">{moneda} {Math.round(saldoAFinanciar).toLocaleString('es-AR')}</span>
                  </div>
                  
                  <div className="pt-2">
                    {cuotasEspera > 0 && (
                      <div className="bg-white p-4 rounded-xl text-center border border-zinc-200 shadow-sm mb-3">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{cuotasEspera} CUOTAS DE ESPERA</span>
                        <span className="text-2xl font-black text-zinc-800">{moneda} {Math.round(valorCuotaEspera).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {cuotasPosesion > 0 && (
                      <div className="bg-zinc-100 p-4 rounded-xl text-center border border-zinc-200">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{cuotasPosesion} CUOTAS POSESIÓN</span>
                        <span className="text-2xl font-black text-zinc-700">{moneda} {Math.round(valorCuotaPosesion).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end gap-4 print:hidden">
              <button onClick={() => window.print()} disabled={!unidadSeleccionada} className="px-6 py-3 rounded-xl font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">🖨️ Imprimir</button>
              <button onClick={handleRegistrarVenta} disabled={!unidadSeleccionada} className="px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">✅ Registrar Venta</button>
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* 4. PESTAÑA COBROS (CTA CTE)    */}
        {/* ============================== */}
        {activeTab === 'cobros' && (
          <div className="max-w-7xl mx-auto bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-black text-zinc-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
              🪙 CUENTAS CORRIENTES ({operaciones.length})
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-bold tracking-wider text-xs">
                    <th className="pb-4 pl-2">Unidad</th>
                    <th className="pb-4">Cliente</th>
                    <th className="pb-4">Moneda / Índice</th>
                    <th className="pb-4 text-right">Total Venta</th>
                    <th className="pb-4 text-right">Saldo Financiado</th>
                    <th className="pb-4 text-center pr-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {operaciones.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-zinc-400 font-medium">Aún no hay ventas registradas.</td></tr>
                  ) : (
                    operaciones.map(op => {
                      const uni = unidades.find(u => u.id === op.id_unidad)
                      return (
                        <tr key={op.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="py-4 pl-2 font-black text-zinc-800">{uni ? uni.identificador : 'Desconocida'}</td>
                          <td className="py-4 font-semibold text-zinc-600">{op.cliente_nombre || 'Sin Nombre'}</td>
                          <td className="py-4">
                            <span className="font-bold text-zinc-800">{op.moneda}</span>
                            <span className="text-xs text-zinc-400 ml-1 font-medium">({op.indice_actualizacion || 'N/A'})</span>
                          </td>
                          <td className="py-4 text-right font-medium text-zinc-500">${Number(op.precio_total).toLocaleString('es-AR')}</td>
                          <td className="py-4 text-right font-black text-emerald-600">${Number(op.saldo_financiado).toLocaleString('es-AR')}</td>
                          <td className="py-4 text-center pr-2">
                            <button onClick={() => handleAbrirCobros(op)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                              Cobrar / Ver Detalles
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL DE DETALLE Y COBRO DE CUOTAS         */}
      {/* ========================================== */}
      {operacionSeleccionadaCobro && (
        <div className="fixed inset-0 z-[60] bg-zinc-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
            
            {/* Cabecera del Modal */}
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div>
                <h3 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-indigo-500" />
                  Detalle de Cuenta Corriente
                </h3>
                <p className="text-sm font-medium text-zinc-500 mt-1">
                  Cliente: <span className="font-bold text-zinc-700">{operacionSeleccionadaCobro.cliente_nombre || 'Sin nombre'}</span> | 
                  Moneda: <span className="font-bold text-zinc-700">{operacionSeleccionadaCobro.moneda}</span>
                </p>
              </div>
              <button onClick={() => setOperacionSeleccionadaCobro(null)} className="p-2 bg-white border border-zinc-200 text-zinc-400 hover:text-rose-500 hover:border-rose-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal (Tabla de Cuotas) */}
            <div className="overflow-y-auto flex-1 p-8 bg-white">
              {cargandoCuotas ? (
                <div className="flex justify-center py-10"><Activity className="w-8 h-8 text-indigo-500 animate-spin" /></div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-bold tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Nº Cuota</th>
                      <th className="pb-3">Vencimiento</th>
                      <th className="pb-3 text-right">Monto Base</th>
                      <th className="pb-3 text-center">Estado</th>
                      <th className="pb-3 text-center pr-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {cuotasOperacion.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-zinc-500">No hay cuotas registradas para esta operación.</td></tr>
                    ) : (
                      cuotasOperacion.map((cuota) => (
                        <tr key={cuota.id} className={`hover:bg-zinc-50/50 transition-colors ${cuota.estado === 'pagada' ? 'bg-zinc-50/30' : ''}`}>
                          <td className="py-4 pl-2 font-bold text-zinc-800">
                            {cuota.numero_cuota} <span className="text-[10px] text-zinc-400 uppercase ml-1">({cuota.tipo_cuota})</span>
                          </td>
                          <td className="py-4 font-semibold text-zinc-600">
                            {new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR')}
                          </td>
                          <td className="py-4 text-right font-black text-zinc-700">
                            ${Number(cuota.monto_base).toLocaleString('es-AR')}
                          </td>
                          <td className="py-4 text-center">
                            {cuota.estado === 'pagada' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <Check className="w-3 h-3" /> Pagada
                              </span>
                            ) : (
                              <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-center pr-2">
                            {cuota.estado === 'pendiente' ? (
                              <button onClick={() => handleCobrarCuota(cuota.id)} className="bg-zinc-900 text-white hover:bg-indigo-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                Registrar Pago
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-400">Pagada el {new Date(cuota.fecha_pago).toLocaleDateString('es-AR')}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
