'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

// Definimos la estructura de datos del proyecto
interface Proyecto {
  id: string
  nombre: string
  descripcion: string
}

export default function Home() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function fetchProyectos() {
      // Llamamos a la base de datos de Supabase
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) {
        console.error('Error cargando proyectos:', error)
      } else {
        setProyectos(data || [])
      }
      setCargando(false)
    }

    fetchProyectos()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Precioslink - Selector de Proyectos
        </h1>

        {cargando ? (
          <p className="text-gray-500">Cargando proyectos desde la base de datos...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proyectos.map((proyecto) => (
              <div 
                key={proyecto.id} 
                className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-2">
                    {proyecto.nombre}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {proyecto.descripcion}
                  </p>
                </div>
                
                {/* Botón corregido con Link */}
                <Link href={`/proyecto/${proyecto.id}`}>
                  <button className="w-full bg-blue-50 text-blue-700 py-2 rounded font-medium hover:bg-blue-100 transition-colors">
                    Configurar Precios
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
