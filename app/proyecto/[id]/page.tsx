'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calculator, Percent, DollarSign, Edit2, Check, X, Activity, Calendar, SlidersHorizontal, CheckCircle2, MapPin, Receipt, Wallet, TrendingUp, Search } from 'lucide-react'

const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ProyectoDetallePage({ params }: { params: { id: string } }) {
  // PESTAÑAS
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'financiador' | 'cobros' | 'ubicacion'>('pricing')
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: 'exito' })

  // ESTADOS MÓDULO DE PRICING
  const [proyecto, setProyecto] = useState<any>(null)
  const [configGlobal, setConfigGlobal] = useState<any>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  
  const [superficieVendible, setSuperficieVendible] = useState(5000)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [valorTerrenoUSD, setValorTerrenoUSD] = useState(0)
  const [margenObjetivo, setMargenObjetivo] = useState(0.15)
  const [canjeTierra, setCanjeTierra] = useState(0)
  const [canjeHonorarios, setCanjeHonorarios] = useState(0.14)
  const [pctAdmin, setPctAdmin] = useState(0.0589)
  const [pctImprevistos, setPctImprevistos] = useState(0.06)
  const [pctAjuste, setPctAjuste] = useState(0)
  
  const [fechaReferencia, setFechaReferencia] = useState(getTodayDate())
  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // ESTADOS MÓDULO INVENTARIO Y COBROS
  const [unidades, setUnidades] = useState<any[]>([])
  const [operaciones, setOperaciones] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [nuevaUnidad, setNuevaUnidad] = useState({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
  
  // ESTADOS DETALLE DE COBROS (MODAL)
  const [operacionSeleccionadaCobro, setOperacionSeleccionadaCobro] = useState<any>(null)
  const [cuotasOperacion, setCuotasOperacion] = useState<any[]>([])
  const [cargandoCuotas, setCargandoCuotas] = useState(false)

  // ESTADOS MÓDULO FINANCIADOR
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'PESOS'>('USD')
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState<number>(30)
  const [pagoEntrega, setPagoEntrega] = useState<number>(0)
  const [cuotasEspera, setCuotasEspera] = useState<number>(24)
  const [cuotasPosesion, setCuotasPosesion] = useState<number>(18)
  const [tasaPosesion, setTasaPosesion] = useState<number>(1.15)

  // CARGA DE DATOS GENERAL
  useEffect(() => {
    async function fetchData() {
      const [resProyecto, resConfig, resUnidades, resOperaciones] = await Promise.all([
        supabase.from('proyectos').select('*').eq('id', params.id).single(),
        supabase.from('configuracion_global').select('*').eq('id', 1).single(),
        supabase.from('unidades').select('*').eq('id_proyecto', params.id).order('identificador', { ascending: true }),
        supabase.from('operaciones').select('*').eq('id_proyecto', params.id).order('created_at', { ascending: false })
      ])
      
      if (resProyecto.data) {
        setProyecto(resProyecto.data)
        
        // Cargar TODOS los parámetros directamente de la memoria del proyecto
        if (resProyecto.data.superficie_vendible_m2) setSuperficieVendible(resProyecto.data.superficie_vendible_m2)
        if (resProyecto.data.valor_terreno_usd != null) setValorTerrenoUSD(resProyecto.data.valor_terreno_usd)
        if (resProyecto.data.gastos_admin != null) setPctAdmin(resProyecto.data.gastos_admin)
        if (resProyecto.data.imprevistos != null) setPctImprevistos(resProyecto.data.imprevistos)
        if (resProyecto.data.pct_ajuste != null) setPctAjuste(resProyecto.data.pct_ajuste)
        
        if (resProyecto.data.costo_duro_m2 != null) setCostoDuroM2(resProyecto.data.costo_duro_m2)
        if (resProyecto.data.margen_objetivo != null) setMargenObjetivo(resProyecto.data.margen_objetivo)
        if (resProyecto.data.canje_tierra != null) setCanjeTierra(resProyecto.data.canje_tierra)
        if (resProyecto.data.canje_honorarios != null) setCanjeHonorarios(resProyecto.data.canje_honorarios)
      }
      
      if (resConfig.data) setConfigGlobal(resConfig.data)
      if (resUnidades.data) setUnidades(resUnidades.data)
      if (resOperaciones.data) setOperaciones(resOperaciones.data)
    }
    fetchData()
  }, [params.id])

  // LÓGICA PRICING
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
    
    // 1. Guardar la configuración actual en la tabla principal del proyecto (Memoria Persistente)
    await supabase.from('proyectos').update({ 
      superficie_vendible_m2: superficieVendible, 
      gastos_admin: pctAdmin, 
      imprevistos: pctImprevistos, 
      pct_ajuste: pctAjuste, 
      valor_terreno_usd: valorTerrenoUSD,
      costo_duro_m2: costoDuroM2,
      margen_objetivo: margenObjetivo,
      canje_tierra: canjeTierra,
      canje_honorarios: canjeHonorarios
    }).eq('id', proyecto.id)

    // 2. Guardar el Snapshot en el historial
    const { data: registroExistente } = await supabase.from('historial_versiones_proyecto').select('id').eq('id_proyecto', proyecto.id).eq('fecha_referencia', fechaReferencia).maybeSingle()
    const datosAguardar = { 
      tipo_cambio: configGlobal.tipo_cambio, costo_duro_m2: costoDuroM2, valor_terreno_usd: valorTerrenoUSD, 
      canje_tierra_porcentaje: canjeTierra, margen_objetivo: margenObjetivo, resultado_metros_libres: resultados.metrosLibres, 
      resultado_costo_integral_total_usd: resultados.ticket.totalCostoVivienda, resultado_precio_promedio_usd: resultados.precioSugeridoUSD, pct_ajuste: pctAjuste 
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
    else mostrarNotificacion('Parámetros guardados y Corte fijado exitosamente')
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

  // LÓGICA STOCK Y FINANCIADOR
  const unidadesDisponibles = unidades.filter((u) => u.estado === 'disponible')
  const m2Disponibles = unidadesDisponibles.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0)
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
      id_proyecto: params.id, identificador: nuevaUnidad.identificador, superficie_m2: Number(nuevaUnidad.superficie_m2), estado: nuevaUnidad.estado, porcentaje_aplicar: Number(nuevaUnidad.porcentaje_aplicar || 100),
    }]).select()
    if (!error && data) {
      setUnidades([...unidades, data[0]])
      setNuevaUnidad({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
      mostrarNotificacion('Unidad agregada correctamente')
    }
  }

  const unidadFinanciar = unidadesDisponibles.find(u => u.id === unidadSeleccionada)
  const precioListaUSD = unidadFinanciar ? (unidadFinanciar.precio_lista_usd && Number(unidadFinanciar.precio_lista_usd) > 0 ? Number(unidadFinanciar.precio_lista_usd) : Number(unidadFinanciar.superficie_m2) * precioBaseActualUSD * (Number(unidadFinanciar.porcentaje_aplicar || 100) / 100)) : 0
  const precioMoneda = moneda === 'USD' ? precioListaUSD : precioListaUSD * tcActivoActual
  const montoAnticipo = precioMoneda * (porcentajeAnticipo / 100)
  const saldoAFinanciar = Math.max(0, precioMoneda - montoAnticipo - pagoEntrega)
  const cuotasEquivalentes = cuotasEspera + (cuotasPosesion * tasaPosesion)
  const valorCuotaEspera = cuotasEquivalentes > 0 ? (saldoAFinanciar / cuotasEquivalentes) : 0
  const valorCuotaPosesion = valorCuotaEspera * tasaPosesion

  const handleRegistrarVenta = async () => {
    if (!unidadSeleccionada) return alert("Seleccione una unidad.")
    if (!window.confirm("¿Confirmar venta y generar Cuenta Corriente?")) return
    const { data: opData, error: opError } = await supabase.from('operaciones').insert([{ id_proyecto: params.id, id_unidad: unidadSeleccionada, moneda: moneda, precio_total: precioMoneda, monto_anticipo: montoAnticipo, pago_entrega: pagoEntrega, saldo_financiado: saldoAFinanciar, cliente_nombre: 'Cliente Nuevo' }]).select()
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

  // LÓGICA DE COBRANZA
  const handleAbrirCobros = async (operacion: any) => {
    setOperacionSeleccionadaCobro(operacion)
    setCargandoCuotas(true)
    const { data, error } = await supabase.from('cuotas').select('*').eq('id_operacion', operacion.id).order('numero_cuota', { ascending: true })
    if (data) setCuotasOperacion(data)
    setCargandoCuotas(false)
  }

  const handleCobrarCuota = async (cuotaId: string) => {
    if (!window.confirm("¿Confirmar el cobro de esta cuota?")) return
    const hoy = getTodayDate()
    const { error } = await supabase.from('cuotas').update({ estado: 'pagada', fecha_pago: hoy }).eq('id', cuotaId)
    if (!error) {
       setCuotasOperacion(cuotasOperacion.map(c => c.id === cuotaId ? { ...c, estado: 'pagada', fecha_pago: hoy } : c))
       mostrarNotificacion("Cuota cobrada exitosamente")
    } else mostrarNotificacion("Error al registrar cobro", "error")
  }

  if (!proyecto || !configGlobal) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Cargando plataforma...</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 relative print:bg-white print:p-0 overflow-x-hidden">
      
      {/* NOTIFICADOR POPUP */}
      <div className={`fixed bottom-8 right-8 z-[100] flex items-center bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 transition-all duration-500 transform ${notificacion.mostrar ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'} print:hidden`}>
        {notificacion.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3" /> : <X className="w-5 h-5 text-rose-400 mr-3" />}
        <span className="font-medium text-sm">{notificacion.mensaje}</span>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 p-6 md:p-10 print:p-0">
        
        {/* ENCABEZADO PREMIUM */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors tracking-widest uppercase bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm hover:shadow-md">
              <ArrowLeft className="w-4 h-4 mr-2" /> Portafolio
            </Link>
            
            <div className="mt-2">
              {editandoNombre ? (
                <div className="flex items-center gap-3">
                  <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="text-4xl font-black text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full md:w-auto" autoFocus />
                  <button onClick={guardarNombre} className="text-white bg-emerald-500 hover:bg-emerald-600 p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"><Check className="w-5 h-5"/></button>
                  <button onClick={() => setEditandoNombre(false)} className="text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"><X className="w-5 h-5"/></button>
                </div>
              ) : (
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 flex items-center group tracking-tight leading-tight">
                  {proyecto.nombre}
                  <button onClick={() => { setNuevoNombre(proyecto.nombre); setEditandoNombre(true); }} className="ml-4 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all hover:rotate-12"><Edit2 className="w-6 h-6" /></button>
                </h1>
              )}
              <p className="text-slate-500 mt-2 font-medium text-lg">{proyecto.descripcion}</p>
            </div>
          </div>

          <div className="bg-white px-6 py-4 rounded-[20px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center min-w-[200px] justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">T.C. Activo Oficial</span>
              <span className="text-indigo-600 font-black text-2xl">${configGlobal.tipo_cambio}</span>
            </div>
            <Activity className="w-8 h-8 text-indigo-100" />
          </div>
        </div>

        {/* NAVEGACIÓN PESTAÑAS TIPO APP */}
        <div className="bg-slate-200/50 p-1.5 rounded-2xl inline-flex flex-wrap md:flex-nowrap gap-1 w-full md:w-auto overflow-x-auto print:hidden shadow-inner border border-slate-200/50">
          {(['pricing', 'stock', 'financiador', 'cobros', 'ubicacion'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold capitalize transition-all duration-300 rounded-xl whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-white text-indigo-700 shadow-[0_2px_10px_rgb(0,0,0,0.06)] scale-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95'
              }`}
            >
              {tab === 'pricing' && <Calculator className="w-4 h-4" />}
              {tab === 'stock' && <Building2 className="w-4 h-4" />}
              {tab === 'financiador' && <Wallet className="w-4 h-4" />}
              {tab === 'cobros' && <Receipt className="w-4 h-4" />}
              {tab === 'ubicacion' && <MapPin className="w-4 h-4" />}
              {tab === 'pricing' ? 'Pricing Model' : tab === 'stock' ? 'Inventario' : tab === 'financiador' ? 'Financiador' : tab === 'cobros' ? 'Cuentas Ctes' : 'Ubicación'}
            </button>
          ))}
        </div>

        {/* ============================== */}
        {/* 1. PESTAÑA PRICING             */}
        {/* ============================== */}
        {activeTab === 'pricing' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 print:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Panel de Configuración */}
            <div className="xl:col-span-8 bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <h2 className="text-base font-black text-slate-800 flex items-center uppercase tracking-widest">
                  <SlidersHorizontal className="w-5 h-5 mr-3 text-indigo-500" /> Parámetros Base
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="col-span-1 md:col-span-2 bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 flex items-center"><Building2 className="w-4 h-4 mr-2 text-indigo-500" /> Superficie Total Vendible</label>
                    <p className="text-xs text-slate-400">Metros cuadrados rentables del proyecto.</p>
                  </div>
                  <div className="relative">
                    <input type="number" value={superficieVendible} onChange={(e) => setSuperficieVendible(Number(e.target.value))} className="w-full md:w-48 rounded-xl border-none bg-white px-5 py-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-black text-xl text-right" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">m²</span>
                  </div>
                </div>
                
                {[
                  { label: 'Costo Duro Obra', value: costoDuroM2, setter: setCostoDuroM2, icon: <DollarSign className="w-4 h-4 text-slate-400"/>, prefix: 'USD' },
                  { label: 'Valor Terreno Fijo', value: valorTerrenoUSD, setter: setValorTerrenoUSD, icon: <MapPin className="w-4 h-4 text-slate-400"/>, prefix: 'USD' },
                  { label: 'Margen Objetivo', value: margenObjetivo, setter: setMargenObjetivo, icon: <Percent className="w-4 h-4 text-slate-400"/>, step: "0.01" },
                  { label: 'Canje Tierra', value: canjeTierra, setter: setCanjeTierra, icon: <Percent className="w-4 h-4 text-slate-400"/>, step: "0.01" },
                  { label: 'Canje Honorarios', value: canjeHonorarios, setter: setCanjeHonorarios, icon: <Percent className="w-4 h-4 text-slate-400"/>, step: "0.01" },
                  { label: 'Gastos Adm. Obra', value: pctAdmin, setter: setPctAdmin, icon: <Percent className="w-4 h-4 text-slate-400"/>, step: "0.001" },
                  { label: 'Imprevistos', value: pctImprevistos, setter: setPctImprevistos, icon: <Percent className="w-4 h-4 text-slate-400"/>, step: "0.001" },
                ].map((item, idx) => (
                  <div key={idx} className="group relative">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                      {item.icon} {item.label}
                    </label>
                    <div className="relative">
                      {item.prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{item.prefix}</span>}
                      <input type="number" step={item.step} value={item.value} onChange={(e) => item.setter(Number(e.target.value))} className={`w-full rounded-xl border-none bg-slate-50 ${item.prefix ? 'pl-12' : 'px-4'} py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-semibold group-hover:bg-white`} />
                    </div>
                  </div>
                ))}
                
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100/50 mt-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-indigo-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Pricing Premium/Discount</label>
                  <input type="number" step="0.01" value={pctAjuste} onChange={(e) => setPctAjuste(Number(e.target.value))} className="w-full rounded-xl border-none bg-white px-4 py-3 text-indigo-900 shadow-sm ring-1 ring-inset ring-indigo-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all font-black text-lg" />
                  <p className="text-[10px] text-indigo-500 mt-2 font-bold opacity-80">Ej: 0.05 suma +5% al precio final.</p>
                </div>
              </div>
            </div>

            {/* Panel de Resultados (Dark UI) */}
            <div className="xl:col-span-4 bg-slate-900 p-8 rounded-[32px] shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="relative z-10">
                <h2 className="text-[10px] font-black text-indigo-300 mb-6 tracking-widest uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Proyección Financiera
                </h2>
                {resultados && (
                  <div className="space-y-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Precio Sugerido Venta</p>
                      <div className="flex items-baseline">
                        <span className="text-xl font-bold text-slate-500 mr-2">USD</span>
                        <p className="text-5xl font-black text-white tracking-tighter">{Math.round(resultados.precioSugeridoUSD).toLocaleString()}</p>
                        <span className="text-sm font-bold text-slate-500 ml-2">/m²</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/50 p-6 rounded-3xl text-[13px] text-slate-300 border border-white/5 shadow-inner backdrop-blur-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between text-white font-bold pb-2 border-b border-white/10"><span>Construcción</span><span>${Math.round(resultados.ticket.construccion).toLocaleString()}</span></div>
                        {resultados.ticket.terrenoFijo > 0 && (
                          <div className="flex justify-between pl-2 text-indigo-300 font-semibold"><span>Terreno (Fijo)</span><span>${Math.round(resultados.ticket.terrenoFijo).toLocaleString()}</span></div>
                        )}
                        <div className="flex justify-between pl-2 opacity-80"><span>Imprevistos</span><span>{Math.round(resultados.ticket.imprevistos).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-2 opacity-80"><span>IVA</span><span>{Math.round(resultados.ticket.iva).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-2 opacity-80"><span>Administración</span><span>{Math.round(resultados.ticket.administracion).toLocaleString()}</span></div>
                        <div className="flex justify-between text-white font-bold border-y border-white/10 py-3 my-3"><span>Subtotal O.</span><span>${Math.round(resultados.ticket.subtotal1).toLocaleString()}</span></div>
                        
                        <div className="flex justify-between pl-2 opacity-80"><span>IIBB y TEM</span><span>{Math.round(resultados.ticket.iibbYTem).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-2 opacity-80"><span>Comercialización</span><span>{Math.round(resultados.ticket.comercializacion).toLocaleString()}</span></div>
                        
                        <div className="flex justify-between pl-2 opacity-80 mt-3 pt-3 border-t border-white/5"><span>Terreno Canje</span><span>{Math.round(resultados.ticket.terrenoCanje).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-2 opacity-80"><span>Hon. Canje</span><span>{Math.round(resultados.ticket.honorariosCanje).toLocaleString()}</span></div>
                        
                        <div className="flex justify-between items-center bg-indigo-600 -mx-6 p-6 mt-6 rounded-b-3xl text-white">
                          <span className="font-extrabold text-[11px] tracking-widest uppercase">Costo Total Obj.</span>
                          <span className="font-black text-xl">${Math.round(resultados.ticket.totalCostoVivienda).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 relative z-10 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Fecha del Corte
                  </label>
                  <input type="date" value={fechaReferencia} onChange={(e) => setFechaReferencia(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-5 py-4 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all backdrop-blur-sm" />
                </div>
                <button onClick={guardarHistorial} disabled={guardando} className={`w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl transition-all duration-300 ${guardando ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_25px_rgba(79,70,229,0.4)] hover:-translate-y-1'}`}>
                  <Save className="w-5 h-5 mr-2" /> {guardando ? 'Guardando...' : 'Guardar y Fijar Corte'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* 2. PESTAÑA STOCK               */}
        {/* ============================== */}
        {activeTab === 'stock' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="lg:col-span-4 bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
              <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Building2 className="w-4 h-4" /></div>
                Nueva Unidad
              </h3>
              <form onSubmit={handleAgregarUnidad} className="space-y-5">
                {[
                  { label: 'Identificador (Ej: 4º A)', value: nuevaUnidad.identificador, setter: (v:string)=>setNuevaUnidad({...nuevaUnidad, identificador: v}), type: 'text', req: true },
                  { label: 'Superficie (m²)', value: nuevaUnidad.superficie_m2, setter: (v:string)=>setNuevaUnidad({...nuevaUnidad, superficie_m2: v}), type: 'number', step: '0.01', req: true },
                  { label: '% Aplicar Precio Base', value: nuevaUnidad.porcentaje_aplicar, setter: (v:string)=>setNuevaUnidad({...nuevaUnidad, porcentaje_aplicar: v}), type: 'number', step: '0.1' },
                ].map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest">{field.label}</label>
                    <input type={field.type} step={field.step} value={field.value} onChange={(e) => field.setter(e.target.value)} required={field.req} className="w-full px-4 py-3 bg-slate-50 border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest">Estado Inicial</label>
                  <select value={nuevaUnidad.estado} onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, estado: e.target.value as any })} className="w-full px-4 py-3 bg-slate-50 border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all cursor-pointer">
                    <option value="disponible">✅ Disponible</option>
                    <option value="reservada">⏳ Reservada</option>
                    <option value="vendida">❌ Vendida</option>
                  </select>
                </div>
                <button type="submit" className="w-full mt-4 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl text-sm transition-colors shadow-lg hover:shadow-indigo-500/30">Registrar Unidad</button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  Inventario <span className="text-slate-400 font-medium tracking-normal">({unidades.length} unidades)</span>
                </h3>
                
                <div className="flex gap-4 flex-wrap">
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-3 shadow-sm">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3 opacity-50"/> {m2Disponibles.toLocaleString('es-AR')} m²</span>
                    <span className="w-px h-4 bg-emerald-200"></span>
                    <span className="font-black text-emerald-700">USD {Math.round(valorInventarioUSD).toLocaleString('es-AR')}</span>
                  </div>
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="todos">Todos los Estados</option>
                    <option value="disponible">Solo Disponibles</option>
                    <option value="reservada">Solo Reservadas</option>
                    <option value="vendida">Solo Vendidas</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 rounded-2xl border border-slate-100">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-slate-500 uppercase font-black tracking-widest text-[10px]">
                      <th className="py-4 px-6 rounded-tl-2xl">Unidad</th>
                      <th className="py-4 px-6">M²</th>
                      <th className="py-4 px-6">Coef.</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right rounded-tr-2xl">Valor Ref.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {unidadesFiltradas.length > 0 ? (
                      unidadesFiltradas.map((u) => {
                        const valorEstimado = u.precio_lista_usd && Number(u.precio_lista_usd) > 0 ? Number(u.precio_lista_usd) : Number(u.superficie_m2 || 0) * precioBaseActualUSD * (Number(u.porcentaje_aplicar || 100) / 100)
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-4 px-6 font-black text-slate-800">{u.identificador}</td>
                            <td className="py-4 px-6 font-medium text-slate-500">{u.superficie_m2}</td>
                            <td className="py-4 px-6 font-bold text-slate-600">{u.porcentaje_aplicar || 100}%</td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.estado === 'disponible' ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : u.estado === 'reservada' ? 'bg-amber-100/50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${u.estado === 'disponible' ? 'bg-emerald-500' : u.estado === 'reservada' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                                {u.estado}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-black text-slate-800">USD {Math.round(valorEstimado).toLocaleString('es-AR')}</td>
                          </tr>
                        )
                      })
                    ) : (<tr><td colSpan={5} className="py-12 text-center text-slate-400 font-medium">No se encontraron unidades.</td></tr>)}
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
          <div className="max-w-5xl mx-auto bg-white p-10 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:border-none print:shadow-none print:w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-base font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-widest border-b border-slate-100 pb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Wallet className="w-5 h-5" /></div>
              Simulador Comercial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 print:grid-cols-2">
              <div className="md:col-span-7 space-y-6">
                <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-6">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2"><Building2 className="w-4 h-4"/> Seleccionar Unidad</label>
                    <select value={unidadSeleccionada} onChange={(e) => setUnidadSeleccionada(e.target.value)} className="w-full px-4 py-4 bg-white border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-sm cursor-pointer print:appearance-none">
                      <option value="">Buscar unidad disponible...</option>
                      {unidadesDisponibles.map(u => <option key={u.id} value={u.id}>{u.identificador} — {u.superficie_m2} m²</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest">Moneda</label>
                      <select value={moneda} onChange={(e) => setMoneda(e.target.value as 'USD'|'PESOS')} className="w-full px-4 py-3 bg-white border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-sm cursor-pointer print:appearance-none">
                        <option value="USD">Dólares (USD)</option><option value="PESOS">Pesos (ARS)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest">Anticipo (%)</label>
                      <input type="number" value={porcentajeAnticipo} onChange={(e) => setPorcentajeAnticipo(Number(e.target.value))} className="w-full px-4 py-3 bg-white border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest">Cuotas (Espera)</label>
                      <input type="number" value={cuotasEspera} onChange={(e) => setCuotasEspera(Number(e.target.value))} className="w-full px-4 py-3 bg-white border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-2 uppercase tracking-widest">Cuotas (Posesión)</label>
                      <input type="number" value={cuotasPosesion} onChange={(e) => setCuotasPosesion(Number(e.target.value))} className="w-full px-4 py-3 bg-white border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-slate-900 p-8 rounded-[24px] shadow-2xl border border-slate-800 h-fit text-white relative overflow-hidden print:border-slate-300 print:text-black print:bg-white print:shadow-none">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none print:hidden"></div>
                
                <h4 className="text-[10px] font-black text-indigo-400 mb-6 uppercase tracking-widest flex items-center gap-2"><Receipt className="w-4 h-4"/> Resumen Propuesta</h4>
                
                <div className="space-y-5 relative z-10">
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Lista</span>
                    <span className="text-xl font-black">{moneda} {Math.round(precioMoneda).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anticipo Integrado</span>
                    <span className="text-xl font-black text-indigo-400">{moneda} {Math.round(montoAnticipo).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex flex-col bg-indigo-600/20 border border-indigo-500/30 p-4 rounded-xl mt-2">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Saldo a Financiar</span>
                    <span className="text-3xl font-black text-white">{moneda} {Math.round(saldoAFinanciar).toLocaleString('es-AR')}</span>
                  </div>
                  
                  <div className="pt-4 grid gap-3">
                    {cuotasEspera > 0 && (
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cuotasEspera} Ctas. Espera</span>
                        <span className="text-lg font-black">{moneda} {Math.round(valorCuotaEspera).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {cuotasPosesion > 0 && (
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cuotasPosesion} Ctas. Posesión</span>
                        <span className="text-lg font-black">{moneda} {Math.round(valorCuotaPosesion).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end gap-4 print:hidden">
              <button onClick={() => window.print()} disabled={!unidadSeleccionada} className="px-8 py-4 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><Receipt className="w-4 h-4"/> Imprimir Propuesta</button>
              <button onClick={handleRegistrarVenta} disabled={!unidadSeleccionada} className="px-8 py-4 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><Check className="w-4 h-4"/> Aprobar y Generar Contrato</button>
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* 4. PESTAÑA COBROS (CTA CTE)    */}
        {/* ============================== */}
        {activeTab === 'cobros' && (
          <div className="max-w-7xl mx-auto bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-3 uppercase tracking-widest">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Wallet className="w-5 h-5" /></div>
                Cartera Activa <span className="text-slate-400 font-medium tracking-normal ml-2">({operaciones.length} contratos)</span>
              </h3>
              <div className="relative w-64 hidden md:block">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar cliente..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none ring-1 ring-inset ring-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-500 uppercase font-black tracking-widest text-[10px]">
                    <th className="py-4 px-6 rounded-tl-2xl">Unidad</th>
                    <th className="py-4 px-6">Titular</th>
                    <th className="py-4 px-6">Condiciones</th>
                    <th className="py-4 px-6 text-right">Capital Total</th>
                    <th className="py-4 px-6 text-right">Saldo Deudor</th>
                    <th className="py-4 px-6 text-center rounded-tr-2xl">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {operaciones.length === 0 ? (
                    <tr><td colSpan={6} className="py-16 text-center text-slate-400 font-medium text-base">No hay contratos vigentes registrados.</td></tr>
                  ) : (
                    operaciones.map(op => {
                      const uni = unidades.find(u => u.id === op.id_unidad)
                      return (
                        <tr key={op.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-4 px-6 font-black text-slate-900">{uni ? uni.identificador : <span className="text-rose-400">Sin asignar</span>}</td>
                          <td className="py-4 px-6 font-bold text-slate-600 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xs uppercase">{op.cliente_nombre?.charAt(0) || '?'}</div>
                            {op.cliente_nombre || 'Desconocido'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800">{op.moneda}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ajuste: {op.indice_actualizacion || 'Fijo'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-slate-500">${Number(op.precio_total).toLocaleString('es-AR')}</td>
                          <td className="py-4 px-6 text-right font-black text-slate-900">${Number(op.saldo_financiado).toLocaleString('es-AR')}</td>
                          <td className="py-4 px-6 text-center">
                            <button onClick={() => handleAbrirCobros(op)} className="bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                              Abrir Cuenta
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

        {/* ============================== */}
        {/* 5. PESTAÑA UBICACION           */}
        {/* ============================== */}
        {activeTab === 'ubicacion' && (
          <div className="max-w-7xl mx-auto bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-base font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-widest border-b border-slate-100 pb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><MapPin className="w-5 h-5" /></div>
              Ubicación del Proyecto
            </h3>
            
            <div className="bg-slate-50 p-10 rounded-[24px] border border-slate-100 text-center">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-black text-slate-700 mb-2">Módulo de Ubicación</h4>
              <p className="text-slate-500 font-medium text-sm max-w-md mx-auto mb-6">
                Aquí puedes integrar el iframe de Google Maps o guardar las coordenadas geográficas de la obra.
              </p>
              <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 mx-auto">
                <Edit2 className="w-4 h-4" /> Configurar Ubicación
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================== */}
      {/* MODAL DE DETALLE Y COBRO DE CUOTAS         */}
      {/* ========================================== */}
      {operacionSeleccionadaCobro && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Header Modal */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                    Cuenta Corriente
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>Titular: <span className="text-slate-800">{operacionSeleccionadaCobro.cliente_nombre || 'Sin nombre'}</span></span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>Moneda: <span className="text-slate-800">{operacionSeleccionadaCobro.moneda}</span></span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOperacionSeleccionadaCobro(null)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Modal (Tabla) */}
            <div className="overflow-y-auto flex-1 p-8">
              {cargandoCuotas ? (
                <div className="flex justify-center items-center h-40">
                  <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-slate-500 uppercase font-black tracking-widest text-[10px]">
                        <th className="py-4 px-6">ID Cuota</th>
                        <th className="py-4 px-6">Vencimiento</th>
                        <th className="py-4 px-6 text-right">Capital a Integrar</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cuotasOperacion.length === 0 ? (
                        <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-medium">Cronograma de pagos vacío.</td></tr>
                      ) : (
                        cuotasOperacion.map((cuota) => (
                          <tr key={cuota.id} className={`hover:bg-slate-50/50 transition-colors ${cuota.estado === 'pagada' ? 'opacity-60 bg-slate-50/30' : ''}`}>
                            <td className="py-4 px-6 font-black text-slate-800">
                              Nº {cuota.numero_cuota} <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-2 bg-slate-100 px-2 py-0.5 rounded-md">{cuota.tipo_cuota}</span>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-600">
                              {new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR')}
                            </td>
                            <td className="py-4 px-6 text-right font-black text-slate-900">
                              ${Number(cuota.monto_base).toLocaleString('es-AR')}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {cuota.estado === 'pagada' ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                                  <Check className="w-3 h-3" /> Pagada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Pendiente
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {cuota.estado === 'pendiente' ? (
                                <button onClick={() => handleCobrarCuota(cuota.id)} className="bg-slate-900 text-white hover:bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/30">
                                  Registrar Cobro
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Pagada el {new Date(cuota.fecha_pago).toLocaleDateString('es-AR')}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
