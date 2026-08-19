'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calculator, Percent, DollarSign, Edit2, Check, X, Activity, Calendar, SlidersHorizontal, CheckCircle2, MapPin } from 'lucide-react'

const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  const [configGlobal, setConfigGlobal] = useState<any>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  
  const [superficieVendible, setSuperficieVendible] = useState(5000)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [valorTerrenoUSD, setValorTerrenoUSD] = useState(0) // NUEVO ESTADO
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [canjeHonorarios, setCanjeHonorarios] = useState(0.10)
  const [pctAdmin, setPctAdmin] = useState(0.0589)
  const [pctImprevistos, setPctImprevistos] = useState(0.06)
  const [pctAjuste, setPctAjuste] = useState(0)
  
  const [fechaReferencia, setFechaReferencia] = useState(getTodayDate())
  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)
  
  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: 'exito' })

  useEffect(() => {
    async function fetchData() {
      const [resProyecto, resConfig, resHistorial] = await Promise.all([
        supabase.from('proyectos').select('*').eq('id', params.id).single(),
        supabase.from('configuracion_global').select('*').eq('id', 1).single(),
        supabase.from('historial_versiones_proyecto').select('*').eq('id_proyecto', params.id).order('id', { ascending: false }).limit(1)
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
    }
    fetchData()
  }, [params.id])

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

    const { error } = await supabase.from('historial_versiones_proyecto').insert({
      id_proyecto: proyecto.id, tipo_cambio: configGlobal.tipo_cambio, costo_duro_m2: costoDuroM2, valor_terreno_usd: valorTerrenoUSD,
      canje_tierra_porcentaje: canjeTierra, margen_objetivo: margenObjetivo, resultado_metros_libres: resultados.metrosLibres,
      resultado_costo_integral_total_usd: resultados.ticket.totalCostoVivienda, resultado_precio_promedio_usd: resultados.precioSugeridoUSD,
      fecha_referencia: fechaReferencia, pct_ajuste: pctAjuste
    })
    
    setGuardando(false)
    if (error) mostrarNotificacion('Error: ' + error.message, 'error')
    else mostrarNotificacion('Escenario guardado exitosamente')
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
            <p className="text-zinc-500 mt-2 font-medium">{proyecto.descripcion}</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-3">T.C. Activo</span>
            <span className="text-indigo-600 font-black text-lg">${configGlobal.tipo_cambio}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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

              {/* NUEVA CAJA: VALOR TERRENO FIJO */}
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
                    {/* MOSTRAMOS EL TERRENO FIJO SI ES MAYOR A 0 */}
                    {resultados.ticket.terrenoFijo > 0 && (
                      <div className="flex justify-between pl-3 text-emerald-400 font-semibold"><span>Terreno (Pago Fijo)</span><span>${Math.round(resultados.ticket.terrenoFijo).toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between pl-3"><span>Imprevistos</span><span>{Math.round(resultados.ticket.imprevistos).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-3"><span>IVA</span><span>{Math.round(resultados.ticket.iva).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-3"><span>Administración</span><span>{Math.round(resultados.ticket.administracion).toLocaleString()}</span></div>
                    <div className="flex justify-between text-white font-bold border-y border-zinc-700/50 py-2 my-2"><span>Subtotal</span><span>${Math.round(resultados.ticket.subtotal1).toLocaleString()}</span></div>
                    
                    <div className="flex justify-between pl-3"><span>IIBB y TEM</span><span>{Math.round(resultados.ticket.iibbYTem).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-3"><span>Comercializ.</span><span>{Math.round(resultados.ticket.comercializacion).toLocaleString()}</span></div>
                    <div className="flex justify-between text-white font-bold border-y border-zinc-700/50 py-2 my-2"><span>Subtotal</span><span>${Math.round(resultados.ticket.subtotal2).toLocaleString()}</span></div>
                    
                    <div className="flex justify-between pl-3"><span>Terreno Canje</span><span>{Math.round(resultados.ticket.terrenoCanje).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-3"><span>Honorarios Canje</span><span>{Math.round(resultados.ticket.honorariosCanje).toLocaleString()}</span></div>
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
                <input 
                  type="date" 
                  value={fechaReferencia} 
                  onChange={(e) => setFechaReferencia(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <button onClick={guardarHistorial} disabled={guardando} className={`w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl transition-all duration-300 ${guardando ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] hover:-translate-y-1'}`}>
                <Save className="w-5 h-5 mr-2" />
                {guardando ? 'Guardando Corte...' : 'Fijar Corte Mensual'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
