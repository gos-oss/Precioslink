'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Settings, Building2, DollarSign, Activity, BarChart3, Briefcase, MapPin, Map, PieChart as PieChartIcon, Box, AlertTriangle, Wallet, CalendarDays, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899', '#0ea5e9'];

const meses = [
  { val: 1, label: 'Ene' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' },
  { val: 4, label: 'Abr' }, { val: 5, label: 'May' }, { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' }, { val: 8, label: 'Ago' }, { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dic' }
]
const anios = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

const generarMapaHTML = (proyectosFiltrados: any[]) => {
  const proyectosStr = JSON.stringify(proyectosFiltrados);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
        #map { height: 100vh; width: 100vw; background: #e7e5e4; }
        .custom-popup .leaflet-popup-content-wrapper { border-radius: 8px; background: #0f172a; color: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); border: 1px solid #334155; }
        .custom-popup .leaflet-popup-tip { background: #0f172a; }
        .popup-title { font-weight: bold; color: #f59e0b; margin-bottom: 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;}
        .popup-price { color: #10b981; font-weight: 900; font-size: 14px;}
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([-26.82414, -65.2226], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const proyectos = ${proyectosStr};
        const markersData = {};
        const markersList = [];
        
        const myIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const cache = JSON.parse(localStorage.getItem('geocode_cache_v2') || '{}');

        window.addEventListener('message', function(event) {
           if(event.data && event.data.type === 'zoomTo') {
              const data = markersData[event.data.direccion];
              if (data) {
                 map.setView([data.lat, data.lon], 16, { animate: true, duration: 1.5 });
                 data.marker.openPopup();
              }
           }
        });

        const procesarPines = async () => {
          let cacheUpdated = false;

          for (const p of proyectos) {
            if (!p.direccion) continue;
            let lat, lon;
            let direccionBusqueda = p.direccion;
            if (!direccionBusqueda.toLowerCase().includes('tucuman') && !direccionBusqueda.toLowerCase().includes('tucumán')) {
               direccionBusqueda = direccionBusqueda + ', Tucumán, Argentina';
            }
            
            if (cache[p.direccion]) {
              lat = cache[p.direccion].lat;
              lon = cache[p.direccion].lon;
            } else {
              try {
                const query = encodeURIComponent(direccionBusqueda);
                const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + query);
                const data = await res.json();
                if (data && data.length > 0) {
                  lat = parseFloat(data[0].lat);
                  lon = parseFloat(data[0].lon);
                  cache[p.direccion] = { lat, lon };
                  cacheUpdated = true;
                }
              } catch (e) { console.error('Error', p.nombre); }
              await new Promise(r => setTimeout(r, 1200));
            }

            if (lat && lon) {
              const marker = L.marker([lat, lon], {icon: myIcon}).addTo(map);
              marker.bindPopup(
                '<div class="popup-title">' + p.nombre + '</div>' +
                '<div style="font-size:11px; margin-bottom:6px; color:#94a3b8;">' + p.direccion + '</div>' +
                '<div class="popup-price">Desde $' + p.ultimoPrecioUSD + '/m²</div>',
                { className: 'custom-popup' }
              );
              markersData[p.direccion] = { lat, lon, marker };
              markersList.push([lat, lon]);
            }
          }
          
          if (cacheUpdated) localStorage.setItem('geocode_cache_v2', JSON.stringify(cache));
          if (markersList.length > 0) map.fitBounds(markersList, { padding: [50, 50], maxZoom: 15 });
        };
        procesarPines();
      </script>
    </body>
    </html>
  `;
};

export default function Home() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [resumenPrecios, setResumenPrecios] = useState<any[]>([])
  const [ventas, setVentas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>('todos')
  const [mapaActivo, setMapaActivo] = useState<string>('San Miguel de Tucumán, Argentina')
  const [proyectoActivoMapa, setProyectoActivoMapa] = useState<string>('')

  // Estados para el Filtro de Ventas
  const currentDate = new Date()
  const [filtroMes, setFiltroMes] = useState(currentDate.getMonth() + 1)
  const [filtroAnio, setFiltroAnio] = useState(currentDate.getFullYear())

  useEffect(() => {
    async function fetchData() {
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('fecha_referencia', { ascending: true })
      const { data: dataUnidades } = await supabase.from('unidades').select('*')
      const { data: dataVentas } = await supabase.from('ventas').select('*') // Consultamos ventas

      if (dataVentas) setVentas(dataVentas)

      if (dataProyectos) {
        setProyectos(dataProyectos)
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

  // CALCULO DE VENTAS POR PERIODO SELECCIONADO
  const totalVentasPeriodo = useMemo(() => {
    return ventas.filter(v => {
      const fecha = new Date(v.fecha_venta);
      return (fecha.getMonth() + 1) === filtroMes && fecha.getFullYear() === filtroAnio;
    }).reduce((acc, v) => acc + Number(v.precio_venta), 0);
  }, [ventas, filtroMes, filtroAnio]);

  const enfocarProyectoEnMapa = (id: string, direccion: string) => {
    setProyectoActivoMapa(id);
    const iframe = document.getElementById('mapa-global') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'zoomTo', direccion }, '*');
    }
  };

  const proyectosConDireccion = useMemo(() => resumenPrecios.filter(r => r.direccion), [resumenPrecios]);
  const htmlMapa = useMemo(() => generarMapaHTML(proyectosConDireccion), [proyectosConDireccion]);

  if (cargando) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-slate-800 animate-pulse" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Cargando LINK...</p>
      </div>
    </div>
  )

  const precioPromedioPortafolio = resumenPrecios.length > 0 
    ? Math.round(resumenPrecios.reduce((acc, curr) => acc + curr.ultimoPrecioUSD, 0) / resumenPrecios.length)
    : 0;

  const valorTotalInventario = resumenPrecios.reduce((acc, curr) => acc + curr.valorInventario, 0);
  const m2TotalesDisponibles = Math.round(resumenPrecios.reduce((acc, curr) => acc + curr.m2Disponibles, 0));
  
  const datosTorta = resumenPrecios.filter(r => r.valorInventario > 0).sort((a, b) => b.valorInventario - a.valorInventario);
  const formatTooltipPie = (value: number) => [`$${value.toLocaleString()} USD`, 'Valor Inventario'];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans selection:bg-amber-100">
      
      {/* SIDEBAR (Menú Lateral) */}
      <aside className="w-80 bg-slate-950 border-r border-slate-800 flex-shrink-0 flex flex-col hidden lg:flex">
        {/* Header del Sidebar con el Banner */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center justify-center h-20 overflow-hidden rounded-lg border border-slate-700/50 bg-black">
            <img 
              src="/link-banner.png" 
              alt="Banner LINK" 
              className="h-full w-auto object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-white font-black text-2xl px-8">LINK</span>';
              }}
            />
          </div>
        </div>

        {/* Lista de Proyectos */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Portafolio de Proyectos</h3>
          <div className="space-y-3">
            {proyectos.map((proyecto) => {
              const resumen = resumenPrecios.find(r => r.id === proyecto.id)
              return (
                <Link key={proyecto.id} href={`/proyecto/${proyecto.id}`} className="group block p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-amber-500/50 transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-200 group-hover:text-amber-500 transition-colors line-clamp-1">{proyecto.nombre}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">
                        {resumen ? `M2: $${resumen.ultimoPrecioUSD.toLocaleString()}` : 'Sin cotizar'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800">
          <Link href="/configuracion" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-3 rounded-xl border border-slate-700 transition-all font-medium text-xs w-full">
            <Settings className="w-4 h-4 mr-2" /> Configuración Global
          </Link>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL (Dashboard) */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Comercialink Dashboard</h1>
              <p className="text-slate-500 mt-1 font-medium tracking-wide text-xs uppercase">Panel Gerencial de Inteligencia</p>
            </div>
            <Link href="/reporte" className="inline-flex items-center bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg border border-slate-800 transition-all font-bold text-sm active:scale-95">
              <BarChart3 className="w-4 h-4 mr-2 text-amber-500" /> Generar Reporte
            </Link>
          </div>

          {/* 4 KPIs SUPERIORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Total Proyectos</p>
                <Briefcase className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline text-slate-800">
                <p className="text-3xl font-bold font-serif">{proyectos.length}</p>
                <span className="text-sm font-serif ml-2 text-slate-500">activos</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Promedio Portafolio</p>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline text-emerald-700">
                <span className="text-lg font-serif mr-1">$</span>
                <p className="text-3xl font-bold font-serif">{precioPromedioPortafolio.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Inventario Libre</p>
                <AlertTriangle className="w-4 h-4 text-red-700" />
              </div>
              <div className="flex items-baseline text-red-700">
                <span className="text-lg font-serif mr-1">$</span>
                <p className="text-3xl font-bold font-serif">{valorTotalInventario.toLocaleString()}</p>
              </div>
              <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-widest">{m2TotalesDisponibles.toLocaleString('es-AR')} m² libres</p>
            </div>

            {/* NUEVO KPI: VENTAS POR PERIODO */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 flex flex-col justify-between ring-1 ring-amber-500/20">
              <div className="flex justify-between items-start mb-2">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest flex items-center text-amber-600">
                  <CalendarDays className="w-3 h-3 mr-1" /> Ventas Período
                </p>
                <div className="flex gap-1">
                  <select value={filtroMes} onChange={(e)=>setFiltroMes(Number(e.target.value))} className="text-[10px] font-bold bg-stone-50 border border-stone-200 rounded p-1 outline-none text-slate-700 cursor-pointer hover:border-amber-400">
                    {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                  </select>
                  <select value={filtroAnio} onChange={(e)=>setFiltroAnio(Number(e.target.value))} className="text-[10px] font-bold bg-stone-50 border border-stone-200 rounded p-1 outline-none text-slate-700 cursor-pointer hover:border-amber-400">
                    {anios.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-baseline text-amber-600 mt-1">
                <span className="text-lg font-serif mr-1">$</span>
                <p className="text-3xl font-bold font-serif">{totalVentasPeriodo.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* GRID DE PANELES CENTRALES (GRAFICOS Y MAPAS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
              <h2 className="text-[11px] font-bold text-slate-400 mb-6 flex items-center uppercase tracking-widest relative z-10">Ranking Precios (USD/m²)</h2>
              <div className="h-64 w-full relative z-10">
                {resumenPrecios.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resumenPrecios} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="nombre" type="category" width={80} tick={{ fill: '#f8fafc', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} />
                      <Bar dataKey="ultimoPrecioUSD" fill="#0f766e" radius={[0, 4, 4, 0]} name="Precio USD/m²" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">Sin datos.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Evolución Histórica</h2>
                <select 
                  value={proyectoSeleccionadoId} 
                  onChange={(e) => setProyectoSeleccionadoId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded p-1 outline-none cursor-pointer"
                >
                  <option value="todos">Promedio Global</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="h-64 w-full relative z-10">
                 {datosGraficoLinea.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datosGraficoLinea} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="fecha" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} itemStyle={{ color: '#d97706', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="resultado_precio_promedio_usd" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorPrecio)" activeDot={{ r: 6, strokeWidth: 0, fill: '#d97706' }} name="Precio USD/m²" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">Sin historial para este proyecto.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
              <h2 className="text-[11px] font-bold text-slate-400 mb-6 flex items-center uppercase tracking-widest relative z-10">
                <PieChartIcon className="w-4 h-4 mr-2" /> Participación de Inventario
              </h2>
              <div className="h-64 w-full relative z-10">
                {datosTorta.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosTorta}
                        dataKey="valorInventario"
                        nameKey="nombre"
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {datosTorta.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={formatTooltipPie}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }} 
                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">Sin inventario disponible para mostrar.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
              <h2 className="text-[11px] font-bold text-slate-400 mb-6 flex items-center uppercase tracking-widest relative z-10">Detalle Actual</h2>
              <div className="h-64 w-full relative z-10 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 z-20">
                    <tr className="border-b border-slate-700">
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proyecto</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Inv. (USD)</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Precio/m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenPrecios.map((item, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 text-[11px] font-bold text-slate-200">{item.nombre}</td>
                        <td className="py-3 text-[11px] font-medium text-amber-500 text-center">${item.valorInventario.toLocaleString()}</td>
                        <td className="py-3 text-[11px] font-black text-emerald-500 text-right">${item.ultimoPrecioUSD.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resumenPrecios.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm italic mt-10">Sin datos.</div>
                )}
              </div>
            </div>
          </div>

          {/* MAPA INTERACTIVO GLOBAL MULTI-PIN */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center tracking-tight">
                <MapPin className="w-5 h-5 mr-2 text-slate-600" /> Mapa del Portafolio
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
              <div className="lg:col-span-4 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d6d3d1 transparent' }}>
                {proyectosConDireccion.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-stone-500 text-sm italic text-center p-6 border-2 border-dashed border-stone-200 rounded-xl">
                    Aún no has agregado direcciones a tus proyectos.
                  </div>
                ) : (
                  proyectosConDireccion.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => enfocarProyectoEnMapa(item.id, item.direccion)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${proyectoActivoMapa === item.id ? 'bg-slate-50 border-slate-300 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-300'}`}
                    >
                      <h3 className={`font-bold text-sm ${proyectoActivoMapa === item.id ? 'text-slate-900' : 'text-slate-600'}`}>{item.nombre}</h3>
                      <p className="text-[10px] text-stone-500 mt-1 line-clamp-1 flex items-center"><Map className="w-3 h-3 mr-1"/> {item.direccion}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="lg:col-span-8 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center relative shadow-inner">
                {proyectosConDireccion.length > 0 ? (
                  <iframe 
                    id="mapa-global"
                    srcDoc={htmlMapa} 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy" 
                    className="absolute inset-0"
                  ></iframe>
                ) : (
                  <div className="text-stone-400 text-sm font-medium flex flex-col items-center">
                    <MapPin className="w-10 h-10 mb-2 opacity-50" /> Sin ubicaciones para mapear
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Espacio final */}
          <div className="pb-10"></div>

        </div>
      </main>
    </div>
  )
}
