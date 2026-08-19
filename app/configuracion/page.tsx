'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Settings, Save, ArrowLeft } from 'lucide-react'

export default function ConfiguracionGlobal() {
  const [config, setConfig] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // Cargar los datos actuales
  useEffect(() => {
    async function fetchConfig() {
      const { data } = await supabase.from('configuracion_global').select('*').eq('id', 1).single()
      if (data) setConfig(data)
    }
    fetchConfig()
  }, [])

  // Guardar los cambios
  async function guardarCambios() {
    setGuardando(true)
    const { error } = await supabase.from('configuracion_global').update(config).eq('id', 1)
    setGuardando(false)
    
    if (error) alert('Error al guardar: ' + error.message)
    else alert('¡Configuración global actualizada con éxito!')
  }

  if (!config) return <div className="p-12 text-center text-slate-500">Cargando panel de control...</div>

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al portafolio
        </Link>
        
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center mb-8">
          <Settings className="w-8 h-8 mr-3 text-slate-700" />
          Parámetros Globales
        </h1>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Variables Macros */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Cambio (ARS/USD)</label>
              <input type="number" value={config.tipo_cambio} onChange={(e) => setConfig({...config, tipo_cambio: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 text-lg font-medium" />
            </div>

            {/* Impuestos y Gastos */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tasa IIBB (%)</label>
              <input type="number" step="0.001" value={config.tasa_iibb} onChange={(e) => setConfig({...config, tasa_iibb: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tasa TEM (%)</label>
              <input type="number" step="0.001" value={config.tasa_tem} onChange={(e) => setConfig({...config, tasa_tem: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">IVA Construcción (%)</label>
              <input type="number" step="0.001" value={config.tasa_iva} onChange={(e) => setConfig({...config, tasa_iva: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Comisión Inmobiliaria (%)</label>
              <input type="number" step="0.001" value={config.comision_venta} onChange={(e) => setConfig({...config, comision_venta: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Gastos Administrativos (%)</label>
              <input type="number" step="0.001" value={config.gastos_admin} onChange={(e) => setConfig({...config, gastos_admin: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Imprevistos de Obra (%)</label>
              <input type="number" step="0.001" value={config.imprevistos} onChange={(e) => setConfig({...config, imprevistos: Number(e.target.value)})} className="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" />
            </div>

          </div>

          <button onClick={guardarCambios} disabled={guardando} className="mt-8 w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all">
            <Save className="w-5 h-5 mr-2" />
            {guardando ? 'Actualizando sistema...' : 'Guardar Parámetros Maestros'}
          </button>
        </div>
      </div>
    </main>
  )
}
