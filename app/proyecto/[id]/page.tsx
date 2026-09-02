'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

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

interface Operacion {
  id: string
  id_unidad: string
  cliente_nombre: string
  moneda: string
  precio_total: number
  monto_anticipo: number
  saldo_financiado: number
  estado: string
  created_at: string
}

export default function ProyectoDetallePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'financiador' | 'cobros' | 'ubicacion'>('pricing')
  
  // ==========================================
  // ESTADOS GLOBALES Y DE STOCK
  // ==========================================
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [tcActivo] = useState<number>(1530)
  const [precioSugeridoUSD] = useState<number>(1746.62)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [operaciones, setOperaciones] = useState<Operacion[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [nuevaUnidad, setNuevaUnidad] = useState({
    identificador: '',
    superficie_m2: '',
    estado: 'disponible' as 'disponible' | 'reservada' | 'vendida',
    porcentaje_aplicar: '100',
  })

  // ==========================================
  // ESTADOS DEL FINANCIADOR
  // ==========================================
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'PESOS'>('USD')
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState<number>(30)
  const [pagoEntrega, setPagoEntrega] = useState<number>(0)
  const [cuotasEspera, setCuotasEspera] = useState<number>(24)
  const [cuotasPosesion, setCuotasPosesion] = useState<number>(18)
  const [tasaPosesion, setTasaPosesion] = useState<number>(1.15) 

  // ==========================================
  // CARGA DE DATOS (STOCK Y OPERACIONES)
  // ==========================================
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      // Traer unidades
      const { data: dataUnidades } = await supabase
        .from('unidades')
        .select('*')
        .eq('id_proyecto', params.id)
        .order('identificador', { ascending: true })

      if (dataUnidades) setUnidades(dataUnidades)

      // Traer operaciones (Cuentas Corrientes)
      const { data: dataOperaciones } = await supabase
        .from('operaciones')
        .select('*')
        .eq('id_proyecto', params.id)
        .order('created_at', { ascending: false })

      if (dataOperaciones) setOperaciones(dataOperaciones)

      setLoading(false)
    }
    if (params.id) fetchData()
  }, [params.id])

  const unidadesDisponibles = unidades.filter((u) => u.estado === 'disponible')
  
  const m2Disponibles = unidadesDisponibles.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0)
  
  const valorInventarioUSD = unidadesDisponibles.reduce((acc, u) => {
    if (u.precio_lista_usd && Number(u.precio_lista_usd) > 0) return acc + Number(u.precio_lista_usd)
    const coef = Number(u.porcentaje_aplicar ?? 100) / 100
    return acc + Number(u.superficie_m2 || 0) * precioSugeridoUSD * coef
  }, 0)

  const unidadesFiltradas = unidades.filter((u) => {
    if (filtroEstado === 'todos') return true
    return u.estado === filtroEstado
  })

  // ==========================================
  // AGREGAR NUEVA UNIDAD
  // ==========================================
  const handleAgregarUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaUnidad.identificador || !nuevaUnidad.superficie_m2) return
    const { data, error } = await supabase.from('unidades').insert([{
      id_proyecto: params.id,
      identificador: nuevaUnidad.identificador,
      superficie_m2: Number(nuevaUnidad.superficie_m2),
      estado: nuevaUnidad.estado,
      porcentaje_aplicar: Number(nuevaUnidad.porcentaje_aplicar || 100),
    }]).select()
    if (!error && data) {
      setUnidades([...unidades, data[0]])
      setNuevaUnidad({ identificador: '', superficie_m2: '', estado: 'disponible', porcentaje_aplicar: '100' })
    }
  }

  // ==========================================
  // CÁLCULOS DEL FINANCIADOR
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
  
  const cuotasEquivalentes = cuotasEspera + (cuotasPosesion * tasaPosesion)
  const valorCuotaEspera = cuotasEquivalentes > 0 ? (saldoAFinanciar / cuotasEquivalentes) : 0
  const valorCuotaPosesion = valorCuotaEspera * tasaPosesion

  // ==========================================
  // REGISTRAR VENTA Y GENERAR CUOTAS
  // ==========================================
  const handleRegistrarVenta = async () => {
    if (!unidadSeleccionada) return alert("Seleccione una unidad.");
    if (!window.confirm("¿Confirmar venta y generar Cuenta Corriente?")) return;

    // 1. Guardar la Operación
    const { data: opData, error: opError } = await supabase
      .from('operaciones')
      .insert([{
        id_proyecto: params.id,
        id_unidad: unidadSeleccionada,
        moneda: moneda,
        precio_total: precioMoneda,
        monto_anticipo: montoAnticipo,
        pago_entrega: pagoEntrega,
        saldo_financiado: saldoAFinanciar
      }])
      .select()

    if (opError || !opData) {
      console.error(opError)
      return alert("Error al guardar la operación.");
    }

    const idOperacion = opData[0].id

    // 2. Generar las Cuotas
    const cuotasToInsert = []
    let fechaVencimiento = new Date()

    // Cuotas de Espera
    for (let i = 1; i <= cuotasEspera; i++) {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1)
      cuotasToInsert.push({
        id_operacion: idOperacion,
        numero_cuota: i,
        tipo_cuota: 'ESPERA',
        monto_base: valorCuotaEspera,
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0]
      })
    }

    // Cuotas de Posesión
    for (let i = 1; i <= cuotasPosesion; i++) {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1)
      cuotasToInsert.push({
        id_operacion: idOperacion,
        numero_cuota: cuotasEspera + i,
        tipo_cuota: 'POSESION',
        monto_base: valorCuotaPosesion,
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0]
      })
    }

    if (cuotasToInsert.length > 0) {
      await supabase.from('cuotas').insert(cuotasToInsert)
    }

    // 3. Marcar Unidad como Vendida
    await supabase.from('unidades').update({ estado: 'vendida' }).eq('id', unidadSeleccionada)

    // 4. Actualizar estado local
    setUnidades(unidades.map(u => u.id === unidadSeleccionada ? { ...u, estado: 'vendida' } : u))
    setOperaciones([opData[0], ...operaciones])
    setUnidadSeleccionada('')

    alert("✅ Venta registrada y plan de cuotas generado con éxito.");
    setActiveTab('cobros');
  }

  // ==========================================
  // RENDERIZADO
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-6 print:p-0 print:bg-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 print:hidden">
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
      <div className="max-w-7xl mx-auto border-b border-slate-200 mb-6 flex gap-2 print:hidden">
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
          PESTAÑA: PRICING (RESTAURADA)
          ========================================== */}
      {activeTab === 'pricing' && (
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            📊 PARÁMETROS DE PRICING GLOBAL
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Tarjeta: T.C. Activo */}
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 shadow-sm">
              <label className="block text-xs font-bold text-amber-800 mb-2 uppercase">Tipo de Cambio (T.C. Activo)</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-600">$</span>
                <input 
                  type="number" 
                  value={tcActivo} 
                  disabled
                  className="w-full px-0 py-2 border-none bg-transparent text-4xl font-extrabold text-amber-900 focus:ring-0" 
                />
              </div>
              <p className="text-sm text-amber-700/80 mt-3 font-medium">
                Se utiliza para pesificar los valores en el cotizador y calcular el saldo inicial en pesos.
              </p>
            </div>

            {/* Tarjeta: Precio Sugerido USD */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Precio Base (USD / M²)</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-400">USD</span>
                <input 
                  type="number" 
                  value={precioSugeridoUSD} 
                  disabled
                  className="w-full px-0 py-2 border-none bg-transparent text-4xl font-extrabold text-slate-800 focus:ring-0" 
                />
              </div>
              <p className="text-sm text-slate-500 mt-3 font-medium">
                Valor base por metro cuadrado. Se multiplicará por el coeficiente de cada unidad en el stock.
              </p>
            </div>
            
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA: STOCK
          ========================================== */}
      {activeTab === 'stock' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {/* Formulario Agregar Unidad (COMPLETO) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-amber-500">+</span> AGREGAR UNIDAD
            </h3>
            <form onSubmit={handleAgregarUnidad} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">IDENTIFICADOR (EJ: 4º A)</label>
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

          {/* Tabla de Inventario (COMPLETA) */}
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
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-extrabold text-slate-800">💼 PRESUPUESTO</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">UNIDAD A COTIZAR</label>
                <select value={unidadSeleccionada} onChange={(e) => setUnidadSeleccionada(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-semibold print:appearance-none">
                  <option value="">Seleccione...</option>
                  {unidadesDisponibles.map(u => <option key={u.id} value={u.id}>{u.identificador} - {u.superficie_m2} m²</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MONEDA</label>
                  <select value={moneda} onChange={(e) => setMoneda(e.target.value as 'USD'|'PESOS')} className="w-full px-3 py-2 border rounded-lg text-sm print:appearance-none">
                    <option value="USD">USD</option><option value="PESOS">Pesos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">% ANTICIPO</label>
                  <input type="number" value={porcentajeAnticipo} onChange={(e) => setPorcentajeAnticipo(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm print:border-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CUOTAS ESPERA</label>
                  <input type="number" value={cuotasEspera} onChange={(e) => setCuotasEspera(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm print:border-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CUOTAS POSESIÓN</label>
                  <input type="number" value={cuotasPosesion} onChange={(e) => setCuotasPosesion(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm print:border-none" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border print:border-slate-300">
              <h4 className="text-xs font-extrabold text-slate-400 mb-4 uppercase">Resumen</h4>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm font-semibold">Valor Lista</span>
                  <span className="text-sm font-extrabold">{moneda} {Math.round(precioMoneda).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm font-semibold">Anticipo</span>
                  <span className="text-sm font-extrabold text-emerald-600">{moneda} {Math.round(montoAnticipo).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between border-b pb-2 bg-amber-50 p-2">
                  <span className="text-sm font-semibold">Saldo a Financiar</span>
                  <span className="text-sm font-extrabold">{moneda} {Math.round(saldoAFinanciar).toLocaleString('es-AR')}</span>
                </div>
                {cuotasEspera > 0 && (
                  <div className="bg-amber-100 p-4 rounded-lg text-center">
                    <span className="block text-[11px] font-bold uppercase mb-1">{cuotasEspera} CUOTAS DE ESPERA</span>
                    <span className="text-xl font-extrabold text-amber-900">{moneda} {Math.round(valorCuotaEspera).toLocaleString('es-AR')}</span>
                  </div>
                )}
                {cuotasPosesion > 0 && (
                  <div className="bg-slate-200 p-4 rounded-lg text-center mt-2">
                    <span className="block text-[11px] font-bold uppercase mb-1">{cuotasPosesion} CUOTAS POSESIÓN</span>
                    <span className="text-xl font-extrabold">{moneda} {Math.round(valorCuotaPosesion).toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t flex justify-end gap-4 print:hidden">
            <button onClick={() => window.print()} disabled={!unidadSeleccionada} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700">🖨️ Imprimir</button>
            <button onClick={handleRegistrarVenta} disabled={!unidadSeleccionada} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-500 text-white hover:bg-amber-600">✅ Registrar Venta</button>
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA: COBROS (CTA CTE)
          ========================================== */}
      {activeTab === 'cobros' && (
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            🪙 CUENTAS CORRIENTES Y COBROS
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-xs">
                  <th className="pb-3">Unidad</th>
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Moneda / Índice</th>
                  <th className="pb-3 text-right">Total Venta</th>
                  <th className="pb-3 text-right">Saldo Financiado</th>
                  <th className="pb-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operaciones.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Aún no hay ventas registradas.</td></tr>
                ) : (
                  operaciones.map(op => {
                    const uni = unidades.find(u => u.id === op.id_unidad)
                    return (
                      <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-bold text-slate-800">{uni ? uni.identificador : 'Desconocida'}</td>
                        <td className="py-4 font-semibold text-slate-600">{op.cliente_nombre || 'Sin Nombre'}</td>
                        <td className="py-4">
                          <span className="font-bold text-slate-700">{op.moneda}</span>
                          <span className="text-xs text-slate-400 ml-1">({(op as any).indice_actualizacion || 'N/A'})</span>
                        </td>
                        <td className="py-4 text-right">${Number(op.precio_total).toLocaleString('es-AR')}</td>
                        <td className="py-4 text-right font-extrabold text-amber-600">${Number(op.saldo_financiado).toLocaleString('es-AR')}</td>
                        <td className="py-4 text-center">
                          <button className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition-colors">
                            Ver Cuotas
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
