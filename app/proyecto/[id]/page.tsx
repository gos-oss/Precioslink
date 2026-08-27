'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcularPrecioSugerido } from '../../../lib/mathEngine'
import Link from 'next/link'
import { ArrowLeft, Save, Building2, Calculator, Percent, DollarSign, Edit2, Check, X, Activity, Calendar, SlidersHorizontal, CheckCircle2, MapPin, Wallet, TrendingUp, Clock, Tag, Box, LayoutGrid, Plus, Map, User, CheckSquare, FileText, BadgeDollarSign } from 'lucide-react'

const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ProyectoCalculadora({ params }: { params: { id: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  const [configGlobal, setConfigGlobal] = useState<any>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  
  // NUEVA PESTAÑA: CTA_CTE
  const [activeTab, setActiveTab] = useState('PRECIOS')

  const [superficieVendible, setSuperficieVendible] = useState(5000)
  const [costoDuroM2, setCostoDuroM2] = useState(1200)
  const [valorTerrenoUSD, setValorTerrenoUSD] = useState(0)
  const [margenObjetivo, setMargenObjetivo] = useState(0.20)
  const [canjeTierra, setCanjeTierra] = useState(0.13)
  const [canjeHonorarios, setCanjeHonorarios] = useState(0.10)
  const [pctAdmin, setPctAdmin] = useState(0.0589)
  const [pctImprevistos, setPctImprevistos] = useState(0.06)
  const [pctAjuste, setPctAjuste] = useState(0)
  const [fechaReferencia, setFechaReferencia] = useState(getTodayDate())
  const [resultados, setResultados] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // Variables de STOCK y Filtro
  const [unidades, setUnidades] = useState<any[]>([])
  const [nuevaUnidadId, setNuevaUnidadId] = useState('')
  const [nuevaUnidadM2, setNuevaUnidadM2] = useState(50)
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Variables de FINANCIADOR
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('')
  const [finPrecioVenta, setFinPrecioVenta] = useState(0)
  const [finAnticipoPct, setFinAnticipoPct] = useState(0.40)
  const [finCuotas, setFinCuotas] = useState(42)
  const [finTasa, setFinTasa] = useState(0.01)
  const [precioModificadoManual, setPrecioModificadoManual] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [guardandoOperacion, setGuardandoOperacion] = useState(false)

  // Variables de CTA CTE (Operaciones y Cuotas)
  const [operaciones, setOperaciones] = useState<any[]>([])
  const [operacionSeleccionada, setOperacionSeleccionada] = useState<any>(null)
  const [cuotasOperacion, setCuotasOperacion] = useState<any[]>([])

  const [direccionProyecto, setDireccionProyecto] = useState('')
  const [guardandoDireccion, setGuardandoDireccion] = useState(false)

  const [notificacion, setNotificacion] = useState({ mostrar: false, mensaje: '', tipo: 'exito' })

  useEffect(() => {
    async function fetchData() {
      const [resProyecto, resConfig, resHistorial, resUnidades, resOperaciones] = await Promise.all([
        supabase.from('proyectos').select('*').eq('id', params.id).single(),
        supabase.from('configuracion_global').select('*').eq('id', 1).single(),
        supabase.from('historial_versiones_proyecto').select('*').eq('id_proyecto', params.id).order('fecha_referencia', { ascending: false }).limit(1),
        supabase.from('unidades').select('*').eq('id_proyecto', params.id).order('identificador', { ascending: true }),
        supabase.from('si_operaciones').select('*, unidades(identificador)').eq('id_proyecto', params.id).order('fecha_operacion', { ascending: false })
      ])
      
      if (resProyecto.data) {
        setProyecto(resProyecto.data)
        if (resProyecto.data.superficie_vendible_m2) setSuperficieVendible(resProyecto.data.superficie_vendible_m2)
        if (resProyecto.data.valor_terreno_usd != null) setValorTerrenoUSD(resProyecto.data.valor_terreno_usd)
        if (resProyecto.data.gastos_admin != null) setPctAdmin(resProyecto.data.gastos_admin)
        if (resProyecto.data.imprevistos != null) setPctImprevistos(resProyecto.data.imprevistos)
        if (resProyecto.data.pct_ajuste != null) setPctAjuste(resProyecto.data.pct_ajuste)
        if (resProyecto.data.direccion) setDireccionProyecto(resProyecto.data.direccion)
      }
      if (resConfig.data) setConfigGlobal(resConfig.data)

      if (resHistorial.data && resHistorial.data.length > 0) {
        const ultimo = resHistorial.data[0]
        if (ultimo.costo_duro_m2) setCostoDuroM2(ultimo.costo_duro_m2)
        if (ultimo.valor_terreno_usd != null) setValorTerrenoUSD(ultimo.valor_terreno_usd)
        if (ultimo.canje_tierra_porcentaje != null) setCanjeTierra(ultimo.canje_tierra_porcentaje)
        if (ultimo.margen_objetivo != null) setMargenObjetivo(ultimo.margen_objetivo)
        if (ultimo.pct_ajuste != null) setPctAjuste(ultimo.pct_ajuste)
        if (ultimo.fecha_referencia) setFechaReferencia(ultimo.fecha_referencia)
      }

      if (resUnidades.data) setUnidades(resUnidades.data)
      if (resOperaciones.data) setOperaciones(resOperaciones.data)
    }
    fetchData()
  }, [params.id])

  useEffect(() => {
    if (proyecto && configGlobal) {
      try {
        const res = calcularPrecioSugerido({
          superficieVendible, costoDuroM2, valorTerrenoUSD, canjeTierraPct: canjeTierra, canjeHonorariosPct: canjeHonorarios,
          margenObjetivo, tasaIIBB: configGlobal.tasa_iibb, tasaTEM: configGlobal.tasa_tem,
          comisionVenta: configGlobal.comision_venta, tipoCambio: configGlobal.tipo_cambio,
          pctIVA: configGlobal.tasa_iva, pctAdmin, pctImprevistos, pctAjuste
        })
        setResultados(res)
        
        if (!precioModificadoManual) {
          if (unidadSeleccionada) {
            const unidadElegida = unidades.find(u => u.id === unidadSeleccionada)
            if (unidadElegida) setFinPrecioVenta(Math.round(unidadElegida.superficie_m2 * res.precioSugeridoUSD))
          } else {
            setFinPrecioVenta(Math.round(res.precioSugeridoUSD))
          }
        }
      } catch (error) { console.error(error) }
    }
  }, [superficieVendible, costoDuroM2, valorTerrenoUSD, margenObjetivo, canjeTierra, canjeHonorarios, pctAdmin, pctImprevistos, pctAjuste, proyecto, configGlobal, unidadSeleccionada, unidades, precioModificadoManual])

  const mostrarNotificacion = (mensaje: string, tipo: 'exito' | 'error' = 'exito') => {
    setNotificacion({ mostrar: true, mensaje, tipo })
    setTimeout(() => setNotificacion({ mostrar: false, mensaje: '', tipo: 'exito' }), 3500)
  }

  async function guardarHistorial() {
    if (!resultados || !proyecto || !configGlobal) return
    setGuardando(true)

    await supabase.from('proyectos').update({ 
      superficie_vendible_m2: superficieVendible, gastos_admin: pctAdmin, imprevistos: pctImprevistos, pct_ajuste: pctAjuste, valor_terreno_usd: valorTerrenoUSD 
    }).eq('id', proyecto.id)

    const { data: registroExistente } = await supabase.from('historial_versiones_proyecto').select('id').eq('id_proyecto', proyecto.id).eq('fecha_referencia', fechaReferencia).maybeSingle()

    const datosAguardar = {
      tipo_cambio: configGlobal.tipo_cambio, costo_duro_m2: costoDuroM2, valor_terreno_usd: valorTerrenoUSD,
      canje_tierra_porcentaje: canjeTierra, margen_objetivo: margenObjetivo, resultado_metros_libres: resultados.metrosLibres,
      resultado_costo_integral_total_usd: resultados.ticket.totalCostoVivienda, resultado_precio_promedio_usd: resultados.precioSugeridoUSD,
      pct_ajuste: pctAjuste
    }

    let errorProceso = null

    if (registroExistente) {
      const { error } = await supabase.from('historial_versiones_proyecto').update(datosAguardar).eq('id', registroExistente.id)
      errorProceso = error
    } else {
      const { error } = await supabase.from('historial_versiones_proyecto').insert({...datosAguardar, id_proyecto: proyecto.id, fecha_referencia: fechaReferencia})
      errorProceso = error
    }
    
    setGuardando(false)
    if (errorProceso) mostrarNotificacion('Error: ' + errorProceso.message, 'error')
    else mostrarNotificacion('Corte mensual fijado y actualizado')
  }

  async function guardarNombre() {
    if (!nuevoNombre.trim()) return
    const { error } = await supabase.from('proyectos').update({ nombre: nuevoNombre }).eq('id', proyecto.id)
    if (!error) { 
      setProyecto({ ...proyecto, nombre: nuevoNombre })
      setEditandoNombre(false)
      mostrarNotificacion('Nombre actualizado correctamente')
    }
  }

  async function guardarDireccion() {
    if (!proyecto) return
    setGuardandoDireccion(true)
    const { error } = await supabase.from('proyectos').update({ direccion: direccionProyecto }).eq('id', proyecto.id)
    setGuardandoDireccion(false)
    if (!error) {
      mostrarNotificacion('Ubicación actualizada en el mapa')
    } else {
      mostrarNotificacion('Error al guardar ubicación', 'error')
    }
  }

  async function agregarUnidad() {
    if (!nuevaUnidadId.trim()) return;
    const { data, error } = await supabase.from('unidades').insert({
      id_proyecto: proyecto.id,
      identificador: nuevaUnidadId,
      superficie_m2: nuevaUnidadM2,
      estado: 'disponible'
    }).select()

    if (data && data.length > 0) {
      setUnidades([...unidades, data[0]])
      setNuevaUnidadId('')
      setNuevaUnidadM2(50)
      mostrarNotificacion('Unidad agregada al inventario')
    } else {
      mostrarNotificacion('Error al agregar unidad', 'error')
    }
  }

  async function cambiarEstadoUnidad(id: string, nuevoEstado: string) {
    const { error } = await supabase.from('unidades').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
      setUnidades(unidades.map(u => u.id === id ? { ...u, estado: nuevoEstado } : u))
      mostrarNotificacion('Estado actualizado')
    }
  }

  // --- FUNCIÓN INTELIGENTE DE REGISTRO DE VENTA ---
  async function registrarVenta() {
    if (!unidadSeleccionada) {
      mostrarNotificacion('Debes seleccionar una unidad específica', 'error')
      return
    }
    if (!clienteNombre.trim()) {
      mostrarNotificacion('Ingresa el nombre del cliente', 'error')
      return
    }

    setGuardandoOperacion(true)
    
    // 1. Cálculos de la Operación
    const anticipoUSD = finPrecioVenta * finAnticipoPct;
    const saldoFinanciar = finPrecioVenta - anticipoUSD;
    const costoFinanciero = saldoFinanciar * finTasa * finCuotas;
    const totalFinanciado = saldoFinanciar + costoFinanciero;
    const cuotaBase = finCuotas > 0 ? (totalFinanciado / finCuotas) : 0;

    // 2. Insertar Operación Matriz en Base de Datos
    const { data: operacionInsertada, error: errorOp } = await supabase.from('si_operaciones').insert({
      id_proyecto: proyecto.id,
      id_unidad: unidadSeleccionada,
      cliente: clienteNombre,
      precio_total_usd: finPrecioVenta,
      anticipo_usd: anticipoUSD,
      saldo_financiado_usd: totalFinanciado,
      cantidad_cuotas: finCuotas,
      tasa_interes_mensual: finTasa
    }).select('*, unidades(identificador)').single()

    if (errorOp || !operacionInsertada) {
      mostrarNotificacion('Error al registrar operación', 'error')
      setGuardandoOperacion(false)
      return
    }

    // 3. Generar Plan de Pagos (Cuotas)
    const cuotasArray = [];
    const fechaVenta = new Date();
    
    // Cuota 0 (Anticipo)
    cuotasArray.push({
      id_operacion: operacionInsertada.id,
      numero_cuota: 0,
      monto_usd: anticipoUSD,
      fecha_vencimiento: fechaVenta.toISOString().split('T')[0], // Vence hoy
      estado: 'pagada', // Asumimos que el anticipo se paga al firmar
      fecha_pago: fechaVenta.toISOString().split('T')[0]
    });

    // Cuotas 1 a N
    for (let i = 1; i <= finCuotas; i++) {
       const fechaVencimiento = new Date(fechaVenta);
       fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);
       cuotasArray.push({
         id_operacion: operacionInsertada.id,
         numero_cuota: i,
         monto_usd: cuotaBase,
         fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
         estado: 'pendiente',
         fecha_pago: null
       });
    }

    if (cuotasArray.length > 0) {
      await supabase.from('si_cuotas').insert(cuotasArray);
    }

    // 4. Actualizar Estado de la Unidad
    await supabase.from('unidades').update({ estado: 'vendida' }).eq('id', unidadSeleccionada)

    // 5. Reflejar en Interfaz
    setUnidades(unidades.map(u => u.id === unidadSeleccionada ? { ...u, estado: 'vendida' } : u))
    setOperaciones([operacionInsertada, ...operaciones])
    setUnidadSeleccionada('')
    setClienteNombre('')
    mostrarNotificacion('¡Operación y Plan de Pagos registrados!')
    setGuardandoOperacion(false)
    setActiveTab('CTA_CTE') // Navega automáticamente al panel de Cobranzas
  }

  // --- CARGAR CUOTAS DE UNA OPERACION (CTA CTE) ---
  async function cargarEstadoCuenta(op: any) {
    if (operacionSeleccionada?.id === op.id) {
      setOperacionSeleccionada(null) // Cerrar si se clickea de nuevo
      return;
    }
    const { data } = await supabase.from('si_cuotas').select('*').eq('id_operacion', op.id).order('numero_cuota', { ascending: true });
    setCuotasOperacion(data || []);
    setOperacionSeleccionada(op);
  }

  async function registrarPagoCuota(idCuota: string) {
    const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('si_cuotas').update({ estado: 'pagada', fecha_pago: hoy }).eq('id', idCuota);
    if (!error) {
      setCuotasOperacion(cuotasOperacion.map(c => c.id === idCuota ? { ...c, estado: 'pagada', fecha_pago: hoy } : c));
      mostrarNotificacion('Pago registrado exitosamente');
    }
  }

  const unidadesDisponibles = unidades.filter(u => u.estado === 'disponible');
  const m2Disponibles = unidadesDisponibles.reduce((acc, u) => acc + Number(u.superficie_m2), 0);
  const valorInventario = resultados ? Math.round(m2Disponibles * resultados.precioSugeridoUSD) : 0;
  const unidadesFiltradas = filtroEstado === 'todos' ? unidades : unidades.filter(u => u.estado === filtroEstado);

  if (!proyecto || !configGlobal) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-8 h-8 text-amber-500 animate-pulse" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Sincronizando modelos...</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-stone-50 p-6 md:p-10 font-sans text-slate-900 selection:bg-amber-100 relative">
      
      <div className={`fixed bottom-8 right-8 z-50 flex items-center bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 transition-all duration-500 transform ${notificacion.mostrar ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {notificacion.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3" /> : <X className="w-5 h-5 text-rose-400 mr-3" />}
        <span className="font-medium text-sm">{notificacion.mensaje}</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ENCABEZADO GLOBAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors mb-4 tracking-wide">
              <ArrowLeft className="w-4 h-4 mr-1" /> VOLVER AL PORTAFOLIO
            </Link>
            {editandoNombre ? (
              <div className="flex items-center">
                <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="text-3xl font-black text-slate-900 border-b-2 border-amber-500 focus:outline-none bg-transparent" autoFocus />
                <button onClick={guardarNombre} className="ml-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-colors"><Check className="w-5 h-5"/></button>
                <button onClick={() => setEditandoNombre(false)} className="ml-2 text-rose-500 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
              </div>
            ) : (
              <h1 className="text-3xl md:text-4xl font-serif font-black text-slate-900 flex items-center group tracking-tight">
                {proyecto.nombre}
                <button onClick={() => { setNuevoNombre(proyecto.nombre); setEditandoNombre(true); }} className="ml-4 text-slate-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-5 h-5" /></button>
              </h1>
            )}
            <p className="text-slate-500 mt-2 font-medium">{proyecto.descripcion || "Panel Integral del Proyecto"}</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-xl border border-stone-200 shadow-sm flex items-center">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mr-3">T.C. Activo</span>
            <span className="text-amber-600 font-black text-lg">${configGlobal.tipo_cambio}</span>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (Agregado CTA CTE) */}
        <div className="flex space-x-2 border-b border-stone-200 mb-8 pb-px overflow-x-auto">
          <button onClick={() => setActiveTab('PRECIOS')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'PRECIOS' ? 'bg-white text-amber-600 border-t border-l border-r border-stone-200' : 'text-slate-500 hover:text-slate-700 hover:bg-stone-200/50'}`}>
            <Tag className="w-4 h-4 mr-2" /> PRICING
          </button>
          <button onClick={() => setActiveTab('STOCK')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'STOCK' ? 'bg-white text-amber-600 border-t border-l border-r border-stone-200' : 'text-slate-500 hover:text-slate-700 hover:bg-stone-200/50'}`}>
            <LayoutGrid className="w-4 h-4 mr-2" /> STOCK
          </button>
          <button onClick={() => setActiveTab('FINANCIADOR')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'FINANCIADOR' ? 'bg-white text-amber-600 border-t border-l border-r border-stone-200' : 'text-slate-500 hover:text-slate-700 hover:bg-stone-200/50'}`}>
            <Wallet className="w-4 h-4 mr-2" /> FINANCIADOR
          </button>
          <button onClick={() => setActiveTab('CTA_CTE')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'CTA_CTE' ? 'bg-white text-emerald-600 border-t border-l border-r border-stone-200' : 'text-slate-500 hover:text-slate-700 hover:bg-stone-200/50'}`}>
            <BadgeDollarSign className="w-4 h-4 mr-2" /> CTA CTE (COBROS)
          </button>
          <button onClick={() => setActiveTab('UBICACION')} className={`flex items-center px-6 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'UBICACION' ? 'bg-white text-amber-600 border-t border-l border-r border-stone-200' : 'text-slate-500 hover:text-slate-700 hover:bg-stone-200/50'}`}>
            <Map className="w-4 h-4 mr-2" /> UBICACIÓN
          </button>
        </div>

        {/* ==================================================== */}
        {/* PESTAÑA: PRECIOS */}
        {/* ==================================================== */}
        {activeTab === 'PRECIOS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest">
                    <Calculator className="w-5 h-5 mr-3 text-amber-500" /> Configuración del Escenario
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                  <div className="col-span-1 md:col-span-2 bg-stone-50 p-6 rounded-2xl border border-stone-200">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Building2 className="w-4 h-4 mr-2 text-amber-500" /> Superficie Vendible (m²)</label>
                    <input type="number" value={superficieVendible} onChange={(e) => setSuperficieVendible(Number(e.target.value))} className="w-full rounded-xl border-0 bg-white px-5 py-4 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-black text-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-stone-400" /> Costo Duro Obra (USD/m²)</label>
                    <input type="number" value={costoDuroM2} onChange={(e) => setCostoDuroM2(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><MapPin className="w-4 h-4 mr-2 text-stone-400" /> Valor Terreno (USD Fijo)</label>
                    <input type="number" value={valorTerrenoUSD} onChange={(e) => setValorTerrenoUSD(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-stone-400" /> Margen Objetivo</label>
                    <input type="number" step="0.01" value={margenObjetivo} onChange={(e) => setMargenObjetivo(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-stone-400" /> Canje Tierra (%)</label>
                    <input type="number" step="0.01" value={canjeTierra} onChange={(e) => setCanjeTierra(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-stone-400" /> Canje Honorarios (%)</label>
                    <input type="number" step="0.01" value={canjeHonorarios} onChange={(e) => setCanjeHonorarios(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-stone-400" /> Gastos Adm. (Obra)</label>
                    <input type="number" step="0.001" value={pctAdmin} onChange={(e) => setPctAdmin(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-stone-400" /> Imprevistos (Obra)</label>
                    <input type="number" step="0.001" value={pctImprevistos} onChange={(e) => setPctImprevistos(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center"><SlidersHorizontal className="w-4 h-4 mr-2" /> Pricing Premium/Discount</label>
                    <input type="number" step="0.01" value={pctAjuste} onChange={(e) => setPctAjuste(Number(e.target.value))} className="w-full rounded-xl border-0 bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-amber-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-bold text-amber-700" />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-950 p-8 rounded-2xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-[11px] font-bold text-slate-400 mb-6 tracking-widest uppercase">Precio Promedio de Contado (m²)</h2>
                  {resultados && (
                    <div className="space-y-4">
                      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
                        <div className="flex items-baseline">
                          <span className="text-xl font-bold text-slate-400 mr-2">USD</span>
                          <p className="text-4xl font-black text-white tracking-tight">{Math.round(resultados.precioSugeridoUSD).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-5 rounded-2xl font-mono text-[13px] text-slate-400 border border-slate-800 shadow-inner">
                        <div className="flex justify-between text-white font-bold mb-2"><span>CONSTRUCCION (100% m²)</span><span>${Math.round(resultados.ticket.construccion).toLocaleString()}</span></div>
                        {resultados.ticket.terrenoFijo > 0 && <div className="flex justify-between pl-3 text-emerald-400 font-semibold"><span>Terreno (Pago Fijo)</span><span>${Math.round(resultados.ticket.terrenoFijo).toLocaleString()}</span></div>}
                        <div className="flex justify-between pl-3"><span>Imprevistos</span><span>{Math.round(resultados.ticket.imprevistos).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-3"><span>IVA</span><span>{Math.round(resultados.ticket.iva).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-3"><span>Administración</span><span>{Math.round(resultados.ticket.administracion).toLocaleString()}</span></div>
                        <div className="flex justify-between text-white font-bold border-y border-slate-700/50 py-2 my-2"><span>Subtotal 1 (Costos)</span><span>${Math.round(resultados.ticket.subtotal1).toLocaleString()}</span></div>
                        
                        <div className="flex justify-between pl-3"><span>IIBB y TEM</span><span>{Math.round(resultados.ticket.iibbYTem).toLocaleString()}</span></div>
                        <div className="flex justify-between pl-3"><span>Comercializ.</span><span>{Math.round(resultados.ticket.comercializacion).toLocaleString()}</span></div>
                        <div className="flex justify-between text-white font-bold border-y border-slate-700/50 py-2 my-2"><span>Subtotal 2 (Caja)</span><span>${Math.round(resultados.ticket.subtotal2).toLocaleString()}</span></div>
                        
                        <div className="flex justify-between text-amber-500 font-bold bg-black/40 -mx-5 p-5 mt-4 border-t border-amber-500/20 rounded-b-2xl">
                          <span>TOTAL COSTO PROYECTO</span><span>${Math.round(resultados.ticket.totalCostoVivienda).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Fecha del Corte</label>
                  <input type="date" value={fechaReferencia} onChange={(e) => setFechaReferencia(e.target.value)} className="w-full bg-stone-50 border border-stone-200 text-slate-900 rounded-xl px-4 py-3 font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" />
                </div>
                <button onClick={guardarHistorial} disabled={guardando} className={`w-full flex items-center justify-center font-bold py-4 px-6 rounded-xl transition-all duration-300 ${guardando ? 'bg-stone-200 text-stone-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-[0.98]'}`}>
                  <Save className="w-5 h-5 mr-2" /> {guardando ? 'Guardando...' : 'Fijar Corte Mensual'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA: STOCK */}
        {/* ==================================================== */}
        {activeTab === 'STOCK' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest mb-6">
                  <Plus className="w-5 h-5 mr-3 text-amber-500" /> Agregar Unidad
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Identificador (Ej: 4º A)</label>
                    <input type="text" value={nuevaUnidadId} onChange={(e) => setNuevaUnidadId(e.target.value)} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-amber-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Superficie (m²)</label>
                    <input type="number" value={nuevaUnidadM2} onChange={(e) => setNuevaUnidadM2(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-amber-500 font-bold" />
                  </div>
                  <button onClick={agregarUnidad} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 mt-2">Guardar en Inventario</button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest">
                  <LayoutGrid className="w-5 h-5 mr-3 text-amber-500" /> Inventario ({unidadesFiltradas.length})
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mr-2">Libre:</span>
                    <span className="text-sm font-black text-amber-700 mr-2">{m2Disponibles.toLocaleString('es-AR')} m²</span>
                    <span className="text-amber-300 mr-2">|</span>
                    <span className="text-sm font-black text-amber-700">${valorInventario.toLocaleString()}</span>
                  </div>
                  <select 
                    value={filtroEstado} 
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer uppercase tracking-wider"
                  >
                    <option value="todos">Todos</option>
                    <option value="disponible">Disponibles</option>
                    <option value="reservada">Reservadas</option>
                    <option value="vendida">Vendidas</option>
                  </select>
                </div>
              </div>

              {unidadesFiltradas.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-2xl">
                  <p className="text-slate-400 font-medium">No se encontraron unidades con este estado.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[600px] rounded-xl border border-stone-200 shadow-inner">
                  <table className="w-full text-left bg-white">
                    <thead className="bg-stone-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Unidad</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Superficie</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Valor Estimado</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidadesFiltradas.map((u) => (
                        <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                          <td className="py-4 px-4 font-black text-slate-800">{u.identificador}</td>
                          <td className="py-4 px-4 font-medium text-slate-500">{u.superficie_m2} m²</td>
                          <td className="py-4 px-4 font-bold text-emerald-600">${resultados ? Math.round(u.superficie_m2 * resultados.precioSugeridoUSD).toLocaleString() : 0}</td>
                          <td className="py-4 px-4">
                            <select 
                              value={u.estado} 
                              onChange={(e) => cambiarEstadoUnidad(u.id, e.target.value)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg outline-none cursor-pointer border-0 ring-1 ring-inset ${u.estado === 'disponible' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : u.estado === 'reservada' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-red-50 text-red-700 ring-red-200'}`}
                            >
                              <option value="disponible">Disponible</option>
                              <option value="reservada">Reservada</option>
                              <option value="vendida">Vendida</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA: FINANCIADOR */}
        {/* ==================================================== */}
        {activeTab === 'FINANCIADOR' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest">
                  <Calculator className="w-5 h-5 mr-3 text-amber-500" /> Simulador de Venta a Cliente
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mb-8">
                <div className="col-span-1 md:col-span-2 bg-stone-50 p-6 rounded-2xl border border-stone-200">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-3 flex items-center"><Box className="w-4 h-4 mr-2 text-amber-500" /> 1. Elegir Unidad a Vender</label>
                  <select 
                    value={unidadSeleccionada}
                    onChange={(e) => {
                      const idUnidad = e.target.value;
                      setUnidadSeleccionada(idUnidad);
                      setPrecioModificadoManual(false); 
                      if (idUnidad && resultados) {
                        const unidadElegida = unidades.find(u => u.id === idUnidad);
                        if (unidadElegida) setFinPrecioVenta(Math.round(unidadElegida.superficie_m2 * resultados.precioSugeridoUSD));
                      } else if (resultados) {
                        setFinPrecioVenta(Math.round(resultados.precioSugeridoUSD));
                      }
                    }}
                    className="w-full rounded-xl border-0 bg-white px-5 py-4 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-amber-500 transition-all font-bold text-lg cursor-pointer"
                  >
                    <option value="">-- Cotización Manual / Genérica --</option>
                    {unidades.filter(u => u.estado === 'disponible').map(u => (
                      <option key={u.id} value={u.id}>Unidad {u.identificador} ({u.superficie_m2} m²)</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-stone-400" /> 2. Valor de Venta (Contado USD)</label>
                  <input type="number" value={finPrecioVenta} onChange={(e) => { setFinPrecioVenta(Number(e.target.value)); setPrecioModificadoManual(true); }} className="w-full rounded-xl border-0 bg-white px-5 py-4 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-black text-2xl" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Percent className="w-4 h-4 mr-2 text-stone-400" /> Anticipo Requerido</label>
                  <input type="number" step="0.01" value={finAnticipoPct} onChange={(e) => setFinAnticipoPct(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-stone-400" /> Tasa de Interés Mensual</label>
                  <input type="number" step="0.001" value={finTasa} onChange={(e) => setFinTasa(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center"><Clock className="w-4 h-4 mr-2 text-stone-400" /> Plazo Total (Meses)</label>
                  <input type="number" value={finCuotas} onChange={(e) => setFinCuotas(Number(e.target.value))} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-all font-semibold" />
                </div>
              </div>

              {finCuotas > 0 && finPrecioVenta > 0 && (
                <div className="mt-8 border-t border-stone-100 pt-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Proyección de Cuotas Base (USD)</h3>
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Cuota</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200 text-right">Saldo Inicial</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200 text-right">Amortización</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200 text-right text-emerald-600">Cuota Base</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4 text-xs font-bold text-slate-900">0 (Anticipo)</td>
                          <td className="py-3 px-4 text-xs text-slate-500 text-right">-</td>
                          <td className="py-3 px-4 text-xs text-slate-500 text-right">-</td>
                          <td className="py-3 px-4 text-sm font-black text-emerald-600 text-right">${Math.round(finPrecioVenta * finAnticipoPct).toLocaleString()}</td>
                        </tr>
                        {[...Array(Math.min(finCuotas, 5))].map((_, i) => (
                          <tr key={i} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <td className="py-3 px-4 text-xs font-bold text-slate-900">Cuota {i + 1}</td>
                            <td className="py-3 px-4 text-xs text-slate-500 text-right">${Math.round((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * (1 + (finTasa * finCuotas))).toLocaleString()}</td>
                            <td className="py-3 px-4 text-xs text-slate-500 text-right">Sistema Lineal</td>
                            <td className="py-3 px-4 text-sm font-black text-emerald-600 text-right">${Math.round(((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * (1 + (finTasa * finCuotas))) / finCuotas).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h2 className="text-[11px] font-bold text-emerald-400 mb-4 tracking-widest uppercase relative z-10 flex items-center">
                  <Wallet className="w-4 h-4 mr-2" /> Plan Sugerido
                </h2>
                
                <div className="bg-slate-800/50 p-5 rounded-2xl font-mono text-[13px] text-slate-200 border border-slate-700 relative z-10">
                  <div className="flex justify-between mb-2"><span>Precio Contado</span><span>${Math.round(finPrecioVenta).toLocaleString()}</span></div>
                  <div className="flex justify-between mb-2"><span>Anticipo ({Math.round(finAnticipoPct*100)}%)</span><span>${Math.round(finPrecioVenta * finAnticipoPct).toLocaleString()}</span></div>
                  <div className="flex justify-between mb-4 border-b border-slate-700 pb-2"><span>Saldo a Financiar</span><span>${Math.round(finPrecioVenta - (finPrecioVenta * finAnticipoPct)).toLocaleString()}</span></div>
                  
                  <div className="flex justify-between mb-2 text-rose-400"><span>Costo Financiero</span><span>+ ${Math.round((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * finTasa * finCuotas).toLocaleString()}</span></div>
                  
                  <div className="flex justify-between text-white font-bold bg-slate-950 -mx-5 p-4 mt-4 border-t border-slate-700">
                    <span>PRECIO FINANCIADO</span><span>${Math.round(finPrecioVenta + ((finPrecioVenta - (finPrecioVenta * finAnticipoPct)) * finTasa * finCuotas)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {unidadSeleccionada && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center relative z-10">
                    <CheckSquare className="w-4 h-4 mr-2 text-amber-500" /> Cierre de Operación
                  </h3>
                  
                  <div className="relative z-10">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Nombre del Cliente</label>
                    <div className="relative mb-4">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-stone-400" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Ej: Juan Pérez" 
                        value={clienteNombre} 
                        onChange={e => setClienteNombre(e.target.value)}
                        className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={registrarVenta}
                      disabled={guardandoOperacion}
                      className="w-full flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      {guardandoOperacion ? 'Registrando...' : 'Confirmar Venta y Generar Cuotas'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* NUEVA PESTAÑA: CUENTAS CORRIENTES (COBRANZAS) */}
        {/* ==================================================== */}
        {activeTab === 'CTA_CTE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LISTADO DE CLIENTES */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest mb-4">
                  <User className="w-5 h-5 mr-3 text-emerald-600" /> Clientes del Proyecto
                </h2>
                
                {operaciones.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-xl">
                    <p className="text-slate-400 font-medium text-sm">No hay ventas registradas aún.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                    {operaciones.map(op => (
                      <div 
                        key={op.id} 
                        onClick={() => cargarEstadoCuenta(op)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${operacionSeleccionada?.id === op.id ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-stone-50 border-stone-200 hover:border-emerald-200'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-sm text-slate-800">{op.cliente}</h3>
                          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded">
                            Unidad {op.unidades?.identificador}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{op.forma_pago}</p>
                        <div className="mt-3 flex justify-between items-center text-xs">
                          <span className="font-black text-emerald-700">${Math.round(op.precio_total_usd).toLocaleString()} USD</span>
                          <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider">Ver Estado &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ESTADO DE CUENTA (CUOTAS) */}
            <div className="lg:col-span-7">
              {operacionSeleccionada ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-800">{operacionSeleccionada.cliente}</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Unidad {operacionSeleccionada.unidades?.identificador} • {operacionSeleccionada.cantidad_cuotas} Cuotas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Operación</p>
                      <p className="text-2xl font-black text-emerald-600">${Math.round(operacionSeleccionada.precio_total_usd).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-stone-200 shadow-inner">
                    <table className="w-full text-left bg-white">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Concepto</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200">Vencimiento</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200 text-right">Monto USD</th>
                          <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-stone-200 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotasOperacion.map((cuota) => (
                          <tr key={cuota.id} className={`border-b border-stone-100 transition-colors ${cuota.estado === 'pagada' ? 'bg-emerald-50/50' : 'hover:bg-stone-50'}`}>
                            <td className="py-3 px-4">
                              <span className="text-xs font-bold text-slate-800">
                                {cuota.numero_cuota === 0 ? 'Anticipo' : `Cuota ${cuota.numero_cuota}`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-500">
                              {new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR')}
                            </td>
                            <td className="py-3 px-4 text-sm font-black text-slate-800 text-right">
                              ${Math.round(cuota.monto_usd).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {cuota.estado === 'pagada' ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded uppercase tracking-wider">
                                  <Check className="w-3 h-3 mr-1" /> Pagado
                                </span>
                              ) : (
                                <button 
                                  onClick={() => registrarPagoCuota(cuota.id)}
                                  className="text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow-sm uppercase tracking-wider transition-colors active:scale-95"
                                >
                                  Cobrar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-stone-100 rounded-2xl border-2 border-dashed border-stone-200 h-full min-h-[400px] flex flex-col items-center justify-center">
                  <FileText className="w-12 h-12 text-stone-300 mb-4" />
                  <p className="text-stone-500 font-medium text-sm">Selecciona un cliente de la lista para ver su Estado de Cuenta.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA: UBICACIÓN */}
        {/* ==================================================== */}
        {activeTab === 'UBICACION' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest mb-6">
                  <MapPin className="w-5 h-5 mr-3 text-amber-500" /> Dirección del Proyecto
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Dirección Completa</label>
                    <input type="text" value={direccionProyecto} onChange={(e) => setDireccionProyecto(e.target.value)} className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-amber-500 font-bold" />
                  </div>
                  <button onClick={guardarDireccion} disabled={guardandoDireccion} className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 mt-2 bg-slate-900 hover:bg-slate-800 text-white">
                    <Map className="w-4 h-4 mr-2" /> Guardar Ubicación
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-stone-100 rounded-2xl shadow-inner border border-stone-200 overflow-hidden h-[500px]">
              {direccionProyecto ? (
                <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(direccionProyecto)}&z=15&output=embed`} width="100%" height="100%" style={{ border: 0 }} allowFullScreen={true} loading="lazy"></iframe>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center">
                  <MapPin className="w-12 h-12 text-stone-300 mb-4" />
                  <p className="text-stone-500 font-medium text-sm">Ingresa una dirección para cargar el mapa.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
