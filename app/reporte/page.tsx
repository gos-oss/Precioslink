'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Printer, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ReporteMensual() {
  const [datosReporte, setDatosReporte] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function generarDatos() {
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*').order('fecha_referencia', { ascending: false })

      if (dataProyectos && dataHistorial) {
        const reporte = dataProyectos.map(proyecto => {
          // Filtramos el historial de este proyecto específico
          const historialProyecto = dataHistorial.filter(h => h.id_proyecto === proyecto.id)
          
          // Tomamos el registro más reciente (Actual) y el que le sigue (Anterior)
          const mesActual = historialProyecto.length > 0 ? historialProyecto[0] : null
          const mesAnterior = historialProyecto.length > 1 ? historialProyecto[1] : null

          const precioActual = mesActual ? Math.round(Number(mesActual.resultado_precio_promedio_usd)) : 0
          const precioAnterior = mesAnterior ? Math.round(Number(mesAnterior.resultado_precio_promedio_usd)) : precioActual

          // Calculamos la variación porcentual
          let variacion = 0
          if (precioAnterior > 0 && precioActual > 0) {
            variacion = ((precioActual - precioAnterior) / precioAnterior) * 100
          }

          return {
            nombre: proyecto.nombre,
            precioActual,
            precioAnterior,
            variacion,
            fechaActual: mesActual ? mesActual.fecha_referencia : 'Sin datos',
            fechaAnterior: mesAnterior ? mesAnterior.fecha_referencia : '-'
          }
        }).filter(r => r.precioActual > 0) // Solo mostramos proyectos con al menos un escenario calculado

        setDatosReporte(reporte)
      }
      setCargando(false)
    }
    generarDatos()
  }, [])

  if (cargando) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
    </div>
  )

  const fechaHoy = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()

  return (
    <main className="min-h-screen bg-zinc-200 py-10 font-sans print:bg-white print:py-0">
      
      {/* ESTILOS PARA FORZAR LOS COLORES EN EL PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1cm; size: A4; }
        }
      `}} />

      {/* BOTONERA SUPERIOR (Se oculta al imprimir) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden px-4">
        <Link href="/" className="flex items-center text-sm font-bold text-zinc-600 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> VOLVER AL DASHBOARD
        </Link>
        <button onClick={() => window.print()} className="flex items-center bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95">
          <Printer className="w-4 h-4 mr-2" /> DESCARGAR PDF
        </button>
      </div>

      {/* HOJA A4 DEL REPORTE */}
      <div className="max-w-4xl mx-auto bg-white min-h-[29.7cm] shadow-2xl rounded-sm p-12 print:shadow-none print:w-full print:max-w-full print:p-0">
        
        {/* ENCABEZADO DEL DOCUMENTO */}
        <div className="border-b-2 border-zinc-900 pb-8 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Reporte Ejecutivo</h1>
            <p className="text-zinc-500 font-medium tracking-widest uppercase mt-2 text-sm">Resumen de Pricing & Variación</p>
          </div>
          <div className="text-right">
            <div className="bg-indigo-600 text-white px-4 py-1 rounded font-bold text-sm inline-block mb-2">
              USO INTERNO
            </div>
            <p className="text-zinc-800 font-bold uppercase tracking-widest">{fechaHoy}</p>
          </div>
        </div>

        {/* TABLA DE VARIACIONES */}
        <div className="mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-4 px-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">Proyecto</th>
                <th className="py-4 px-2 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Mes Anterior</th>
                <th className="py-4 px-2 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Mes Actual</th>
                <th className="py-4 px-2 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Variación</th>
              </tr>
            </thead>
            <tbody>
              {datosReporte.map((fila, index) => (
                <tr key={index} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="py-5 px-2 font-black text-zinc-900 text-lg tracking-tight">
                    {fila.nombre}
                  </td>
                  <td className="py-5 px-2 text-right">
                    <span className="text-zinc-400 font-medium text-sm mr-1">USD</span>
                    <span className="font-bold text-zinc-500">{fila.precioAnterior.toLocaleString()}</span>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <span className="text-zinc-400 font-medium text-sm mr-1">USD</span>
                    <span className="font-black text-indigo-600 text-xl">{fila.precioActual.toLocaleString()}</span>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <div className="flex justify-end items-center">
                      {fila.variacion > 0 ? (
                        <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg font-bold">
                          <TrendingUp className="w-4 h-4 mr-1" /> +{fila.variacion.toFixed(1)}%
                        </div>
                      ) : fila.variacion < 0 ? (
                        <div className="flex items-center text-rose-600 bg-rose-50 px-3 py-1 rounded-lg font-bold">
                          <TrendingDown className="w-4 h-4 mr-1" /> {fila.variacion.toFixed(1)}%
                        </div>
                      ) : (
                        <div className="flex items-center text-zinc-500 bg-zinc-100 px-3 py-1 rounded-lg font-bold">
                          <Minus className="w-4 h-4 mr-1" /> 0.0%
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA DEL REPORTE */}
        <div className="mt-20 pt-8 border-t border-zinc-200 flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
          <p>Generado automáticamente por Precioslink</p>
          <p>CONFIDENCIAL</p>
        </div>

      </div>
    </main>
  )
}
