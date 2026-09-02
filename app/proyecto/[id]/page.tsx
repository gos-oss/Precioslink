'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

// Cliente estándar de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Unidad {
  id: string
  identificador: string
  superficie_m2: number
  estado: 'disponible' | 'reservada' | 'vendida'
  porcentaje_aplicar?: number
  precio_lista_usd?: number
}

export default function ProyectoDetallePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'financiador' | 'cobros' | 'ubicacion'>('stock')
  
  // ==========================================
  // ESTADOS GLOBALES Y DE STOCK
  // ==========================================
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [tcActivo] = useState<number>(1530)
  const [precioSugeridoUSD] = useState<number>(1746.62)

  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [nuevaUnidad, setNuevaUnidad] = useState({
    identificador: '',
    superficie_m2: '',
    estado: 'disponible' as 'disponible' | 'reservada' | 'vendida',
    porcentaje_aplicar: '100',
  })

  // ==========================================
  // ESTADOS DEL FINANCIADOR (COTIZADOR)
  // ==========================================
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'PESOS'>('USD')
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState<number>(30)
  const [pagoEntrega, setPagoEntrega] = useState<number>(0)
  const [cuotasEspera, setCuotasEspera] = useState<number>(24)
  const [cuotasPosesion, setCuotasPosesion] = useState<number>(18)
  const [tasaPosesion, setTasaPosesion] = useState<number>(1.15) // Coeficiente multiplicador (15% de recargo)

  // ==========================================
  // LÓGICA DE CARGA Y CÁLCULO DE STOCK
  // ==========================================
  useEffect(() => {
    async function fetchUnidades() {
      setLoading(true)
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .eq('id_proyecto', params.id)
        .order('identificador', { ascending: true })

      if (!error && data) {
        setUnidades(data)
      }
      setLoading(false)
    }

    if (params.id) {
      fetchUnidades()
    }
  }, [params.id])

  const unidadesDisponibles = unidades.filter((u) => u.estado === 'disponible')

  const m2Disponibles = unidadesDisponibles.reduce(
    (acc, u) => acc + Number(u.superficie_m2 || 0),
    0
  )

  const valorInventarioUSD = unidadesDisponibles.reduce((acc, u) => {
    if (u.precio_lista_usd && Number(u.precio_lista_usd) > 0) {
      return acc + Number(u.precio_lista_usd)
    }
    const coef = Number(u.porcentaje_aplicar ?? 100) / 100
    return acc + Number(u.superficie_m2 || 0) * precioSugeridoUSD * coef
  }, 0)

  const unidadesFiltradas = unidades.filter((u) => {
    if (filtroEstado === 'todos') return true
    return u.estado === filtroEstado
  })

  const handleAgregarUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaUnidad.identificador || !nuevaUnidad.superficie_m2) return

    const { data, error } = await supabase
      .from('unidades')
      .insert([
        {
          id_proyecto: params.id,
          identificador: nuevaUnidad.identificador,
          superficie_m2: Number(nuevaUnidad.superficie_m2),
          estado: nuevaUnidad.estado,
          porcentaje_aplicar: Number(nuevaUnidad.porcentaje_aplicar || 100),
        },
      ])
      .select()

    if (!error && data) {
      setUnidades([...unidades, data[0]])
      setNuevaUnidad({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
    }
  }

  // ==========================================
  // LÓGICA DE CÁLCULO DEL FINANCIADOR
  // ==========================================
  const unidadFinanciar = unidadesDisponibles.find(u => u.id === unidadSeleccionada)
  
  const precioListaUSD = unidadFinanciar 
    ? (unidadFinanciar.precio_lista_usd && Number(unidadFinanciar.precio_lista_usd) > 0
        ? Number(unidadFinanciar.precio_lista_usd)
        : Number(unidadFinanciar.superficie_m2) * precioSugeridoUSD * (Number(unidadFinanciar.porcentaje_aplicar || 100) / 100))
    : 0

  const precioMoneda = moneda === 'USD' ? precioListaUSD : precioListaUSD * tcActivo
  const montoAnticipo = precioMoneda * (porcentajeAnticipo / 100)
  const saldoAFinanciar = Math.max(0, precioMoneda - montoAnticipo - pagoEntrega)
  
  // Fórmula idéntica al Excel: Cuotas Equivalentes = Cuotas Espera + (Cuotas Posesión * Tasa)
  const cuotasEquivalentes = cuotasEspera + (cuotasPosesion * tasaPosesion)
  const valorCuotaEspera = cuotasEquivalentes > 0 ? (saldoAFinanciar / cuotasEquivalentes) : 0
  const valorCuotaPosesion = valorCuotaEspera * tasaPosesion

  // ==========================================
  // RENDERIZADO
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <Link href="/" className="text-amber-600 font-semibold text-sm hover:underline flex items-center gap-1 mb-2">
          ← VOLVER AL INICIO
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Panel de Proyecto</h1>
            <p className="text-slate-500 text-sm">Gestión de inventario y cotizaciones</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-right shadow-sm">
            <span className="text-xs text-slate-400 font-bold block uppercase">T.C. ACTIVO</span>
            <span className="text-xl font-bold text-amber-600">${tcActivo}</span>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="max-w-7xl mx-auto border-b border-slate-200 mb-6 flex gap-2">
        {(['pricing', 'stock', 'financiador', 'cobros', 'ubicacion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 text-sm font-bold uppercase flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-amber-500 text-amber-600 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ==========================================
          PESTAÑA: STOCK
          ========================================== */}
      {activeTab === 'stock' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Agregar Unidad */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-amber-500">+</span> AGREGAR UNIDAD
            </h3>
            <form onSubmit={handleAgregarUnidad} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  IDENTIFICADOR (EJ: 4º A)
                </label>
                <input
                  type="text"
                  value={nuevaUnidad.identificador}
                  onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, identificador: e.target.value })}
                  placeholder="SUBSUELO 1 - Cochera 12"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SUPERFICIE (M²)</label>
                <input
                  type="number"
                  step="0.01"
                  value={nuevaUnidad.superficie_m2}
                  onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, superficie_m2: e.target.value })}
                  placeholder="25.5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">% APLICAR / COEFICIENTE</label>
                <input
                  type="number"
                  step="0.1"
                  value={nuevaUnidad.porcentaje_aplicar}
                  onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, porcentaje_aplicar: e.target.value })}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ESTADO</label>
                <select
                  value={nuevaUnidad.estado}
                  onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, estado: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservada">Reservada</option>
                  <option value="vendida">Vendida</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm"
              >
                Guardar Unidad
              </button>
            </form>
          </div>

          {/* Tabla de Inventario */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                🔲 INVENTARIO ({unidades.length})
              </h3>

              <div className="bg-amber-50 border border-amber-200/60 text-amber-900 rounded-full px-4 py-1.5 text-xs font-extrabold flex items-center gap-2 shadow-sm">
                <span>LIBRE: {m2Disponibles.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
                <span className="text-amber-300">|</span>
                <span className="text-amber-700">${Math.round(valorInventarioUSD).toLocaleString('es-AR')}</span>
              </div>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase focus:outline-none"
              >
                <option value="todos">TODOS</option>
                <option value="disponible">DISPONIBLES</option>
                <option value="reservada">RESERVADAS</option>
                <option value="vendida">VENDIDAS</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold">
                    <th className="pb-3">Unidad</th>
                    <th className="pb-3">Superficie</th>
                    <th className="pb-3">% Aplicar</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Valor Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-semibold">
                        Cargando inventario...
                      </td>
                    </tr>
                  ) : unidadesFiltradas.length > 0 ? (
                    unidadesFiltradas.map((u) => {
                      const valorEstimado = u.precio_lista_usd && Number(u.precio_lista_usd) > 0
                        ? Number(u.precio_lista_usd)
                        : Number(u.superficie_m2 || 0) * precioSugeridoUSD * (Number(u.porcentaje_aplicar || 100) / 100)

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-bold text-slate-800">{u.identificador}</td>
                          <td className="py-3 text-slate-600">{u.superficie_m2} m²</td>
                          <td className="py-3 text-slate-600 font-bold">{u.porcentaje_aplicar || 100}%</td>
                          <td className="py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.estado === 'disponible'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : u.estado === 'reservada'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {u.estado}
                            </span>
                          </td>
                          <td className="py-3 text-right font-extrabold text-slate-900">
                            ${Math.round(valorEstimado).toLocaleString('es-AR')} USD
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        No hay unidades para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA: FINANCIADOR
          ========================================== */}
      {activeTab === 'financiador' && (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            💼 SIMULADOR DE FINANCIACIÓN
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Columna Izquierda: Parámetros */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">UNIDAD A COTIZAR (LIBRES)</label>
                <select 
                  value={unidadSeleccionada}
                  onChange={(e) => setUnidadSeleccionada(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50"
                >
                  <option value="">Seleccione una unidad...</option>
                  {unidadesDisponibles.map(u => (
                    <option key={u.id} value={u.id}>{u.identificador} - {u.superficie_m2} m²</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MONEDA</label>
                  <select 
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as 'USD' | 'PESOS')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="USD">Dólares (USD)</option>
                    <option value="PESOS">Pesos + CAC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">% ANTICIPO</label>
                  <input 
                    type="number" 
                    value={porcentajeAnticipo}
                    onChange={(e) => setPorcentajeAnticipo(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">PAGO A LA ENTREGA</label>
                <input 
                  type="number" 
                  value={pagoEntrega}
                  onChange={(e) => setPagoEntrega(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CUOTAS ESPERA</label>
                  <input 
                    type="number" 
                    value={cuotasEspera}
                    onChange={(e) => setCuotasEspera(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CUOTAS POS.</label>
                  <input 
                    type="number" 
                    value={cuotasPosesion}
                    onChange={(e) => setCuotasPosesion(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">COEF. POSESIÓN</label>
                  <input 
                    type="number"
                    step="0.01" 
                    value={tasaPosesion}
                    onChange={(e) => setTasaPosesion(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Resultados */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
              <h4 className="text-xs font-extrabold text-slate-400 mb-4 uppercase">Resumen del Plan</h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm font-semibold text-slate-600">Valor de Lista</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {moneda === 'USD' ? 'USD ' : '$'}{Math.round(precioMoneda).toLocaleString('es-AR')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm font-semibold text-slate-600">Anticipo ({porcentajeAnticipo}%)</span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {moneda === 'USD' ? 'USD ' : '$'}{Math.round(montoAnticipo).toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm font-semibold text-slate-600">Saldo a Financiar</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {moneda === 'USD' ? 'USD ' : '$'}{Math.round(saldoAFinanciar).toLocaleString('es-AR')}
                  </span>
                </div>

                {/* Detalle de Cuotas */}
                {cuotasEspera > 0 && (
                  <div className="bg-amber-50 p-4 rounded-lg mt-4 text-center border border-amber-100">
                    <span className="block text-[11px] font-bold text-amber-800 uppercase mb-1">
                      {cuotasEspera} CUOTAS DE ESPERA {moneda === 'PESOS' ? '(+ CAC)' : ''}
                    </span>
                    <span className="text-xl font-extrabold text-amber-900">
                      {moneda === 'USD' ? 'USD ' : '$'}{Math.round(valorCuotaEspera).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                {cuotasPosesion > 0 && (
                  <div className="bg-slate-200/50 p-4 rounded-lg mt-2 text-center border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      {cuotasPosesion} CUOTAS POSESIÓN {moneda === 'PESOS' ? '(+ CAC)' : ''}
                    </span>
                    <span className="text-xl font-extrabold text-slate-800">
                      {moneda === 'USD' ? 'USD ' : '$'}{Math.round(valorCuotaPosesion).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
