'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Settings, Building2, DollarSign, Activity, BarChart3, Briefcase } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Paleta de degradados premium para los proyectos
const gradients = [
  'from-indigo-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-orange-500 to-rose-500',
  'from-pink-500 to-purple-600',
  'from-zinc-600 to-zinc-900'
]

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [resumenPrecios, setResumenPrecios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('fecha_referencia', { ascending: true })

      if (dataProyectos) setProyectos(dataProyectos)
      if (dataHistorial) {
        const historialFormateado = dataHistorial.map(h => {
          const dateString = h.fecha_referencia || new Date().toISOString().split('T')[0]
          const [year, month, day] = dateString.split('-')
          const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
          
          return {
            ...h,
            resultado_precio_promedio_usd: Math.round(Number(h.resultado_precio_promedio_usd)),
            fecha: dateObj.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
            nombreProyecto: h.proyectos?.nombre || 'Desconocido'
          }
        })
        setHistorial(historialFormateado)

        if (dataProyectos) {
          const resumen = dataProyectos.map(p => {
            const historialProyecto = dataHistorial.filter(h => h.id_proyecto === p.id)
            const ultimoRegistro = historialProyecto.length > 0 ? historialProyecto[historialProyecto.length - 1] : null
            return {
              nombre: p.nombre,
              id: p.id,
              ultimoPrecioUSD: ultimoRegistro ? Math.round(Number(ultimoRegistro.resultado_precio_promedio_usd)) : 0,
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
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Cargando Portafolio...</p>
      </div>
    </div>
  )

  const precioPromedioPortafolio = resumenPrecios.length > 0 
    ? Math.round(resumenPrecios.reduce((acc, curr) => acc + curr.ultimoPrecioUSD, 0) / resumenPrecios.length)
    : 0;

  return (
    <main className="min-h-screen bg-zinc-100 p-4 md:p-8 font-sans text-zinc-900 selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ENCABEZADO GERENCIAL */}
        <div className="bg-zinc-950 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center border border-zinc-800 relative overflow-hidden">
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 transition-transform hover:-translate-y-1 duration-300">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-indigo-500" /> Total Proyectos
            </p>
            <p className="text-4xl font-black text-zinc-900">{proyectos.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 transition-transform hover:-translate-y-1 duration-300">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" /> Escenarios de Corte
            </p>
            <p className="text-4xl font-black text-zinc-900">{historial.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 ring-1 ring-emerald-500/20 transition-transform hover:-translate-y-1 duration-300">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
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
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
            <h2 className="text-xs font-bold text-zinc-400 mb-6 flex items-center uppercase tracking-widest">Ranking de Precios (USD/m²)</h2>
            <div className="h-72 w-full">
              {resumenPrecios.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumenPrecios} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="nombre" type="category" width={110} tick={{ fill: '#3f3f46', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#09090b', fontWeight: 'bold' }} />
                    <Bar dataKey="ultimoPrecioUSD" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Precio USD/m²" barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">Sin datos de simulación.</div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200/60">
            <h2 className="text-xs font-bold text-zinc-400 mb-6 flex items-center uppercase tracking-widest">Evolución Histórica por Corte</h2>
            <div className="h-72 w-full">
               {historial.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historial} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="fecha" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelStyle={{ color: '#71717a', marginBottom: '4px' }} />
                    <Line type="monotone" dataKey="resultado_precio_promedio_usd" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Precio USD/m²" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">Guarda escenarios de corte para ver tendencia.</div>
              )}
            </div>
          </div>
        </div>

        {/* PORTAFOLIO PREMIUM */}
        <div className="pt-6">
          <h2 className="text-2xl font-black text-zinc-900 mb-8 flex items-center tracking-tight">
            Portafolio de Proyectos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {proyectos.map((proyecto, index) => {
              const resumen = resumenPrecios.find(r => r.id === proyecto.id)
              // Seleccionamos un color de la paleta basado en su posición
              const gradientClass = gradients[index % gradients.length]
              
              return (
                <Link key={proyecto.id} href={`/proyecto/${proyecto.id}`} className="group bg-white rounded-3xl border border-zinc-200/60 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col h-56 cursor-pointer overflow-hidden transform hover:-translate-y-1">
                  
                  {/* PORTADA DE COLOR ABSTRACTA */}
                  <div className={`h-16 w-full bg-gradient-to-r ${gradientClass} opacity-80 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-zinc-800 group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-1">{proyecto.nombre}</h3>
                      {resumen ? (
                        <div className="mt-3">
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Último estimado</p>
                          <p className="font-black text-emerald-600 text-2xl mt-1 tracking-tight">${resumen.ultimoPrecioUSD.toLocaleString()} <span className="text-xs font-semibold text-zinc-400">/m²</span></p>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Estado</p>
                          <p className="font-semibold text-zinc-500 text-sm mt-1">Sin configurar</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                      Modelar Escenario &rarr;
                    </div>
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
