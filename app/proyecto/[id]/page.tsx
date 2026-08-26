'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calculator, Percent, DollarSign, Edit2, Check, X, Activity, Calendar, SlidersHorizontal, CheckCircle2, MapPin, Wallet, TrendingUp, Clock, Tag, Box, LayoutGrid, Plus } from 'lucide-react'

const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  const [configGlobal, setConfigGlobal] = useState<any>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  
  // TABS: 'PRECIOS' | 'STOCK' | 'FINANCIADOR'
  const [activeTab, setActiveTab] = useState('PRECIOS')

  // Variables de PRECIOS
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

  // Variables de STOCK
  const [unidades, setUnidades] = useState<any[]>([])
  const [nuevaUnidadId, setNuevaUnidadId] = useState('')
  const [nuevaUnidadM2, setNuevaUnidadM2] = useState(50)

  // Variables de FINANCIADOR
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('')
  const [finPrecioVenta, setFinPrecioVenta] = useState(0)
  const [finAnticipoPct, setFinAnticipoPct] = useState(0.40)
  const [finCuotas, setFinCuotas] = useState(42)
  const [finTasa, setFinTasa] = useState(0.01)
  
  // ESTADO NUEVO: Para saber si el usuario escribió un descuento manual
  const [precioModificadoManual, setPrecioModificadoManual] = useState(false)

  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: 'exito' })

  useEffect(() => {
    async function fetchData() {
      const [resProyecto, resConfig, resHistorial, resUnidades] = await Promise.all([
        supabase.from('proyectos').select('*').eq('id', params.id).single(),
        supabase.from('configuracion_global').select('*').eq('id', 1).single(),
        // LA SOLUCIÓN: Ordenamos estrictamente por fecha_referencia para traer la última simulación real
        supabase.from('historial_versiones_proyecto').select('*').eq('id_proyecto', params.id).order('fecha_referencia', { ascending: false }).limit(1),
        supabase.from('unidades').select('*').eq('id_proyecto', params.id).order('identificador', { ascending: true })
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
        if (ultimo.fecha_referencia) setFechaReferencia(ultimo.fecha_referencia)
      }

      if (resUnidades.data) setUnidades(resUnidades.data)
    }
    fetchData()
  }, [params.id])

  // Actualización Dinámica del Financiador
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
        
        // Si no hemos escrito el precio a mano, que siga el valor real calculado del escenario
        if (!precioModificadoManual) {
          if (unidadSeleccionada) {
            const unidadElegida = unidades.find(u => u.id === unidadSeleccionada)
            if (unidadElegida) setFinPrecioVenta(Math.round(unidadElegida.superficie_m2 * res.precioSugeridoUSD))
          } else {
            setFinPrecioVenta(Math.round(res.precioSugeridoUSD))
          }
        }
      } catch (error) { console.error(error) }
    }
  }, [superficieVendible, costoDuroM2, valorTerrenoUSD, margenObjetivo, canjeTierra, canjeHonorarios, pctAdmin, pctImprevistos, pctAjuste, proyecto, configGlobal, unidadSeleccionada, unidades, precioModificadoManual])

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
      const { error } = await supabase.from('historial_versiones_proyecto').insert({...datosAguardar, id_proyecto: proyecto.id, fecha_referencia: fechaReferencia})
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

  // --- FUNCIONES DE STOCK ---
  async function agregarUnidad() {
    if (!nuevaUnidadId.trim()) return;
    const { data, error } = await supabase.from('unidades').insert({
      id_proyecto: proyecto.id,
      identificador: nuevaUnidadId,
      superficie_m2: nuevaUnidadM2,
      estado: 'disponible'
    }).select()

    if (data && data.length > 0) {
      setUnidades([...unidades, data[0]])
      setNuevaUnidadId('')
      setNuevaUnidadM2(50)
      mostrarNotificacion('Unidad agregada al inventario')
    } else {
      mostrarNotificacion('Error al agregar unidad', 'error')
    }
  }

  async function cambiarEstadoUnidad(id: string, nuevoEstado: string) {
    const { error } = await supabase.from('unidades').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
      setUnidades(unidades.map(u => u.id === id ? { ...u, estado: nuevoEstado } : u))
      mostrarNotificacion('Estado actualizado')
    }
  }

  // --- CÁLCULOS DEL FINANCIADOR ---
  const finAnticipoUSD = finPrecioVenta * finAnticipoPct;
  const finSaldo = finPrecioVenta - finAnticipoUSD;
  const finCostoFinanciero = finSaldo * finTasa * finCuotas;
  const finPrecioFinanciado = finPrecioVenta + finCostoFinanciero;
  const finSaldoAumentado = finPrecioFinanciado - finAnticipoUSD;
  const finCuotaBase = finCuotas > 0 ? (finSaldoAumentado / finCuotas) : 0;

  if (!proyecto || !configGlobal) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Sincronizando modelos...</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-zinc-100 p-6 md:p-10 font-sans text-zinc-900 selection:bg-indigo-100 relative">
      
      <div className={`fixed bottom-8 right-8 z-50 flex items-center bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-zinc-700 transition-all duration-500 transform ${notificacion.mostrar ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {notificacion.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3" /> : <X className="w-5 h-5 text-rose-400 mr-3" />}
        <span className="font-medium text-sm">{notificacion.mensaje}</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ENCABEZADO GLOBAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <p className="text-zinc-500 mt-2 font-medium">{proyecto.descripcion || "Panel Integral del Proyecto"}</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-3">T.C. Activo</span>
            <span className="text-indigo-600 font-black text-lg">${configGlobal.tipo_cambio}</span>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex space-x-2 border-b border-zinc-200/80 mb-8 pb-px overflow-x-auto">
          <button onClick={() => setActiveTab('PRECIOS')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'PRECIOS' ? 'bg-white text-indigo-600 border-t border-l border-r border-zinc-200/80' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'}`}>
            <Tag className="w-4 h-4 mr-2" /> PRICING (COSTOS)
          </button>
          <button onClick={() => setActiveTab('STOCK')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'STOCK' ? 'bg-white text-indigo-600 border-t border-l border-r border-zinc-200/80' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'}`}>
            <LayoutGrid className="w-4 h-4 mr-2" /> STOCK (UNIDADES)
          </button>
          <button onClick={() => setActiveTab('FINANCIADOR')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'FINANCIADOR' ? 'bg-white text-indigo-600 border-t border-l border-r border-zinc-200/80' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'}`}>
            <Wallet className="w-4 h-4 mr-2" /> FINANCIADOR (VENTAS)
          </button>
        </div>

        {/* CONTENIDO: PESTAÑA PRECIOS */}
        {activeTab === 'PRECIOS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
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
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-zinc-950 p-8 rounded-3xl shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-[11px] font-bold text-zinc-400 mb-6 tracking-widest uppercase">Precio Promedio de Contado (m²)</h2>
                  {resultados && (
                    <div className="space-y-4">
                      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
                        <div className="flex items-baseline">
                          <span className="text-xl font-bold text-zinc-400 mr-2">USD</span>
                          <p className="text-4xl font-black text-white tracking-tight">{Math.round(resultados.precioSugeridoUSD).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="bg-zinc-900 p-5 rounded-2xl font-mono text-[13px] text-zinc-400 border border-zinc-800 shadow-inner">
                        <div className="flex justify-between text-white font-bold mb-2"><span>CONSTRUCCION (100% m²)</span><span>${Math.round(resultados.ticket.construccion).toLocaleString()}</span></div>
                        {resultados.ticket.terrenoFijo > 0 && <div className="flex justify-between pl-3 text-emerald-400 font-semibold"><span>Terreno (Pago Fijo)</span><span>${Math.round(resultados.ticket.terrenoFijo).toLocaleString()}</span></div>}
                        <div className="flex justify-between pl-3"><span>Imprevistos</span><span>{Math.round(resultados.ticket.imprevistos).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-3"><span>IVA</span><span>{Math.round(resultados.ticket.iva).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-3"><span>Administración</span><span>{Math.round(resultados.ticket.administracion).toLocaleString()}</span></div>
                        <div className="flex justify-between text-white font-bold border-y border-zinc-700/50 py-2 my-2"><span>Subtotal 1 (Costos)</span><span>${Math.round(resultados.ticket.subtotal1).toLocaleString()}</span></div>
                        
                        <div className="flex justify-between pl-3"><span>IIBB y TEM</span><span>{Math.round(resultados.ticket.iibbYTem).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-3"><span>Comercializ.</span><span>{Math.round(resultados.ticket.comercializacion).toLocaleString()}</span></div>
                        <div className="flex justify-between text-white font-bold border-y border-zinc-700/50 py-2 my-2"><span>Subtotal 2 (Caja)</span><span>${Math.round(resultados.ticket.subtotal2).toLocaleString()}</span></div>
                        
                        <div className="mt-4 pt-3 border-t border-dashed border-zinc-700/50 text-[11px] text-zinc-500">
                          <p className="mb-2 font-bold text-zinc-400">INFO: CANJES (A COSTO DE OBRA)</p>
                          <div className="flex justify-between"><span>Terreno (Ya incl.)</span><span>${Math.round(resultados.ticket.terrenoCanje).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Honorarios (Ya incl.)</span><span>${Math.round(resultados.ticket.honorariosCanje).toLocaleString()}</span></div>
                        </div>

                        <div className="flex justify-between text-emerald-400 font-bold bg-zinc-950 -mx-5 p-5 mt-4 border-t border-emerald-500/20 rounded-b-2xl">
                          <span>TOTAL COSTO PROYECTO</span><span>${Math.round(resultados.ticket.totalCostoVivienda).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200/60">
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Fecha del Corte</label>
                  <input type="date" value={fechaReferencia} onChange={(e) => setFechaReferencia(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <button onClick={guardarHistorial} disabled={guardando} className={`w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl transition-all duration-300 ${guardando ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98]'}`}>
                  <Save className="w-5 h-5 mr-2" /> {guardando ? 'Guardando...' : 'Fijar Corte Mensual'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO: PESTAÑA STOCK */}
        {activeTab === 'STOCK' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
                <h2 className="text-sm font-bold text-zinc-800 flex items-center uppercase tracking-widest mb-6">
                  <Plus className="w-5 h-5 mr-3 text-indigo-500" /> Agregar Unidad
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Identificador (Ej: 4º A)</label>
                    <input type="text" value={nuevaUnidadId} onChange={(e) => setNuevaUnidadId(e.target.value)} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-indigo-600 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Superficie (m²)</label>
                    <input type="number" value={nuevaUnidadM2} onChange={(e) => setNuevaUnidadM2(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-indigo-600 font-bold" />
                  </div>
                  <button onClick={agregarUnidad} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 mt-2">Guardar en Inventario</button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
              <h2 className="text-sm font-bold text-zinc-800 flex items-center uppercase tracking-widest mb-6">
                <LayoutGrid className="w-5 h-5 mr-3 text-indigo-500" /> Inventario de Unidades ({unidades.length})
              </h2>
              {unidades.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                  <p className="text-zinc-400 font-medium">No hay unidades cargadas en este proyecto.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[600px] rounded-2xl border border-zinc-200 shadow-inner">
                  <table className="w-full text-left bg-white">
                    <thead className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200">Unidad</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200">Superficie</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200">Valor Estimado</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidades.map((u) => (
                        <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="py-4 px-4 font-black text-zinc-800">{u.identificador}</td>
                          <td className="py-4 px-4 font-medium text-zinc-500">{u.superficie_m2} m²</td>
                          <td className="py-4 px-4 font-bold text-emerald-600">${resultados ? Math.round(u.superficie_m2 * resultados.precioSugeridoUSD).toLocaleString() : 0}</td>
                          <td className="py-4 px-4">
                            <select 
                              value={u.estado} 
                              onChange={(e) => cambiarEstadoUnidad(u.id, e.target.value)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg outline-none cursor-pointer border-0 ring-1 ring-inset ${u.estado === 'disponible' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : u.estado === 'reservada' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}
                            >
                              <option value="disponible">Disponible</option>
                              <option value="reservada">Reservada</option>
                              <option value="vendida">Vendida</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO: PESTAÑA FINANCIADOR */}
        {activeTab === 'FINANCIADOR' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100">
                <h2 className="text-sm font-bold text-zinc-800 flex items-center uppercase tracking-widest">
                  <Calculator className="w-5 h-5 mr-3 text-emerald-500" /> Simulador de Venta a Cliente
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mb-8">
                
                {/* SELECTOR DE UNIDAD */}
                <div className="col-span-1 md:col-span-2 bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-3 flex items-center"><Box className="w-4 h-4 mr-2" /> 1. Elegir Unidad a Vender</label>
                  <select 
                    value={unidadSeleccionada}
                    onChange={(e) => {
                      const idUnidad = e.target.value;
                      setUnidadSeleccionada(idUnidad);
                      setPrecioModificadoManual(false); // Reseteamos la traba de edición manual
                      if (idUnidad && resultados) {
                        const unidadElegida = unidades.find(u => u.id === idUnidad);
                        if (unidadElegida) {
                          setFinPrecioVenta(Math.round(unidadElegida.superficie_m2 * resultados.precioSugeridoUSD));
                        }
                      } else if (resultados) {
                        setFinPrecioVenta(Math.round(resultados.precioSugeridoUSD));
                      }
                    }}
                    className="w-full rounded-xl border-0 bg-white px-5 py-4 text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-200 focus:ring-2 focus:ring-emerald-600 transition-all font-bold text-lg cursor-pointer"
                  >
                    <option value="">-- Cotización Manual / Genérica --</option>
                    {unidades.filter(u => u.estado === 'disponible').map(u => (
                      <option key={u.id} value={u.id}>Unidad {u.identificador} ({u.superficie_m2} m²)</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-zinc-400" /> 2. Valor de Venta (Contado USD)</label>
                  <input 
                    type="number" 
                    value={finPrecioVenta} 
                    onChange={(e) => {
                      setFinPrecioVenta(Number(e.target.value));
                      setPrecioModificadoManual(true); // Registra que escribiste a mano para no sobrescribirte
                    }} 
                    className="w-full rounded-xl border-0 bg-white px-5 py-4 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-emerald-600 transition-all font-black text-2xl" 
                  />
                  <p className="text-[10px] text-zinc-400 mt-2 font-medium">Puedes sobrescribir este valor si deseas aplicar un descuento manual al cliente.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-zinc-400" /> Anticipo Requerido</label>
                  <input type="number" step="0.01" value={finAnticipoPct} onChange={(e) => setFinAnticipoPct(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-emerald-600 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-zinc-400" /> Tasa de Interés Mensual</label>
                  <input type="number" step="0.001" value={finTasa} onChange={(e) => setFinTasa(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-emerald-600 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center"><Clock className="w-4 h-4 mr-2 text-zinc-400" /> Plazo Total (Meses)</label>
                  <input type="number" value={finCuotas} onChange={(e) => setFinCuotas(Number(e.target.value))} className="w-full rounded-xl border-0 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-emerald-600 transition-all font-semibold" />
                </div>
              </div>

              {/* TABLA DE CUOTAS */}
              {finCuotas > 0 && finPrecioVenta > 0 && (
                <div className="mt-8 border-t border-zinc-100 pt-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Proyección de Cuotas Base (USD)</h3>
                  <div className="overflow-hidden rounded-xl border border-zinc-200">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200">Cuota</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200 text-right">Saldo Inicial</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200 text-right">Amortización</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200 text-right text-emerald-600">Cuota Base</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="py-3 px-4 text-xs font-bold text-zinc-900">0 (Anticipo)</td>
                          <td className="py-3 px-4 text-xs text-zinc-500 text-right">-</td>
                          <td className="py-3 px-4 text-xs text-zinc-500 text-right">-</td>
                          <td className="py-3 px-4 text-sm font-black text-emerald-600 text-right">${Math.round(finPrecioVenta * finAnticipoPct).toLocaleString()}</td>
                        </tr>
                        {[...Array(Math.min(finCuotas, 5))].map((_, i) => (
                          <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                            <td className="py-3 px-4 text-xs font-bold text-zinc-900">Cuota {i + 1}</td>
                            <td className="py-3 px-4 text-xs text-zinc-500 text-right">${Math.round((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * (1 + (finTasa * finCuotas))).toLocaleString()}</td>
                            <td className="py-3 px-4 text-xs text-zinc-500 text-right">Sistema Lineal</td>
                            <td className="py-3 px-4 text-sm font-black text-emerald-600 text-right">${Math.round(((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * (1 + (finTasa * finCuotas))) / finCuotas).toLocaleString()}</td>
                          </tr>
                        ))}
                        {finCuotas > 5 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-xs font-bold text-zinc-400 tracking-widest uppercase bg-zinc-50">... {finCuotas - 5} cuotas restantes ...</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-3">* El valor de "Cuota Base" expresado en esta tabla no incluye las actualizaciones futuras por el índice de la Cámara Argentina de la Construcción (CAC). Al momento del pago, se le adicionará dicho coeficiente.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-emerald-950 p-8 rounded-3xl shadow-xl border border-emerald-900 relative overflow-hidden sticky top-8">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h2 className="text-[11px] font-bold text-emerald-400 mb-4 tracking-widest uppercase relative z-10 flex items-center">
                  <Wallet className="w-4 h-4 mr-2" /> Plan Sugerido
                </h2>
                
                <div className="bg-emerald-900/30 p-5 rounded-2xl font-mono text-[13px] text-emerald-200 border border-emerald-800/50 relative z-10">
                  <div className="flex justify-between mb-2"><span>Precio Contado</span><span>${Math.round(finPrecioVenta).toLocaleString()}</span></div>
                  <div className="flex justify-between mb-2"><span>Anticipo ({Math.round(finAnticipoPct*100)}%)</span><span>${Math.round(finPrecioVenta * finAnticipoPct).toLocaleString()}</span></div>
                  <div className="flex justify-between mb-4 border-b border-emerald-800/50 pb-2"><span>Saldo a Financiar</span><span>${Math.round(finPrecioVenta - (finPrecioVenta * finAnticipoPct)).toLocaleString()}</span></div>
                  
                  <div className="flex justify-between mb-2 text-rose-300"><span>Costo Financiero</span><span>+ ${Math.round((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * finTasa * finCuotas).toLocaleString()}</span></div>
                  
                  <div className="flex justify-between text-white font-bold bg-emerald-900 -mx-5 p-4 mt-4 border-t border-emerald-700">
                    <span>PRECIO FINANCIADO</span><span>${Math.round(finPrecioVenta + ((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * finTasa * finCuotas)).toLocaleString()}</span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-dashed border-emerald-800">
                    <p className="text-[10px] text-emerald-400 mb-1 uppercase tracking-widest text-center">Estructura Comercial</p>
                    <div className="bg-black/20 p-4 rounded-xl text-center">
                      <p className="text-white font-bold text-lg mb-1">1 Anticipo de ${Math.round(finPrecioVenta * finAnticipoPct).toLocaleString()}</p>
                      <p className="text-emerald-300 text-sm font-medium">+ {finCuotas} Cuotas de ${finCuotas > 0 ? Math.round(((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * (1 + (finTasa * finCuotas))) / finCuotas).toLocaleString() : 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
