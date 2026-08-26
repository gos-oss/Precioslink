'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
// ¡AQUÍ ESTÁ LA CORRECCIÓN! Agregamos "Box" a las importaciones
import { Settings, Building2, DollarSign, Activity, BarChart3, Briefcase, MapPin, Map, PieChart as PieChartIcon, Box } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

const gradients = [
  'from-indigo-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-orange-500 to-rose-500',
  'from-pink-500 to-purple-600',
  'from-zinc-600 to-zinc-900'
]

const COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f43f5e', '#8b5cf6', '#d946ef', '#f59e0b', '#84cc16'];

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [resumenPrecios, setResumenPrecios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>('todos')
  
  // ESTADOS PARA EL MAPA INTERACTIVO
  const [mapaActivo, setMapaActivo] = useState<string>('San Miguel de Tucumán, Argentina')
  const [proyectoActivoMapa, setProyectoActivoMapa] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      // 1. Traemos Proyectos, Historial y UNIDADES (Para saber qué está disponible)
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('fecha_referencia', { ascending: true })
      const { data: dataUnidades } = await supabase.from('unidades').select('*')

      if (dataProyectos) {
        setProyectos(dataProyectos)
        // Establecer el primer proyecto con dirección como mapa por defecto
        const primerConDireccion = dataProyectos.find(p => p.direccion)
        if (primerConDireccion) {
          setMapaActivo(primerConDireccion.direccion)
          setProyectoActivoMapa(primerConDireccion.id)
        }
      }

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
            const historialProyecto = historialFormateado.filter(h => h.id_proyecto === p.id)
            const ultimoRegistro = historialProyecto.length > 0 ? historialProyecto[historialProyecto.length - 1] : null
            const ultimoPrecioUSD = ultimoRegistro ? Math.round(Number(ultimoRegistro.resultado_precio_promedio_usd)) : 0
            
            // CÁLCULO DE INVENTARIO DISPONIBLE
            let m2Disponibles = 0
            if (dataUnidades) {
              const unidadesDisponibles = dataUnidades.filter(u => u.id_proyecto === p.id && u.estado === 'disponible')
              m2Disponibles = unidadesDisponibles.reduce((acc, u) => acc + Number(u.superficie_m2), 0)
            }
            
            const valorInventario = Math.round(m2Disponibles * ultimoPrecioUSD)

            return {
              nombre: p.nombre,
              id: p.id,
              ultimoPrecioUSD: ultimoPrecioUSD,
              ultimaFecha: ultimoRegistro ? ultimoRegistro.fecha : '-',
              direccion: p.direccion || '',
              m2Disponibles,
              valorInventario
            }
          }).filter(r => r.ultimoPrecioUSD > 0)
          
          setResumenPrecios(resumen.sort((a, b) => b.ultimoPrecioUSD - a.ultimoPrecioUSD))
        }
      }
      setCargando(false)
    }
    fetchData()
  }, [])

  const datosGraficoLinea = useMemo(() => {
    if (proyectoSeleccionadoId === 'todos') {
      const agrupado = historial.reduce((acc, curr) => {
        const ref = curr.fecha_referencia;
        if (!acc[ref]) acc[ref] = { fecha_referencia: ref, fecha: curr.fecha, sum: 0, count: 0 };
        acc[ref].sum += curr.resultado_precio_promedio_usd;
        acc[ref].count += 1;
        return acc;
      }, {} as any);
      
      return Object.values(agrupado)
        .sort((a: any, b: any) => a.fecha_referencia.localeCompare(b.fecha_referencia))
        .map((item: any) => ({
          fecha: item.fecha,
          resultado_precio_promedio_usd: Math.round(item.sum / item.count)
        }));
    } else {
      return historial.filter(h => h.id_proyecto === proyectoSeleccionadoId);
    }
  }, [historial, proyectoSeleccionadoId]);

  if (cargando) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Cargando Comercialink...</p>
      </div>
    </div>
  )

  const precioPromedioPortafolio = resumenPrecios.length > 0 
    ? Math.round(resumenPrecios.reduce((acc, curr) => acc + curr.ultimoPrecioUSD, 0) / resumenPrecios.length)
    : 0;

  // NUEVO KPI: SUMA DEL VALOR DEL INVENTARIO DISPONIBLE DE TODOS LOS PROYECTOS
  const valorTotalInventario = resumenPrecios.reduce((acc, curr) => acc + curr.valorInventario, 0);
  
  // DATOS PARA EL GRÁFICO DE TORTA
  const datosTorta = resumenPrecios.filter(r => r.valorInventario > 0).sort((a, b) => b.valorInventario - a.valorInventario);

  // Formateador de moneda para el Tooltip del gráfico de torta
  const formatTooltipPie = (value: number) => [`$${value.toLocaleString()} USD`, 'Valor Inventario'];

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
                Comercial<span className="text-indigo-400 font-light">link</span>
              </h1>
              <p className="text-zinc-400 mt-1 font-medium tracking-wide text-sm uppercase">Intelligence & Pricing Dashboard</p>
            </div>
          </div>
          
          <div className="relative z-10 mt-6 md:mt-0 flex flex-wrap items-center gap-3">
            <Link href="/reporte" className="flex items-center bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all font-bold text-sm active:scale-95">
              <BarChart3 className="w-4 h-4 mr-2" /> Generar Reporte
            </Link>
            <Link href="/configuracion" className="flex items-center bg-white/5 hover:bg-white/10 text-zinc-200 px-6 py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 transition-all font-medium text-sm backdrop-blur-md active:scale-95">
              <Settings className="w-4 h-4 mr-2 text-zinc-400" /> Parámetros
            </Link>
          </div>
        </div>

        {/* KPIs SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 transition-transform hover:-translate-y-1 duration-300">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-indigo-500" /> Total Proyectos
            </p>
            <p className="text-4xl font-black text-zinc-900">{proyectos.length}</p>
          </div>
          
          {/* NUEVO KPI: VALOR DE INVENTARIO DISPONIBLE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 ring-1 ring-indigo-500/20 transition-transform hover:-translate-y-1 duration-300">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
              <Box className="w-4 h-4 mr-2 text-indigo-500" /> Inventario Disponible
            </p>
            <div className="flex items-baseline">
              <span className="text-xl text-zinc-400 font-bold mr-1">USD</span>
              <p className="text-4xl font-black text-indigo-600">{valorTotalInventario.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60 transition-transform hover:-translate-y-1 duration-300">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-emerald-600" /> Promedio Portafolio
            </p>
            <div className="flex items-baseline">
              <span className="text-xl text-zinc-400 font-bold mr-1">USD</span>
              <p className="text-4xl font-black text-emerald-600">{precioPromedioPortafolio.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* GRID DE 4 PANELES CENTRALES (2x2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Panel 1: Ranking (BarChart) */}
          <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-xs font-bold text-zinc-400 mb-6 flex items-center uppercase tracking-widest relative z-10">Ranking Precios (USD/m²)</h2>
            <div className="h-72 w-full relative z-10">
              {resumenPrecios.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumenPrecios} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="nombre" type="category" width={90} tick={{ fill: '#e4e4e7', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#18181b' }} contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} itemStyle={{ color: '#e4e4e7', fontWeight: 'bold' }} />
                    <Bar dataKey="ultimoPrecioUSD" fill="#6366f1" radius={[0, 4, 4, 0]} name="Precio USD/m²" barSize={24} background={{ fill: '#18181b' }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">Sin datos.</div>
              )}
            </div>
          </div>

          {/* Panel 2: Evolución Histórica (AreaChart con Selector) */}
          <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Evolución Histórica</h2>
              <select 
                value={proyectoSeleccionadoId} 
                onChange={(e) => setProyectoSeleccionadoId(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="todos">Promedio Global</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="h-72 w-full relative z-10">
               {datosGraficoLinea.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosGraficoLinea} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="fecha" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="resultado_precio_promedio_usd" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrecio)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} name="Precio USD/m²" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">Sin historial para este proyecto.</div>
              )}
            </div>
          </div>

          {/* Panel 3: Distribución de Inventario (PieChart) */}
          <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-xs font-bold text-zinc-400 mb-6 flex items-center uppercase tracking-widest relative z-10">
              <PieChartIcon className="w-4 h-4 mr-2" /> Participación por Proyecto
            </h2>
            <div className="h-72 w-full relative z-10">
              {datosTorta.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosTorta}
                      dataKey="valorInventario"
                      nameKey="nombre"
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {datosTorta.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={formatTooltipPie}
                      contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} 
                      itemStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">Sin inventario disponible para mostrar.</div>
              )}
            </div>
          </div>

          {/* Panel 4: Precios y Stock Actual (Tabla) */}
          <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-xs font-bold text-zinc-400 mb-6 flex items-center uppercase tracking-widest relative z-10">Detalle Actual</h2>
            <div className="h-72 w-full relative z-10 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-zinc-950 z-20">
                  <tr className="border-b border-zinc-800">
                    <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Proyecto</th>
                    <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Inv. (USD)</th>
                    <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Precio/m²</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPrecios.map((item, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 text-xs font-bold text-zinc-200">{item.nombre}</td>
                      <td className="py-3 text-xs font-medium text-indigo-400 text-center">${item.valorInventario.toLocaleString()}</td>
                      <td className="py-3 text-xs font-black text-emerald-400 text-right">${item.ultimoPrecioUSD.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resumenPrecios.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic mt-10">Sin datos.</div>
              )}
            </div>
          </div>
        </div>

        {/* MAPA INTERACTIVO GLOBAL */}
        <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white flex items-center tracking-tight">
              <MapPin className="w-5 h-5 mr-3 text-indigo-500" /> Mapa de Desarrollos
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px]">
            {/* Lista de Proyectos (Menú del mapa) */}
            <div className="lg:col-span-4 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              {resumenPrecios.filter(r => r.direccion).length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic text-center p-6 border-2 border-dashed border-zinc-800 rounded-2xl">
                  Aún no has agregado direcciones a tus proyectos. Edítalos para verlos aquí.
                </div>
              ) : (
                resumenPrecios.filter(r => r.direccion).map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => { setMapaActivo(item.direccion); setProyectoActivoMapa(item.id); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${proyectoActivoMapa === item.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
                  >
                    <h3 className={`font-bold text-sm ${proyectoActivoMapa === item.id ? 'text-indigo-400' : 'text-zinc-200'}`}>{item.nombre}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1 flex items-center"><Map className="w-3 h-3 mr-1"/> {item.direccion}</p>
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-400">Desde ${item.ultimoPrecioUSD}/m²</span>
                      <span className="text-emerald-500 font-bold">Ver en mapa &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Iframe del Mapa */}
            <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center relative">
              {mapaActivo ? (
                <iframe 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapaActivo)}&z=15&output=embed`} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                ></iframe>
              ) : (
                <div className="text-zinc-600 text-sm font-medium flex flex-col items-center">
                  <MapPin className="w-10 h-10 mb-2 opacity-50" /> Selecciona un proyecto para ubicarlo
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PORTAFOLIO DE PROYECTOS (TARJETAS) */}
        <div className="pt-6">
          <h2 className="text-2xl font-black text-zinc-900 mb-8 flex items-center tracking-tight">
            Portafolio de Proyectos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {proyectos.map((proyecto, index) => {
              const resumen = resumenPrecios.find(r => r.id === proyecto.id)
              const gradientClass = gradients[index % gradients.length]
              
              return (
                <Link key={proyecto.id} href={`/proyecto/${proyecto.id}`} className="group bg-white rounded-3xl border border-zinc-200/60 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col h-56 cursor-pointer overflow-hidden transform hover:-translate-y-1">
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
                      Gestionar Proyecto &rarr;
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
