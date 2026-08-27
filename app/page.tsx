'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Settings, Building2, DollarSign, Activity, BarChart3, Briefcase, MapPin, Map, PieChart as PieChartIcon, Box, AlertTriangle, Wallet } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

const gradients = [
  'from-slate-700 to-slate-900',
  'from-emerald-700 to-teal-900',
  'from-amber-600 to-amber-800',
  'from-red-800 to-rose-950',
  'from-slate-600 to-slate-800',
  'from-stone-600 to-stone-900'
]

// COLORES DE ALTO CONTRASTE
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899', '#0ea5e9'];

// Generador del Motor del Mapa Múltiple (OpenStreetMap Libre)
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
        // Capa base 100% Libre y Gratuita (Sin marcas de agua)
        const map = L.map('map').setView([-26.82414, -65.2226], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const proyectos = ${proyectosStr};
        const markersData = {};
        const markersList = [];
        
        // Icono Dorado Elegante
        const myIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const cache = JSON.parse(localStorage.getItem('geocode_cache_v2') || '{}');

        // Escuchar clics para hacer zoom
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
            
            // Truco para mejorar la puntería del buscador si la dirección es muy corta
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
              
              // Pausa técnica
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
          
          if (cacheUpdated) {
            localStorage.setItem('geocode_cache_v2', JSON.stringify(cache));
          }

          // Ajustar cámara para que se vean todos los pines centrados
          if (markersList.length > 0) {
            map.fitBounds(markersList, { padding: [50, 50], maxZoom: 15 });
          }
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
  const [cargando, setCargando] = useState(true)
  
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>('todos')
  const [proyectoActivoMapa, setProyectoActivoMapa] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('fecha_referencia', { ascending: true })
      const { data: dataUnidades } = await supabase.from('unidades').select('*')

      if (dataProyectos) {
        setProyectos(dataProyectos)
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
  const datosTorta = resumenPrecios.filter(r => r.valorInventario > 0).sort((a, b) => b.valorInventario - a.valorInventario);
  const formatTooltipPie = (value: number) => [`$${value.toLocaleString()} USD`, 'Valor Inventario'];

  return (
    <main className="min-h-screen bg-stone-50 p-4 md:p-8 font-sans text-slate-900 selection:bg-amber-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ENCABEZADO LINK CON EL BANNER */}
        <div className="bg-slate-950 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center border-b-4 border-amber-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-6 w-full md:w-auto">
            <div className="flex-shrink-0 shadow-2xl flex items-center justify-center h-20 md:h-24 overflow-hidden rounded-lg border border-slate-700/50 bg-black">
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
            
            <div className="hidden lg:block border-l border-slate-700 pl-6">
              <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
                Comercialink Dashboard
              </h1>
              <p className="text-slate-400 mt-1 font-medium tracking-wide text-xs uppercase">
                Intelligence & Pricing
              </p>
            </div>
          </div>
          
          <div className="relative z-10 mt-6 md:mt-0 flex flex-wrap items-center gap-3">
            <Link href="/reporte" className="flex items-center bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg border border-slate-700 transition-all font-bold text-sm active:scale-95 shadow-md">
              <BarChart3 className="w-4 h-4 mr-2 text-amber-500" /> Generar Reporte
            </Link>
            <Link href="/configuracion" className="flex items-center bg-transparent hover:bg-white/5 text-slate-300 px-6 py-3 rounded-lg border border-slate-700 transition-all font-medium text-sm active:scale-95">
              <Settings className="w-4 h-4 mr-2" /> Parámetros
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-6 tracking-tight">Resumen</h2>
        </div>

        {/* KPIs SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex justify-between items-start transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                Total Proyectos
              </p>
              <div className="flex items-baseline">
                <p className="text-4xl font-bold text-slate-800 font-serif">{proyectos.length}</p>
                <span className="text-xl text-slate-800 font-serif ml-2">activos</span>
              </div>
            </div>
            <div className="bg-stone-100 p-3 rounded-lg">
              <Briefcase className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex justify-between items-start transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                Promedio Portafolio
              </p>
              <div className="flex items-baseline text-emerald-700">
                <span className="text-xl font-serif mr-2">$</span>
                <p className="text-4xl font-bold font-serif">{precioPromedioPortafolio.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <Wallet className="w-5 h-5 text-emerald-700" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex justify-between items-start transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                Inventario Disponible
              </p>
              <div className="flex items-baseline text-red-800">
                <span className="text-xl font-serif mr-2">$</span>
                <p className="text-4xl font-bold font-serif">{valorTotalInventario.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-800" />
            </div>
          </div>
        </div>

        {/* GRID DE PANELES CENTRALES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          
          <div className="bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
            <h2 className="text-[11px] font-bold text-slate-400 mb-6 flex items-center uppercase tracking-widest relative z-10">Ranking Precios (USD/m²)</h2>
            <div className="h-72 w-full relative z-10">
              {resumenPrecios.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumenPrecios} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="nombre" type="category" width={90} tick={{ fill: '#f8fafc', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} />
                    <Bar dataKey="ultimoPrecioUSD" fill="#0f766e" radius={[0, 4, 4, 0]} name="Precio USD/m²" barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">Sin datos.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Evolución Histórica</h2>
              <select 
                value={proyectoSeleccionadoId} 
                onChange={(e) => setProyectoSeleccionadoId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded p-1 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="fecha" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} itemStyle={{ color: '#d97706', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="resultado_precio_promedio_usd" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorPrecio)" activeDot={{ r: 6, strokeWidth: 0, fill: '#d97706' }} name="Precio USD/m²" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">Sin historial para este proyecto.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
            <h2 className="text-[11px] font-bold text-slate-400 mb-6 flex items-center uppercase tracking-widest relative z-10">
              <PieChartIcon className="w-4 h-4 mr-2" /> Participación de Inventario
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
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">Sin inventario disponible para mostrar.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
            <h2 className="text-[11px] font-bold text-slate-400 mb-6 flex items-center uppercase tracking-widest relative z-10">Detalle Actual</h2>
            <div className="h-72 w-full relative z-10 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
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
                      <td className="py-3 text-xs font-bold text-slate-200">{item.nombre}</td>
                      <td className="py-3 text-xs font-medium text-amber-500 text-center">${item.valorInventario.toLocaleString()}</td>
                      <td className="py-3 text-xs font-black text-emerald-500 text-right">${item.ultimoPrecioUSD.toLocaleString()}</td>
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
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 mt-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center tracking-tight">
              <MapPin className="w-5 h-5 mr-3 text-slate-600" /> Mapa de Desarrollos
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px]">
            <div className="lg:col-span-4 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d6d3d1 transparent' }}>
              {proyectosConDireccion.length === 0 ? (
                <div className="h-full flex items-center justify-center text-stone-500 text-sm italic text-center p-6 border-2 border-dashed border-stone-200 rounded-xl">
                  Aún no has agregado direcciones a tus proyectos. Ve a la pestaña "Ubicación" dentro de un proyecto para agregarlas.
                </div>
              ) : (
                proyectosConDireccion.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => enfocarProyectoEnMapa(item.id, item.direccion)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${proyectoActivoMapa === item.id ? 'bg-slate-50 border-slate-300 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-300'}`}
                  >
                    <h3 className={`font-bold text-sm ${proyectoActivoMapa === item.id ? 'text-slate-900' : 'text-slate-600'}`}>{item.nombre}</h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-1 flex items-center"><Map className="w-3 h-3 mr-1"/> {item.direccion}</p>
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="font-semibold text-stone-400">Desde ${item.ultimoPrecioUSD}/m²</span>
                      <span className="text-amber-600 font-bold">Ver en mapa &rarr;</span>
                    </div>
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

        {/* PORTAFOLIO DE PROYECTOS (TARJETAS) */}
        <div className="pt-8">
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6 flex items-center tracking-tight">
            Portafolio de Proyectos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {proyectos.map((proyecto, index) => {
              const resumen = resumenPrecios.find(r => r.id === proyecto.id)
              const gradientClass = gradients[index % gradients.length]
              
              return (
                <Link key={proyecto.id} href={`/proyecto/${proyecto.id}`} className="group bg-white rounded-2xl border border-stone-200 hover:shadow-lg transition-all duration-300 flex flex-col h-56 cursor-pointer overflow-hidden transform hover:-translate-y-1">
                  <div className={`h-16 w-full bg-gradient-to-r ${gradientClass} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-amber-600 transition-colors tracking-tight line-clamp-1">{proyecto.nombre}</h3>
                      {resumen ? (
                        <div className="mt-3">
                          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Último estimado</p>
                          <p className="font-black text-slate-900 text-2xl mt-1 tracking-tight">${resumen.ultimoPrecioUSD.toLocaleString()} <span className="text-xs font-semibold text-stone-400">/m²</span></p>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Estado</p>
                          <p className="font-semibold text-stone-500 text-sm mt-1">Sin configurar</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center text-amber-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
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
