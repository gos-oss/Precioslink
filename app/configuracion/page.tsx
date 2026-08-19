'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Settings, Save, ArrowLeft, Activity } from 'lucide-react'

export default function ConfiguracionGlobal() {
  const [config, setConfig] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      const { data } = await supabase.from('configuracion_global').select('*').eq('id', 1).single()
      if (data) setConfig(data)
    }
    fetchConfig()
  }, [])

  async function guardarCambios() {
    setGuardando(true)
    const { error } = await supabase.from('configuracion_global').update(config).eq('id', 1)
    setGuardando(false)
    if (error) alert('Error al guardar: ' + error.message)
    else alert('¡Configuración global actualizada con éxito!')
  }

  if (!config) return (
    <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-zinc-400 animate-pulse" />
        <p className="text-zinc-500 font-medium tracking-wide uppercase text-sm">Cargando parámetros...</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F4F4F5] p-6 md:p-10 font-sans text-zinc-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div>
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 flex items-center tracking-tight">
            <Settings className="w-8 h-8 mr-4 text-indigo-500" />
            Parámetros Globales
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">Estas variables impactan en las simulaciones de todos los proyectos.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-zinc-200/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            
            <div className="col-span-1 md:col-span-2 bg-[#F4F4F5] p-6 rounded-2xl border border-zinc-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Tipo de Cambio (ARS/USD)</label>
              <input type="number" value={config.tipo_cambio} onChange={(e) => setConfig({...config, tipo_cambio: Number(e.target.value)})} className="w-full rounded-xl bg-white border-0 px-5 py-4 text-2xl font-black text-indigo-600 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Tasa IIBB (%)</label>
              <input type="number" step="0.001" value={config.tasa_iibb} onChange={(e) => setConfig({...config, tasa_iibb: Number(e.target.value)})} className="w-full rounded-xl bg-[#F4F4F5] border-0 px-4 py-3 font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Tasa TEM (%)</label>
              <input type="number" step="0.001" value={config.tasa_tem} onChange={(e) => setConfig({...config, tasa_tem: Number(e.target.value)})} className="w-full rounded-xl bg-[#F4F4F5] border-0 px-4 py-3 font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">IVA Construcción (%)</label>
              <input type="number" step="0.001" value={config.tasa_iva} onChange={(e) => setConfig({...config, tasa_iva: Number(e.target.value)})} className="w-full rounded-xl bg-[#F4F4F5] border-0 px-4 py-3 font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Comisión Inmobiliaria (%)</label>
              <input type="number" step="0.001" value={config.comision_venta} onChange={(e) => setConfig({...config, comision_venta: Number(e.target.value)})} className="w-full rounded-xl bg-[#F4F4F5] border-0 px-4 py-3 font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Gastos Administrativos (%)</label>
              <input type="number" step="0.001" value={config.gastos_admin} onChange={(e) => setConfig({...config, gastos_admin: Number(e.target.value)})} className="w-full rounded-xl bg-[#F4F4F5] border-0 px-4 py-3 font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Imprevistos de Obra (%)</label>
              <input type="number" step="0.001" value={config.imprevistos} onChange={(e) => setConfig({...config, imprevistos: Number(e.target.value)})} className="w-full rounded-xl bg-[#F4F4F5] border-0 px-4 py-3 font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all" />
            </div>

          </div>

          <button onClick={guardarCambios} disabled={guardando} className="mt-10 w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white transition-all shadow-lg active:scale-[0.98]">
            <Save className="w-5 h-5 mr-2" />
            {guardando ? 'Actualizando base de datos...' : 'Guardar Parámetros Maestros'}
          </button>
        </div>
      </div>
    </main>
  )
}
