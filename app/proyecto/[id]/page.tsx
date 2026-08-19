'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calculator, Percent, DollarSign, Coins, Edit2, Check, X } from 'lucide-react'

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  
  const [superficieVendible, setSuperficieVendible] = useState(5000)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [canjeHonorarios, setCanjeHonorarios] = useState(0.10)
  const [tipoCambio, setTipoCambio] = useState(1500)

  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function fetchProyecto() {
      const { data } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (data) {
        setProyecto(data)
        if (data.superficie_vendible_m2) {
          setSuperficieVendible(data.superficie_vendible_m2)
        }
      }
    }
    fetchProyecto()
  }, [params.id])

  useEffect(() => {
    if (proyecto) {
      const res = calcularPrecioSugerido({
        superficieVendible,
        costoDuroM2,
        canjeTierraPct: canjeTierra,
        canjeHonorariosPct: canjeHonorarios,
        tasaIIBB: 0.025,
        tasaTEM: 0.0125,
        comisionVenta: 0.035,
        margenObjetivo,
        tipoCambio
      })
      setResultados(res)
    }
  }, [proyecto, superficieVendible, costoDuroM2, margenObjetivo, canjeTierra, canjeHonorarios, tipoCambio])

  async function guardarHistorial() {
    if (!resultados || !proyecto) return
    setGuardando(true)

    const { error } = await supabase
      .from('historial_versiones_proyecto')
      .insert({
        id_proyecto: proyecto.id,
        tipo_cambio: tipoCambio,
        costo_duro_m2: costoDuroM2,
        canje_tierra_porcentaje: canjeTierra,
        margen_objetivo: margenObjetivo,
        resultado_metros_libres: resultados.metrosLibres,
        resultado_costo_integral_total_usd: resultados.ticket.totalCostoVivienda,
        resultado_precio_promedio_usd: resultados.precioSugeridoUSD
      })

    setGuardando(false)
    if (error) {
      alert('Hubo un error al guardar: ' + error.message)
    } else {
      alert('¡Escenario guardado exitosamente en el historial!')
    }
  }

  async function guardarNombre() {
    if (!nuevoNombre.trim()) return
    const { error } = await supabase.from('proyectos').update({ nombre: nuevoNombre }).eq('id', proyecto.id)
    if (!error) {
      setProyecto({ ...proyecto, nombre: nuevoNombre })
      setEditandoNombre(false)
    }
  }

  if (!proyecto) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium">Cargando entorno de simulación...</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Navegación y Título */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-3">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver al portafolio
            </Link>
            
            {editandoNombre ? (
              <div className="flex items-center mt-2">
                <Building2 className="w-8 h-8 mr-3 text-blue-500" />
                <input 
                  value={nuevoNombre} 
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="text-3xl font-extrabold text-slate-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                  autoFocus
                />
                <button onClick={guardarNombre} className="ml-3 text-green-600 hover:bg-green-50 p-2 rounded"><Check className="w-5 h-5"/></button>
                <button onClick={() => setEditandoNombre(false)} className="ml-1 text-red-500 hover:bg-red-50 p-2 rounded"><X className="w-5 h-5"/></button>
              </div>
            ) : (
              <h1 className="text-4xl font-extrabold text-slate-900 flex items-center mt-2 group">
                <Building2 className="w-8 h-8 mr-3 text-blue-500" />
                {proyecto.nombre}
                <button onClick={() => { setNuevoNombre(proyecto.nombre); setEditandoNombre(true); }} className="ml-4 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-5 h-5" />
                </button>
              </h1>
            )}
            
            <p className="text-slate-500 mt-2 text-lg">{proyecto.descripcion}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PANEL DE INPUTS */}
          <div className="lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-slate-400" />
                Variables de Negocio
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              <div className="col-span-1 md:col-span-2 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-blue-500" /> Superficie Vendible (m²)
                </label>
                <input 
                  type="number" 
                  value={superficieVendible} 
                  onChange={(e) => setSuperficieVendible(Number(e.target.value))} 
                  className="w-full rounded-lg border-0 bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-blue-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all font-medium text-lg" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1 text-slate-400" /> Costo Duro Obra (USD/m²)
                </label>
                <input type="number" value={costoDuroM2} onChange={(e) => setCostoDuroM2(Number(e.target.value))} className="w-full rounded-lg border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Coins className="w-4 h-4 mr-1 text-slate-400" /> Tipo de Cambio (ARS/USD)
                </label>
                <input type="number" value={tipoCambio} onChange={(e) => setTipoCambio(Number(e.target.value))} className="w-full rounded-lg border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Percent className="w-4 h-4 mr-1 text-slate-400" /> Margen Objetivo
                </label>
                <input type="number" step="0.01" value={margenObjetivo} onChange={(e) => setMargenObjetivo(Number(e.target.value))} className="w-full rounded-lg border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Percent className="w-4 h-4 mr-1 text-slate-400" /> Canje Tierra
                </label>
                <input type="number" step="0.01" value={canjeTierra} onChange={(e) => setCanjeTierra(Number(e.target.value))} className="w-full rounded-lg border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Percent className="w-4 h-4 mr-1 text-slate-400" /> Canje Honorarios
                </label>
                <input type="number" step="0.01" value={canjeHonorarios} onChange={(e) => setCanjeHonorarios(Number(e.target.value))} className="w-full rounded-lg border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all" />
              </div>
            </div>
          </div>

          {/* PANEL DE RESULTADOS */}
          <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <h2 className="text-lg font-medium text-slate-300 mb-8 tracking-wide uppercase text-sm">Proyección Financiera</h2>
              
              {resultados && (
                <div className="space-y-4 text-sm">
                  {/* Resumen de Precio */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Precio Sugerido Promedio</p>
                    <div className="flex items-baseline">
                      <span className="text-xl font-semibold text-slate-400 mr-1">USD</span>
                      <p className="text-4xl font-extrabold text-white">
                        {Math.round(resultados.precioSugeridoUSD).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Detallado */}
                  <div className="bg-slate-950/50 p-4 rounded-lg font-mono text-slate-300">
                    <div className="flex justify-between text-white font-semibold mb-1">
                      <span>CONSTRUCCION</span><span>USD {Math.round(resultados.ticket.construccion).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pl-4 text-slate-400"><span>Imprevistos</span><span>{Math.round(resultados.ticket.imprevistos).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-4 text-slate-400"><span>IVA</span><span>{Math.round(resultados.ticket.iva).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-4 text-slate-400"><span>Administración</span><span>{Math.round(resultados.ticket.administracion).toLocaleString()}</span></div>
                    
                    <div className="flex justify-between text-white font-bold border-y border-slate-700 py-2 my-2">
                      <span>Subtotal</span><span>USD {Math.round(resultados.ticket.subtotal1).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between pl-4 text-slate-400"><span>IIBB y TEM</span><span>{Math.round(resultados.ticket.iibbYTem).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-4 text-slate-400"><span>Comercialización</span><span>{Math.round(resultados.ticket.comercializacion).toLocaleString()}</span></div>
                    
                    <div className="flex justify-between text-white font-bold border-y border-slate-700 py-2 my-2">
                      <span>Subtotal</span><span>USD {Math.round(resultados.ticket.subtotal2).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between pl-4 text-slate-400"><span>Terreno Canje</span><span>{Math.round(resultados.ticket.terrenoCanje).toLocaleString()}</span></div>
                    <div className="flex justify-between pl-4 text-slate-400"><span>Honorarios Canje</span><span>{Math.round(resultados.ticket.honorariosCanje).toLocaleString()}</span></div>
                    
                    <div className="flex justify-between text-emerald-400 font-bold bg-slate-900 -mx-4 p-4 mt-4 border-t border-emerald-900/50">
                      <span>TOTAL COSTO</span><span>USD {Math.round(resultados.ticket.totalCostoVivienda).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={guardarHistorial}
              disabled={guardando}
              className={`mt-10 relative z-10 w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl transition-all duration-200 ${
                guardando 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]'
              }`}
            >
              <Save className="w-5 h-5 mr-2" />
              {guardando ? 'Guardando...' : 'Guardar Escenario'}
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}
