'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface Unidad {
  id: string
  identificador: string
  superficie_m2: number
  estado: 'disponible' | 'reservada' | 'vendida'
  porcentaje_aplicar?: number
  precio_lista_usd?: number
}

interface ResultadosPricing {
  precioSugeridoUSD: number
}

export default function ProyectoDetallePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'financiador' | 'cobros' | 'ubicacion'>('stock')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  
  // Datos del proyecto y pricing
  const [tcActivo] = useState<number>(1530)
  const [resultados] = useState<ResultadosPricing>({ precioSugeridoUSD: 1746.62 })
  
  const [unidades, setUnidades] = useState<Unidad[]>([
    { id: '1', identificador: 'SUBSUELO 1 - Cochera 11', superficie_m2: 32.02, estado: 'disponible', porcentaje_aplicar: 54.3, precio_lista_usd: 25311 },
    { id: '2', identificador: 'SUBSUELO 2 - Cochera 28', superficie_m2: 27.19, estado: 'disponible', porcentaje_aplicar: 52.8, precio_lista_usd: 20878 },
    { id: '3', identificador: 'SUBSUELO 2 - Cochera 29', superficie_m2: 21.75, estado: 'disponible', porcentaje_aplicar: 60.3, precio_lista_usd: 19089 },
  ])

  // Formulario nueva unidad
  const [nuevaUnidad, setNuevaUnidad] = useState({
    identificador: '',
    superficie_m2: '',
    estado: 'disponible' as 'disponible' | 'reservada' | 'vendida',
    porcentaje_aplicar: '100',
  })

  // Filtros de unidades disponibles
  const unidadesDisponibles = unidades.filter((u) => u.estado === 'disponible')
  
  const m2Disponibles = unidadesDisponibles.reduce(
    (acc, u) => acc + Number(u.superficie_m2 || 0),
    0
  )

  // Cálculo exacto del valor de inventario libre
  const valorInventarioUSD = unidadesDisponibles.reduce((acc, u) => {
    if (u.precio_lista_usd && Number(u.precio_lista_usd) > 0) {
      return acc + Number(u.precio_lista_usd)
    }
    const coef = Number(u.porcentaje_aplicar ?? 100) / 100
    const precioBase = resultados?.precioSugeridoUSD || 0
    return acc + Number(u.superficie_m2 || 0) * precioBase * coef
  }, 0)

  const unidadesFiltradas = unidades.filter((u) => {
    if (filtroEstado === 'todos') return true
    return u.estado === filtroEstado
  })

  const handleAgregarUnidad = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaUnidad.identificador || !nuevaUnidad.superficie_m2) return

    const nueva: Unidad = {
      id: Date.now().toString(),
      identificador: nuevaUnidad.identificador,
      superficie_m2: Number(nuevaUnidad.superficie_m2),
      estado: nuevaUnidad.estado,
      porcentaje_aplicar: Number(nuevaUnidad.porcentaje_aplicar || 100),
    }

    setUnidades([...unidades, nueva])
    setNuevaUnidad({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <Link href="/portafolio" className="text-amber-600 font-semibold text-sm hover:underline flex items-center gap-1 mb-2">
          ← VOLVER AL PORTAFOLIO
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">#300 Corpo</h1>
            <p className="text-slate-500 text-sm">Carga inicial desde matriz de precios</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-right shadow-sm">
            <span className="text-xs text-slate-400 font-bold block uppercase">T.C. ACTIVO</span>
            <span className="text-xl font-bold text-amber-600">${tcActivo}</span>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="max-w-7xl mx-auto border-b border-slate-200 mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pricing'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🏷️ PRICING
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'stock'
              ? 'border-amber-500 text-amber-600 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔲 STOCK
        </button>
        <button
          onClick={() => setActiveTab('financiador')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'financiador'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          💼 FINANCIADOR
        </button>
        <button
          onClick={() => setActiveTab('cobros')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cobros'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🪙 CTA CTE (COBROS)
        </button>
        <button
          onClick={() => setActiveTab('ubicacion')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'ubicacion'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🗺️ UBICACIÓN
        </button>
      </div>

      {/* Contenido Pestaña Stock */}
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

              {/* Badge inventario libre */}
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
                  {unidadesFiltradas.length > 0 ? (
                    unidadesFiltradas.map((u) => {
                      const valorEstimado = u.precio_lista_usd
                        ? u.precio_lista_usd
                        : Number(u.superficie_m2) * resultados.precioSugeridoUSD * (Number(u.porcentaje_aplicar || 100) / 100)

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
    </div>
  )
}
