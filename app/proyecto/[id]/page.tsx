'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  
  // Variables de entrada (Inputs)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [tipoCambio, setTipoCambio] = useState(1500)

  // Resultados y Estados
  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

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
        superficieVendible: proyecto.superficie_vendible_m2 || 5000,
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

  // Función para guardar en Supabase
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
        resultado_costo_integral_total_usd: resultados.costoIntegralTotal,
        resultado_precio_promedio_usd: resultados.precioSugeridoUSD
      })

    setGuardando(false)

    if (error) {
      alert('Hubo un error al guardar: ' + error.message)
    } else {
      alert('¡Escenario guardado exitosamente en el historial!')
    }
  }

  if (!proyecto) return <div className="p-8 text-gray-600">Cargando datos del proyecto...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Encabezado con botón para volver */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            ⚙️ Parámetros: {proyecto.nombre}
          </h1>
          <Link href="/">
            <button className="text-blue-600 hover:text-blue-800 font-medium underline">
              &larr; Volver a Proyectos
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PANEL DE INPUTS */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Ajuste de Variables</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Costo Duro Obra (USD/m²)</label>
                <input type="number" value={costoDuroM2} onChange={(e) => setCostoDuroM2(Number(e.target.value))} className="mt-1 block w-full rounded border border-gray-300 shadow-sm p-2 bg-gray-50 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Margen Objetivo (%)</label>
                <input type="number" step="0.01" value={margenObjetivo} onChange={(e) => setMargenObjetivo(Number(e.target.value))} className="mt-1 block w-full rounded border border-gray-300 shadow-sm p-2 bg-gray-50 focus:ring-blue-500 focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Ejemplo: 0.20 = 20%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">% Canje Tierra</label>
                <input type="number" step="0.01" value={canjeTierra} onChange={(e) => setCanjeTierra(Number(e.target.value))} className="mt-1 block w-full rounded border border-gray-300 shadow-sm p-2 bg-gray-50 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Cambio (ARS/USD)</label>
                <input type="number" value={tipoCambio} onChange={(e) => setTipoCambio(Number(e.target.value))} className="mt-1 block w-full rounded border border-gray-300 shadow-sm p-2 bg-gray-50 focus:ring-blue-500 focus:border-blue-500" />
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

                <button 
                  onClick={guardarHistorial}
                  disabled={guardando}
                  className={`mt-6 w-full font-bold py-3 px-4 rounded transition-colors ${
                    guardando ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {guardando ? 'Guardando...' : '💾 Guardar Escenario en Historial'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
