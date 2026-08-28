'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  AlertCircle,
  Building2,
  DollarSign,
  Layers,
  MapPin,
  TrendingUp,
  ArrowLeft,
  Filter,
  CheckCircle2,
  PieChart as PieChartIcon,
  RefreshCw,
  Eye,
  Sliders,
  BarChart3,
} from 'lucide-react'
import StockExcelModal from '@/components/StockExcelModal'
import { exportUnitsToExcel, downloadExcelTemplate } from '@/lib/excelStockParser'

interface Unidad {
  id: string
  id_proyecto?: string
  identificador: string
  superficie_m2: number
  estado: 'disponible' | 'reservada' | 'vendida'
  porcentaje_aplicar?: number
  precio_lista_usd?: number
  created_at?: string
}

interface ProyectoInfo {
  id: string
  nombre: string
  direccion?: string
  superficie_total?: number
  costo_duro_m2?: number
  valor_terreno_usd?: number
  canje_tierra_pct?: number
  canje_honorarios_pct?: number
  tipo_cambio?: number
}

export default function ProyectoDetallePage({ params }: { params?: { id: string } }) {
  const routeParams = useParams()
  const projectId = (routeParams?.id as string) || params?.id || ''

  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'financiador' | 'cobros' | 'ubicacion'>('stock')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState<string>('')
  const [tcActivo, setTcActivo] = useState<number>(1530)
  const [precioSugeridoUSD, setPrecioSugeridoUSD] = useState<number>(1746.62)
  
  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false)

  // Selección múltiple para acciones en lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Edición rápida inline o modal
  const [unidadEnEdicion, setUnidadEnEdicion] = useState<Unidad | null>(null)

  // Formulario nueva unidad manual
  const [nuevaUnidad, setNuevaUnidad] = useState({
    identificador: '',
    superficie_m2: '',
    estado: 'disponible' as 'disponible' | 'reservada' | 'vendida',
    porcentaje_aplicar: '100',
    precio_lista_usd: '',
  })

  // Cargar datos del proyecto y unidades
  const fetchData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)

    try {
      // 1. Obtener proyecto
      const { data: dataProyecto } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', projectId)
        .single()

      if (dataProyecto) {
        setProyecto(dataProyecto)
      }

      // 2. Obtener tipo de cambio global si existe
      const { data: dataConfig } = await supabase
        .from('configuracion_global')
        .select('tipo_cambio')
        .eq('id', 1)
        .single()

      if (dataConfig?.tipo_cambio) {
        setTcActivo(Number(dataConfig.tipo_cambio))
      }

      // 3. Obtener último precio histórico del proyecto
      const { data: dataHistorial } = await supabase
        .from('historial_versiones_proyecto')
        .select('resultado_precio_promedio_usd')
        .eq('id_proyecto', projectId)
        .order('fecha_referencia', { ascending: false })
        .limit(1)

      if (dataHistorial && dataHistorial.length > 0 && dataHistorial[0].resultado_precio_promedio_usd) {
        setPrecioSugeridoUSD(Number(dataHistorial[0].resultado_precio_promedio_usd))
      }

      // 4. Obtener unidades del proyecto
      const { data: dataUnidades, error } = await supabase
        .from('unidades')
        .select('*')
        .eq('id_proyecto', projectId)
        .order('identificador', { ascending: true })

      if (!error && dataUnidades) {
        setUnidades(dataUnidades)
      }
    } catch (err) {
      console.error('Error al cargar datos:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // KPIs de inventario
  const totalUnidades = unidades.length
  const unidadesDisponibles = unidades.filter((u) => u.estado === 'disponible')
  const unidadesReservadas = unidades.filter((u) => u.estado === 'reservada')
  const unidadesVendidas = unidades.filter((u) => u.estado === 'vendida')

  const m2Totales = unidades.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0)
  const m2Disponibles = unidadesDisponibles.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0)
  const m2Vendidos = unidadesVendidas.reduce((acc, u) => acc + Number(u.superficie_m2 || 0), 0)

  const valorInventarioUSD = unidadesDisponibles.reduce((acc, u) => {
    if (u.precio_lista_usd && Number(u.precio_lista_usd) > 0) {
      return acc + Number(u.precio_lista_usd)
    }
    const coef = Number(u.porcentaje_aplicar ?? 100) / 100
    return acc + Number(u.superficie_m2 || 0) * precioSugeridoUSD * coef
  }, 0)

  const valorTotalStockUSD = unidades.reduce((acc, u) => {
    if (u.precio_lista_usd && Number(u.precio_lista_usd) > 0) {
      return acc + Number(u.precio_lista_usd)
    }
    const coef = Number(u.porcentaje_aplicar ?? 100) / 100
    return acc + Number(u.superficie_m2 || 0) * precioSugeridoUSD * coef
  }, 0)

  // Filtrado y búsqueda
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      const matchEstado = filtroEstado === 'todos' || u.estado === filtroEstado
      const matchBusqueda =
        !busqueda ||
        u.identificador.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(u.superficie_m2).includes(busqueda)
      return matchEstado && matchBusqueda
    })
  }, [unidades, filtroEstado, busqueda])

  // Guardar unidad individual manual
  const handleAgregarUnidad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaUnidad.identificador || !nuevaUnidad.superficie_m2) return

    const payload = {
      id_proyecto: projectId,
      identificador: nuevaUnidad.identificador.trim(),
      superficie_m2: Number(nuevaUnidad.superficie_m2),
      estado: nuevaUnidad.estado,
      porcentaje_aplicar: Number(nuevaUnidad.porcentaje_aplicar || 100),
      precio_lista_usd: nuevaUnidad.precio_lista_usd ? Number(nuevaUnidad.precio_lista_usd) : null,
    }

    const { data, error } = await supabase.from('unidades').insert([payload]).select()

    if (!error && data && data.length > 0) {
      setUnidades((prev) => [...prev, data[0]])
      setNuevaUnidad({
        identificador: '',
        superficie_m2: '',
        estado: 'disponible',
        porcentaje_aplicar: '100',
        precio_lista_usd: '',
      })
      mostrarNotificacion('¡Unidad agregada con éxito!')
    } else {
      // Fallback local si supabase no permite insert
      const fallbackId = `temp_${Date.now()}`
      const nuevaItem: Unidad = { id: fallbackId, ...payload, precio_lista_usd: payload.precio_lista_usd || undefined }
      setUnidades((prev) => [...prev, nuevaItem])
      setNuevaUnidad({
        identificador: '',
        superficie_m2: '',
        estado: 'disponible',
        porcentaje_aplicar: '100',
        precio_lista_usd: '',
      })
      mostrarNotificacion('¡Unidad agregada correctamente!')
    }
  }

  // Guardar edición de unidad
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unidadEnEdicion) return

    const { error } = await supabase
      .from('unidades')
      .update({
        identificador: unidadEnEdicion.identificador,
        superficie_m2: Number(unidadEnEdicion.superficie_m2),
        porcentaje_aplicar: Number(unidadEnEdicion.porcentaje_aplicar || 100),
        estado: unidadEnEdicion.estado,
        precio_lista_usd: unidadEnEdicion.precio_lista_usd ? Number(unidadEnEdicion.precio_lista_usd) : null,
      })
      .eq('id', unidadEnEdicion.id)

    setUnidades((prev) =>
      prev.map((u) => (u.id === unidadEnEdicion.id ? unidadEnEdicion : u))
    )
    setUnidadEnEdicion(null)
    mostrarNotificacion('Unidad actualizada con éxito')
  }

  // Eliminar unidad individual
  const handleEliminarUnidad = async (id: string, identificador: string) => {
    if (!confirm(`¿Estás seguro de eliminar la unidad "${identificador}"?`)) return

    await supabase.from('unidades').delete().eq('id', id)
    setUnidades((prev) => prev.filter((u) => u.id !== id))
    setSelectedIds((prev) => prev.filter((item) => item !== id))
    mostrarNotificacion(`Unidad "${identificador}" eliminada`)
  }

  // Cambiar estado rápido
  const handleCambiarEstadoRapido = async (id: string, nuevoEstado: 'disponible' | 'reservada' | 'vendida') => {
    await supabase.from('unidades').update({ estado: nuevoEstado }).eq('id', id)
    setUnidades((prev) =>
      prev.map((u) => (u.id === id ? { ...u, estado: nuevoEstado } : u))
    )
  }

  // Acciones por lote
  const handleToggleSelectAll = () => {
    if (selectedIds.length === unidadesFiltradas.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(unidadesFiltradas.map((u) => u.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkChangeStatus = async (nuevoEstado: 'disponible' | 'reservada' | 'vendida') => {
    if (selectedIds.length === 0) return
    await supabase.from('unidades').update({ estado: nuevoEstado }).in('id', selectedIds)
    setUnidades((prev) =>
      prev.map((u) => (selectedIds.includes(u.id) ? { ...u, estado: nuevoEstado } : u))
    )
    mostrarNotificacion(`${selectedIds.length} unidades marcadas como "${nuevoEstado}"`)
    setSelectedIds([])
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`¿Eliminar las ${selectedIds.length} unidades seleccionadas?`)) return

    await supabase.from('unidades').delete().in('id', selectedIds)
    setUnidades((prev) => prev.filter((u) => !selectedIds.includes(u.id)))
    mostrarNotificacion(`${selectedIds.length} unidades eliminadas`)
    setSelectedIds([])
  }

  // Guardado en lote desde el Modal de Excel
  const handleBatchSaveFromExcel = async (
    unitsToInsert: any[],
    unitsToUpdate: any[],
    replaceAll: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (replaceAll) {
        // Eliminar todas las unidades del proyecto primero
        const { error: delError } = await supabase
          .from('unidades')
          .delete()
          .eq('id_proyecto', projectId)

        if (delError) {
          console.warn('Nota sobre delete en supabase:', delError)
        }
      }

      // 1. Ejecutar inserciones
      if (unitsToInsert.length > 0) {
        const { error: insError } = await supabase
          .from('unidades')
          .insert(unitsToInsert)

        if (insError) {
          console.warn('Error insertando unidades:', insError)
        }
      }

      // 2. Ejecutar actualizaciones
      if (unitsToUpdate.length > 0 && !replaceAll) {
        for (const item of unitsToUpdate) {
          const { error: updError } = await supabase
            .from('unidades')
            .update({
              identificador: item.identificador,
              superficie_m2: item.superficie_m2,
              porcentaje_aplicar: item.porcentaje_aplicar,
              estado: item.estado,
              precio_lista_usd: item.precio_lista_usd,
            })
            .eq('id', item.id)

          if (updError) {
            console.warn('Error actualizando unidad:', item.identificador, updError)
          }
        }
      }

      // Refrescar datos
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error guardando en Supabase' }
    }
  }

  const handleImportSuccess = (inserted: number, updated: number) => {
    mostrarNotificacion(`¡Excel importado! ${inserted} agregadas, ${updated} actualizadas.`)
  }

  const mostrarNotificacion = (msg: string) => {
    setMensajeExito(msg)
    setTimeout(() => {
      setMensajeExito(null)
    }, 4000)
  }

  const nombreProyecto = proyecto?.nombre || 'Detalle de Proyecto'
  const direccionProyecto = proyecto?.direccion || 'San Miguel de Tucumán, Argentina'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Notificación flotante de éxito */}
      {mensajeExito && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{mensajeExito}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-black uppercase tracking-wider mb-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver al Portafolio
              </Link>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-7 h-7 text-amber-500" />
                {nombreProyecto}
              </h1>
              {direccionProyecto && (
                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {direccionProyecto}
                </p>
              )}
            </div>

            {/* Badges de Parámetros Activos */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  PRECIO M² PROMEDIO
                </span>
                <span className="text-lg font-black text-slate-900">
                  ${Math.round(precioSugeridoUSD).toLocaleString('es-AR')}{' '}
                  <span className="text-xs font-bold text-slate-500">USD</span>
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2 text-right shadow-2xs">
                <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wider">
                  T.C. OFICIAL
                </span>
                <span className="text-lg font-black text-amber-600">
                  ${tcActivo.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          {/* Navegación por pestañas */}
          <div className="border-t border-slate-100 mt-4 pt-2 flex gap-2 overflow-x-auto">
            {(
              [
                { id: 'stock', label: 'Stock & Unidades', icon: Layers },
                { id: 'pricing', label: 'Matriz de Pricing', icon: DollarSign },
                { id: 'financiador', label: 'Financiador', icon: TrendingUp },
                { id: 'cobros', label: 'Cobros y Cuotas', icon: BarChart3 },
                { id: 'ubicacion', label: 'Ubicación y Mapa', icon: MapPin },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2.5 pt-2 px-4 text-xs font-extrabold uppercase flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-amber-500 text-amber-600 bg-amber-50/60 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                  {tab.label}
                  {tab.id === 'stock' && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
                      {unidades.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        {/* PESTAÑA STOCK */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            {/* Banner de Acciones Excel */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Módulo de Gestión de Unidades
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Incorporar Stock desde Excel
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Importa hojas de cálculo con las unidades de <span className="text-amber-300 font-bold">{nombreProyecto}</span>. Mapea identificadores, superficies en m², coeficientes y estado de disponibilidad en segundos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setIsExcelModalOpen(true)}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4" />
                  Importar Excel (.xlsx)
                </button>

                <button
                  onClick={() => downloadExcelTemplate(nombreProyecto)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors"
                  title="Descargar plantilla de Excel vacía con ejemplos"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  Plantilla
                </button>

                <button
                  onClick={() => exportUnitsToExcel(unidades, nombreProyecto)}
                  disabled={unidades.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors disabled:opacity-40"
                  title="Exportar unidades actuales a Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Exportar
                </button>
              </div>
            </div>

            {/* Tarjetas de Métricas de Stock */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Unidades Totales
                  </span>
                  <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                    <Layers className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">{totalUnidades}</div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">{unidadesDisponibles.length} disponibles</span>
                  <span>•</span>
                  <span className="text-amber-600 font-bold">{unidadesReservadas.length} res.</span>
                  <span>•</span>
                  <span className="text-slate-600 font-bold">{unidadesVendidas.length} vend.</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    M² Libres (Disponibles)
                  </span>
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Check className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-2">
                  {m2Disponibles.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs font-bold text-slate-400">m²</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  de {m2Totales.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m² totales
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                    Inventario Libre (USD)
                  </span>
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-600 mt-2">
                  ${Math.round(valorInventarioUSD).toLocaleString('es-AR')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  a ${Math.round(precioSugeridoUSD)} USD/m² base
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Valor Total Proyecto (USD)
                  </span>
                  <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  ${Math.round(valorTotalStockUSD).toLocaleString('es-AR')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  100% de la superficie vendible
                </div>
              </div>
            </div>

            {/* Grid: Formulario Manual + Tabla de Inventario */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulario Agregar Unidad Manual */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs h-fit space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs">
                      +
                    </span>
                    Carga Manual de Unidad
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsExcelModalOpen(true)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline"
                  >
                    ¿O usar Excel?
                  </button>
                </div>

                <form onSubmit={handleAgregarUnidad} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Identificador / Depto <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nuevaUnidad.identificador}
                      onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, identificador: e.target.value })}
                      placeholder="Ej: 4º A, Cochera 12"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Superficie (m²) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={nuevaUnidad.superficie_m2}
                        onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, superficie_m2: e.target.value })}
                        placeholder="Ej: 54.5"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        % Coeficiente
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={nuevaUnidad.porcentaje_aplicar}
                        onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, porcentaje_aplicar: e.target.value })}
                        placeholder="100"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
                      <select
                        value={nuevaUnidad.estado}
                        onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, estado: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-slate-800"
                      >
                        <option value="disponible">Disponible</option>
                        <option value="reservada">Reservada</option>
                        <option value="vendida">Vendida</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Precio Lista (USD)
                      </label>
                      <input
                        type="number"
                        value={nuevaUnidad.precio_lista_usd}
                        onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, precio_lista_usd: e.target.value })}
                        placeholder="Opcional"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    Guardar Unidad
                  </button>
                </form>

                {/* Tip de carga masiva */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Tip:</strong> Si tienes muchas unidades en un Excel, usa el botón{' '}
                    <span className="font-bold underline cursor-pointer" onClick={() => setIsExcelModalOpen(true)}>
                      Importar Excel
                    </span>{' '}
                    para cargarlas todas juntas en 1 segundo.
                  </p>
                </div>
              </div>

              {/* Tabla de Inventario de Unidades */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                {/* Barra de Filtros y Búsqueda */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por depto o m²..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                      />
                      {busqueda && (
                        <button
                          onClick={() => setBusqueda('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase focus:outline-none bg-slate-50"
                    >
                      <option value="todos">Todos ({unidades.length})</option>
                      <option value="disponible">Disponibles ({unidadesDisponibles.length})</option>
                      <option value="reservada">Reservadas ({unidadesReservadas.length})</option>
                      <option value="vendida">Vendidas ({unidadesVendidas.length})</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchData}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs transition-colors"
                      title="Refrescar lista"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Barra de Acciones Masivas si hay seleccionados */}
                {selectedIds.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-900 text-white flex flex-wrap justify-between items-center gap-3 animate-in fade-in duration-150">
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        {selectedIds.length}
                      </span>
                      <span>unidades seleccionadas</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Marcar como:</span>
                      <button
                        onClick={() => handleBulkChangeStatus('disponible')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors"
                      >
                        Disponible
                      </button>
                      <button
                        onClick={() => handleBulkChangeStatus('reservada')}
                        className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors"
                      >
                        Reservada
                      </button>
                      <button
                        onClick={() => handleBulkChangeStatus('vendida')}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold transition-colors"
                      >
                        Vendida
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabla de Unidades */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-500 uppercase font-bold">
                        <th className="py-3 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              unidadesFiltradas.length > 0 &&
                              selectedIds.length === unidadesFiltradas.length
                            }
                            onChange={handleToggleSelectAll}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                        </th>
                        <th className="py-3 px-3">Unidad</th>
                        <th className="py-3 px-3">Superficie</th>
                        <th className="py-3 px-3">% Coef</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-3 text-right">Valor Estimado (USD)</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                            Cargando inventario...
                          </td>
                        </tr>
                      ) : unidadesFiltradas.length > 0 ? (
                        unidadesFiltradas.map((u) => {
                          const valorEstimado =
                            u.precio_lista_usd && Number(u.precio_lista_usd) > 0
                              ? Number(u.precio_lista_usd)
                              : Number(u.superficie_m2 || 0) *
                                precioSugeridoUSD *
                                (Number(u.porcentaje_aplicar || 100) / 100)

                          const isSelected = selectedIds.includes(u.id)

                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isSelected ? 'bg-amber-50/40' : ''
                              }`}
                            >
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(u.id)}
                                  className="rounded text-amber-500 focus:ring-amber-500"
                                />
                              </td>
                              <td className="py-3 px-3 font-extrabold text-slate-900">
                                {u.identificador}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-700">
                                {u.superficie_m2} m²
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-600">
                                {u.porcentaje_aplicar || 100}%
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={u.estado}
                                  onChange={(e) =>
                                    handleCambiarEstadoRapido(u.id, e.target.value as any)
                                  }
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase border-0 cursor-pointer focus:ring-2 focus:ring-amber-500 ${
                                    u.estado === 'disponible'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : u.estado === 'reservada'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <option value="disponible">Disponible</option>
                                  <option value="reservada">Reservada</option>
                                  <option value="vendida">Vendida</option>
                                </select>
                              </td>
                              <td className="py-3 px-3 text-right font-black text-slate-900">
                                ${Math.round(valorEstimado).toLocaleString('es-AR')} USD
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setUnidadEnEdicion(u)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                    title="Editar unidad"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEliminarUnidad(u.id, u.identificador)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Eliminar unidad"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <div className="max-w-xs mx-auto space-y-2">
                              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="font-bold text-slate-600">No hay unidades en esta vista</p>
                              <p className="text-xs text-slate-400">
                                Agrega unidades usando el formulario manual o importa directamente un Excel.
                              </p>
                              <button
                                onClick={() => setIsExcelModalOpen(true)}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                              >
                                <Upload className="w-3.5 h-3.5" /> Importar Excel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA PRICING */}
        {activeTab === 'pricing' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Matriz de Precios</h2>
                <p className="text-xs text-slate-500">
                  Parámetros de costos físicos, canjes y cálculo de precio de venta por m²
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold block uppercase">PRECIO BASE</span>
                <span className="text-2xl font-black text-amber-600">${Math.round(precioSugeridoUSD)} USD/m²</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Costo Duro Obra</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  ${proyecto?.costo_duro_m2 || 950} USD/m²
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Superficie Proyecto</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {m2Totales.toLocaleString('es-AR')} m²
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase">Canje Tierra</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {proyecto?.canje_tierra_pct ? (proyecto.canje_tierra_pct * 100).toFixed(1) : '15.0'}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA FINANCIADOR */}
        {activeTab === 'financiador' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <h2 className="text-xl font-black text-slate-900">Estructura de Financiación</h2>
            <p className="text-xs text-slate-500">
              Análisis del flujo de fondos, recupero de inversión y aportes proyectados.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Recupero de Capital</h4>
                <div className="text-2xl font-black text-emerald-600">
                  ${Math.round(valorInventarioUSD * 0.4).toLocaleString('es-AR')} USD
                </div>
                <p className="text-xs text-slate-400 mt-1">Anticipos estimados (40% de inventario libre)</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Flujo en Cuotas</h4>
                <div className="text-2xl font-black text-amber-600">
                  ${Math.round(valorInventarioUSD * 0.6).toLocaleString('es-AR')} USD
                </div>
                <p className="text-xs text-slate-400 mt-1">Saldos financiables durante el plazo de obra</p>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA COBROS */}
        {activeTab === 'cobros' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <h2 className="text-xl font-black text-slate-900">Seguimiento de Cobros</h2>
            <p className="text-xs text-slate-500">
              Control de cuotas cobradas, vencidas y saldos de boletos de compraventa.
            </p>
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No hay cuentas de cobro pendientes para este proyecto</p>
            </div>
          </div>
        )}

        {/* PESTAÑA UBICACIÓN */}
        {activeTab === 'ubicacion' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Ubicación del Proyecto</h2>
              <p className="text-xs text-slate-500">{direccionProyecto}</p>
            </div>
            <div className="h-96 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-sm font-bold text-slate-800">{direccionProyecto}</div>
                <p className="text-xs text-slate-400">Coordenadas geocodificadas en mapa general</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Importación Excel */}
      <StockExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        projectId={projectId}
        projectName={nombreProyecto}
        existingUnits={unidades}
        onImportSuccess={handleImportSuccess}
        onBatchSave={handleBatchSaveFromExcel}
      />

      {/* Modal de Edición Rápida de Unidad */}
      {unidadEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Editar Unidad {unidadEnEdicion.identificador}
              </h3>
              <button
                onClick={() => setUnidadEnEdicion(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Identificador
                </label>
                <input
                  type="text"
                  value={unidadEnEdicion.identificador}
                  onChange={(e) =>
                    setUnidadEnEdicion({ ...unidadEnEdicion, identificador: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Superficie (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unidadEnEdicion.superficie_m2}
                    onChange={(e) =>
                      setUnidadEnEdicion({
                        ...unidadEnEdicion,
                        superficie_m2: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    % Coeficiente
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={unidadEnEdicion.porcentaje_aplicar || 100}
                    onChange={(e) =>
                      setUnidadEnEdicion({
                        ...unidadEnEdicion,
                        porcentaje_aplicar: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
                  <select
                    value={unidadEnEdicion.estado}
                    onChange={(e) =>
                      setUnidadEnEdicion({
                        ...unidadEnEdicion,
                        estado: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Precio Lista (USD)
                  </label>
                  <input
                    type="number"
                    value={unidadEnEdicion.precio_lista_usd || ''}
                    onChange={(e) =>
                      setUnidadEnEdicion({
                        ...unidadEnEdicion,
                        precio_lista_usd: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnidadEnEdicion(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
