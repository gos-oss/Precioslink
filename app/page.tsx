'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Settings, Building2, TrendingUp, DollarSign, Activity, BarChart3, Briefcase } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [resumenPrecios, setResumenPrecios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('created_at', { ascending: true })

      if (dataProyectos) setProyectos(dataProyectos)
      if (dataHistorial) {
        const historialFormateado = dataHistorial.map(h => ({
          ...h,
          fecha: new Date(h.created_at).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
          nombreProyecto: h.proyectos?.nombre || 'Desconocido'
        }))
        setHistorial(historialFormateado)

        if (dataProyectos) {
          const resumen = dataProyectos.map(p => {
            const historialProyecto = dataHistorial.filter(h => h.id_proyecto === p.id)
            const ultimoRegistro = historialProyecto.length > 0 ? historialProyecto[historialProyecto.length - 1] : null
            return {
              nombre: p.nombre,
              id: p.id,
              ultimoPrecioUSD: ultimoRegistro ? Math.round(ultimoRegistro.resultado_precio_promedio_usd) : 0,
            }
          }).filter(r => r.ultimoPrecioUSD > 0)
          
          setResumenPrecios(resumen.sort((a, b) => b.ultimoPrecioUSD - a.ultimoPrecioUSD))
        }
      }
      setCargando(false)
    }
    fetchData()
  }, [])

  if (cargando) return (
    <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-zinc-400 animate-pulse" />
        <p className="text-zinc-500 font-medium tracking-wide uppercase text-sm">Inicializando entorno...</p>
      </div>
    </div>
  )

  // Cálculos Gerenciales
  const precioPromedioPortafolio = resumenPrecios.length > 0 
    ? Math.round(resumenPrecios.reduce((acc, curr) => acc + curr.ultimoPrecioUSD, 0) / resumenPrecios.length)
    : 0;

  return (
    <main className="min-h-screen bg-[#F4F4F5] p-4 md:p-8 font-sans text-zinc-900 selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ENCABEZADO GERENCIAL (DARK MODE) */}
        <div className="bg-zinc-950 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center border border-zinc-800 relative overflow-hidden">
          {/* Efecto de luz de fondo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-5">
            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 backdrop-blur-md">
              <Activity className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Precios<span className="text-indigo-400 font-light">link</span>
              </h1>
              <p className="text-zinc-400 mt-1 font-medium tracking-wide text-sm uppercase">Intelligence & Pricing Dashboard</p>
            </div>
          </div>

          <Link href="/configuracion" className="relative z-10 mt-6 md:mt-0 flex items-center bg-white/5 hover:bg-white/10 text-zinc-200 px-6 py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 transition-all font-medium text-sm backdrop-blur-md">
            <Settings className="w-4 h-4 mr-2 text-zinc-400" /> Parámetros Globales
          </Link>
        </div>

        {/* KPIs SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60">
            <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-indigo-500" /> Total Proyectos
            </p>
            <p className="text-4xl font-black text-zinc-900">{proyectos.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60">
            <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" /> Escenarios Simulados
            </p>
            <p className="text-4xl font-black text-zinc-900">{historial.length}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 ring-1 ring-emerald-500/10">
            <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-emerald-600" /> Promedio Portafolio
            </p>
            <div className="flex items-baseline">
              <span className="text-xl text-zinc-400 font-bold mr-1">USD</span>
              <p className="text-4xl font-black text-emerald-600">{precioPromedioPortafolio.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico 1 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
            <h2 className="text-base font-bold text-zinc-800 mb-6 flex items-center uppercase tracking-wide">
              Ranking de Precios (USD/m²)
            </h2>
            <div className="h-72 w-full">
              {resumenPrecios.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumenPrecios} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="nombre" type="category" width={110} tick={{ fill: '#3f3f46', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f4f4f5' }} 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      itemStyle={{ color: '#09090b', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="ultimoPrecioUSD" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Precio USD/m²" barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">Sin datos de simulación.</div>
              )}
            </div>
          </div>

          {/* Gráfico 2 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
            <h2 className="text-base font-bold text-zinc-800 mb-6 flex items-center uppercase tracking-wide">
              Evolución de Estimaciones
            </h2>
            <div className="h-72 w-full">
               {historial.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historial} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="fecha" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="resultado_precio_promedio_usd" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Precio USD/m²" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">Guarda escenarios para visualizar tendencia.</div>
              )}
            </div>
          </div>
        </div>

        {/* PORTAFOLIO DE PROYECTOS */}
        <div className="pt-4">
          <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center tracking-tight">
            <Building2 className="w-6 h-6 mr-3 text-zinc-400" /> Portafolio Activo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {proyectos.map((proyecto) => {
              const resumen = resumenPrecios.find(r => r.id === proyecto.id)
              return (
                <Link key={proyecto.id} href={`/proyecto/${proyecto.id}`} className="group bg-white p-6 rounded-2xl border border-zinc-200/60 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between h-44 cursor-pointer relative overflow-hidden">
                  {/* Borde superior decorativo al hover */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  
                  <div>
                    <h3 className="font-bold text-lg text-zinc-800 group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-1">{proyecto.nombre}</h3>
                    {resumen ? (
                      <div className="mt-4">
                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Último estimado</p>
                        <p className="font-black text-emerald-600 text-2xl mt-1 tracking-tight">
                          ${resumen.ultimoPrecioUSD.toLocaleString()} <span className="text-sm font-medium text-zinc-400">/m²</span>
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Estado</p>
                        <p className="font-medium text-zinc-500 text-sm mt-1">Sin configurar</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center text-indigo-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                    Modelar Escenario &rarr;
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
