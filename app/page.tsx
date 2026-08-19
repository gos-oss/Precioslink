'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Settings, Building2, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [resumenPrecios, setResumenPrecios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // 1. Traer Proyectos
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      
      // 2. Traer Historial para gráficos
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('created_at', { ascending: true })

      if (dataProyectos) setProyectos(dataProyectos)
      if (dataHistorial) {
        // Formatear fechas para el gráfico de evolución
        const historialFormateado = dataHistorial.map(h => ({
          ...h,
          fecha: new Date(h.created_at).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
          nombreProyecto: h.proyectos?.nombre || 'Desconocido'
        }))
        setHistorial(historialFormateado)

        // 3. Calcular el "Último Precio" de cada proyecto para el resumen
        if (dataProyectos) {
          const resumen = dataProyectos.map(p => {
            const historialProyecto = dataHistorial.filter(h => h.id_proyecto === p.id)
            const ultimoRegistro = historialProyecto.length > 0 ? historialProyecto[historialProyecto.length - 1] : null
            return {
              nombre: p.nombre,
              id: p.id,
              ultimoPrecioUSD: ultimoRegistro ? Math.round(ultimoRegistro.resultado_precio_promedio_usd) : 0,
              metrosLibres: ultimoRegistro ? Math.round(ultimoRegistro.resultado_metros_libres) : 0
            }
          }).filter(r => r.ultimoPrecioUSD > 0) // Mostrar solo los que tienen al menos una simulación guardada
          
          // Ordenar de mayor a menor precio
          setResumenPrecios(resumen.sort((a, b) => b.ultimoPrecioUSD - a.ultimoPrecioUSD))
        }
      }
      setCargando(false)
    }
    fetchData()
  }, [])

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Cargando métricas del portafolio...</div>

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Precioslink Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Control de portafolio y simulación financiera</p>
          </div>
          <Link href="/configuracion" className="mt-4 md:mt-0 flex items-center bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-all font-medium shadow-sm">
            <Settings className="w-5 h-5 mr-2" /> Parámetros Globales
          </Link>
        </div>

        {/* KPIs y GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico 1: Comparativa de Precios Actuales */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-emerald-500" /> Resumen de Precios Promedio (USD/m²)
            </h2>
            <div className="h-72 w-full">
              {resumenPrecios.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumenPrecios} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fill: '#64748b' }} />
                    <YAxis dataKey="nombre" type="category" width={100} tick={{ fill: '#475569', fontSize: 12 }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="ultimoPrecioUSD" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Precio USD/m²" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">No hay simulaciones guardadas aún.</div>
              )}
            </div>
          </div>

          {/* Gráfico 2: Evolución Histórica */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" /> Evolución de Simulaciones
            </h2>
            <div className="h-72 w-full">
               {historial.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historial} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b' }} domain={['auto', 'auto']} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="resultado_precio_promedio_usd" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} name="Precio USD/m²" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Guarda escenarios en la calculadora para ver la evolución.</div>
              )}
            </div>
          </div>
        </div>

        {/* GRILLA DE ACCESO A PROYECTOS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <Building2 className="w-6 h-6 mr-2 text-slate-400" /> Portafolio de Proyectos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {proyectos.map((proyecto) => {
              const resumen = resumenPrecios.find(r => r.id === proyecto.id)
              return (
                <Link key={proyecto.id} href={`/proyecto/${proyecto.id}`} className="group relative bg-slate-50 hover:bg-blue-50 p-5 rounded-xl border border-slate-200 hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between h-40">
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{proyecto.nombre}</h3>
                    {resumen ? (
                      <div className="mt-2 text-sm">
                        <p className="text-slate-500">Último estimado:</p>
                        <p className="font-bold text-emerald-600 text-lg">USD {resumen.ultimoPrecioUSD.toLocaleString()}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400 italic">Sin simulación</p>
                    )}
                  </div>
                  <div className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Configurar &rarr;
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </main>
  )
}
