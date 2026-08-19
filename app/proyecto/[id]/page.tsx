'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  
  // Variables de entrada (Ahora TODAS son editables)
  const [superficieVendible, setSuperficieVendible] = useState(5000)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [canjeHonorarios, setCanjeHonorarios] = useState(0.10)
  const [tipoCambio, setTipoCambio] = useState(1500)

  // Resultados y Estados
  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // Cargar datos iniciales del proyecto
  useEffect(() => {
    async function fetchProyecto() {
      const { data } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (data) {
        setProyecto(data)
        // Si el proyecto ya tiene metros cargados en la BD, los usamos como valor inicial
        if (data.superficie_vendible_m2) {
          setSuperficieVendible(data.superficie_vendible_m2)
        }
      }
    }
    fetchProyecto()
  }, [params.id])

  // Recalcular en tiempo real cada vez que tocas un número
  useEffect(() => {
    if (proyecto) {
      const res = calcularPrecioSugerido({
        superficieVendible: superficieVendible,
        costoDuroM2: costoDuroM2,
        canjeTierraPct: canjeTierra,
        canjeHonorariosPct: canjeHonorarios,
        tasaIIBB: 0.025,
        tasaTEM: 0.0125,
        comisionVenta: 0.035,
        margenObjetivo: margenObjetivo,
        tipoCambio: tipoCambio
      })
      setResultados(res)
    }
  }, [proyecto, superficieVendible, costoDuroM2, margenObjetivo, canjeTierra, canjeHonorarios, tipoCambio])

  // Guardar en Historial
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
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              ⚙️ Simulador: {proyecto.nombre}
            </h1>
            <p className="text-gray-500 mt-1">{proyecto.descripcion}</p>
          </div>
          <Link href="/">
            <button className="text-blue-600 hover:text-blue-800 font-medium underline">
              &larr; Volver a Proyectos
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PANEL DE INPUTS (Ocupa 2 columnas) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Ajuste de Variables</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <label className="block text-sm font-bold text-blue-900 mb-1">Superficie Vendible (m²)</label>
                <input type="number" value={superficieVendible} onChange={(e) => setSuperficieVendible(Number(e.target.value))} className="w-full rounded border border-gray-300 p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo Duro Obra (USD/m²)</label>
                <input type="number" value={costoDuroM2} onChange={(e) => setCostoDuroM2(Number(e.target.value))} className="w-full rounded border border-gray-300 p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margen Objetivo (%)</label>
                <input type="number" step="0.01" value={margenObjetivo} onChange={(e) => setMargenObjetivo(Number(e.target.value))} className="w-full rounded border border-gray-300 p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Ej: 0.20 = 20%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% Canje Tierra</label>
                <input type="number" step="0.01" value={canjeTierra} onChange={(e) => setCanjeTierra(Number(e.target.value))} className="w-full rounded border border-gray-300 p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Ej: 0.13 = 13%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% Canje Honorarios</label>
                <input type="number" step="0.01" value={canjeHonorarios} onChange={(e) => setCanjeHonorarios(Number(e.target.value))} className="w-full rounded border border-gray-300 p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Ej: 0.10 = 10%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio (ARS/USD)</label>
                <input type="number" value={tipoCambio} onChange={(e) => setTipoCambio(Number(e.target.value))} className="w-full rounded border border-gray-300 p-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* PANEL DE RESULTADOS (Ocupa 1 columna) */}
          <div className="bg-slate-900 p-6 rounded-lg shadow text-white flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-6 text-slate-200 border-b border-slate-700 pb-2">Resultados</h2>
              
              {resultados && (
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Precio Sugerido (USD/m²)</p>
                    <p className="text-5xl font-bold text-green-400">USD {Math.round(resultados.precioSugeridoUSD).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Precio en Pesos (ARS/m²)</p>
                    <p className="text-3xl font-medium text-slate-100">$ {Math.round(resultados.precioSugeridoARS).toLocaleString()}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-300 flex justify-between">
                      <span>Metros Libres Venta:</span> 
                      <span className="font-bold text-white">{Math.round(resultados.metrosLibres)} m²</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={guardarHistorial}
              disabled={guardando}
              className={`mt-8 w-full font-bold py-4 px-4 rounded transition-all shadow-lg ${
                guardando ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {guardando ? 'Guardando...' : '💾 Guardar Escenario'}
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}
