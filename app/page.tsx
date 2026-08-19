'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Settings, Building2 } from 'lucide-react'

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])

  useEffect(() => {
    async function fetchProyectos() {
      const { data } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      if (data) setProyectos(data)
    }
    fetchProyectos()
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900">Precioslink - Proyectos</h1>
          <Link href="/configuracion" className="flex items-center bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-all font-medium shadow-sm">
            <Settings className="w-5 h-5 mr-2" /> Configuración Global
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proyectos.map((proyecto) => (
            <div key={proyecto.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-600 mb-2 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" /> {proyecto.nombre}
                </h2>
                <p className="text-slate-500 text-sm mb-6">{proyecto.descripcion}</p>
              </div>
              <Link href={`/proyecto/${proyecto.id}`} className="w-full bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl text-center border border-slate-200 hover:bg-slate-100 transition-colors">
                Configurar Precios
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
