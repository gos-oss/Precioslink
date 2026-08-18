'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  
  // Variables de entrada (Inputs)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [tipoCambio, setTipoCambio] = useState(1500)

  // Resultados
  const [resultados, setResultados] = useState<any>(null)

  useEffect(() => {
    async function fetchProyecto() {
      const { data } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (data) setProyecto(data)
    }
    fetchProyecto()
  }, [params.id])

  // Recalcular cada vez que cambia un input
  useEffect(() => {
    if (proyecto) {
      const res = calcularPrecioSugerido({
        superficieVendible: proyecto.superficie_vendible_m2 || 5000, // Valor por defecto si está vacío
        costoDuroM2: costoDuroM2,
        canjeTierraPct: canjeTierra,
        canjeHonorariosPct: 0.10, // Fijo por ahora
        tasaIIBB: 0.025,
        tasaTEM: 0.0125,
        comisionVenta: 0.035,
        margenObjetivo: margenObjetivo,
        tipoCambio: tipoCambio
      })
      setResultados(res)
    }
  }, [proyecto, costoDuroM2, margenObjetivo, canjeTierra, tipoCambio])

  if (!proyecto) return <div className="p-8">Cargando datos del proyecto...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* PANEL DE INPUTS */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Parámetros: {proyecto.nombre}</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Costo Duro Obra (USD/m²)</label>
              <input type="number" value={costoDuroM2} onChange={(e) => setCostoDuroM2(Number(e.target.value))} className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Margen Objetivo (%)</label>
              <input type="number" step="0.01" value={margenObjetivo} onChange={(e) => setMargenObjetivo(Number(e.target.value))} className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Ejemplo: 0.20 = 20%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">% Canje Tierra</label>
              <input type="number" step="0.01" value={canjeTierra} onChange={(e) => setCanjeTierra(Number(e.target.value))} className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Cambio (ARS/USD)</label>
              <input type="number" value={tipoCambio} onChange={(e) => setTipoCambio(Number(e.target.value))} className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 bg-gray-50" />
            </div>
          </div>
        </div>

        {/* PANEL DE RESULTADOS */}
        <div className="bg-blue-900 p-6 rounded-lg shadow text-white flex flex-col justify-center">
          <h2 className="text-xl font-semibold mb-6 text-blue-200">Resultados del Modelo</h2>
          
          {resultados && (
            <div className="space-y-6">
              <div>
                <p className="text-blue-300 text-sm">Precio Sugerido Promedio (USD/m²)</p>
                <p className="text-5xl font-bold">USD {Math.round(resultados.precioSugeridoUSD).toLocaleString()}</p>
              </div>
              
              <div>
                <p className="text-blue-300 text-sm">Precio en Pesos (ARS/m²)</p>
                <p className="text-3xl font-medium">$ {Math.round(resultados.precioSugeridoARS).toLocaleString()}</p>
              </div>

              <div className="pt-4 border-t border-blue-700">
                <p className="text-sm text-blue-200">Metros Libres para Venta: <span className="font-bold">{Math.round(resultados.metrosLibres)} m²</span></p>
              </div>

              <button className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded transition-colors">
                💾 Guardar Escenario en Historial
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
