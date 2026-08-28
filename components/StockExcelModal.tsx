'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileCheck,
  Filter,
} from 'lucide-react'
import {
  readExcelFile,
  autoDetectColumns,
  mapRowsToUnits,
  downloadExcelTemplate,
  ColumnMapping,
  ParsedExcelUnit,
} from '@/lib/excelStockParser'

interface ExistingUnit {
  id?: string
  identificador: string
  superficie_m2: number
  estado: string
  porcentaje_aplicar?: number
  precio_lista_usd?: number
}

interface StockExcelModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName?: string
  existingUnits: ExistingUnit[]
  onImportSuccess: (importedCount: number, updatedCount: number) => void
  onBatchSave: (
    unitsToInsert: any[],
    unitsToUpdate: any[],
    replaceAll: boolean
  ) => Promise<{ success: boolean; error?: string }>
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing'

export default function StockExcelModal({
  isOpen,
  onClose,
  projectId,
  projectName = 'Proyecto',
  existingUnits,
  onImportSuccess,
  onBatchSave,
}: StockExcelModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [allSheetsData, setAllSheetsData] = useState<
    Record<string, { headers: string[]; rows: Record<string, any>[] }>
  >({})
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    identificador: '',
    superficie_m2: '',
    porcentaje_aplicar: '',
    estado: '',
    precio_lista_usd: '',
    tipologia: '',
    piso: '',
  })
  const [parsedUnits, setParsedUnits] = useState<ParsedExcelUnit[]>([])
  const [importMode, setImportMode] = useState<'upsert' | 'new_only' | 'replace'>('upsert')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = async (selectedFile: File) => {
    setErrorMessage(null)
    setIsProcessing(true)
    try {
      const { sheetNames, sheetsData } = await readExcelFile(selectedFile)
      if (sheetNames.length === 0) {
        throw new Error('El archivo no contiene hojas válidas')
      }

      setFile(selectedFile)
      setSheetNames(sheetNames)
      setAllSheetsData(sheetsData)

      const initialSheet = sheetNames[0]
      setSelectedSheet(initialSheet)

      const headers = sheetsData[initialSheet]?.headers || []
      setAvailableHeaders(headers)

      const detected = autoDetectColumns(headers)
      setMapping(detected)

      const rows = sheetsData[initialSheet]?.rows || []
      const initialUnits = mapRowsToUnits(rows, detected)
      setParsedUnits(initialUnits)

      setStep('mapping')
    } catch (err: any) {
      setErrorMessage('Error al leer el archivo Excel: ' + (err.message || 'Formato no soportado'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName)
    const headers = allSheetsData[sheetName]?.headers || []
    setAvailableHeaders(headers)

    const detected = autoDetectColumns(headers)
    setMapping(detected)

    const rows = allSheetsData[sheetName]?.rows || []
    const updatedUnits = mapRowsToUnits(rows, detected)
    setParsedUnits(updatedUnits)
  }

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const updatedMapping = { ...mapping, [field]: value }
    setMapping(updatedMapping)

    const rows = allSheetsData[selectedSheet]?.rows || []
    const updatedUnits = mapRowsToUnits(rows, updatedMapping)
    setParsedUnits(updatedUnits)
  }

  const handleGoToPreview = () => {
    if (!mapping.identificador) {
      setErrorMessage('Debes seleccionar al menos la columna del Identificador / Unidad')
      return
    }
    if (!mapping.superficie_m2) {
      setErrorMessage('Debes seleccionar la columna de Superficie (m²)')
      return
    }
    setErrorMessage(null)
    setStep('preview')
  }

  // Identificadores ya existentes en el proyecto
  const existingMap = useMemo(() => {
    const map = new Map<string, ExistingUnit>()
    existingUnits.forEach((u) => {
      if (u.identificador) {
        map.set(u.identificador.trim().toLowerCase(), u)
      }
    })
    return map
  }, [existingUnits])

  const stats = useMemo(() => {
    const total = parsedUnits.length
    const valid = parsedUnits.filter((u) => u.isValid)
    const invalid = parsedUnits.filter((u) => !u.isValid)
    const duplicates = valid.filter((u) =>
      existingMap.has(u.identificador.trim().toLowerCase())
    )
    const newItems = valid.filter(
      (u) => !existingMap.has(u.identificador.trim().toLowerCase())
    )
    const totalM2 = valid.reduce((acc, u) => acc + u.superficie_m2, 0)

    return {
      total,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicatesCount: duplicates.length,
      newCount: newItems.length,
      totalM2: Math.round(totalM2 * 100) / 100,
    }
  }, [parsedUnits, existingMap])

  const filteredPreviewUnits = useMemo(() => {
    return parsedUnits.filter((u) => {
      const isDuplicate = existingMap.has(u.identificador.trim().toLowerCase())
      if (previewFilter === 'valid') return u.isValid
      if (previewFilter === 'invalid') return !u.isValid
      if (previewFilter === 'duplicates') return u.isValid && isDuplicate
      return true
    })
  }, [parsedUnits, previewFilter, existingMap])

  const handleExecuteImport = async () => {
    setErrorMessage(null)
    setIsProcessing(true)
    setStep('importing')

    try {
      const validUnits = parsedUnits.filter((u) => u.isValid)
      if (validUnits.length === 0) {
        throw new Error('No hay unidades válidas para importar.')
      }

      const unitsToInsert: any[] = []
      const unitsToUpdate: any[] = []

      if (importMode === 'replace') {
        // En modo reemplazar, todas las unidades válidas se insertan directamente
        validUnits.forEach((u) => {
          unitsToInsert.push({
            id_proyecto: projectId,
            identificador: u.identificador,
            superficie_m2: u.superficie_m2,
            porcentaje_aplicar: u.porcentaje_aplicar,
            estado: u.estado,
            precio_lista_usd: u.precio_lista_usd || null,
          })
        })
      } else if (importMode === 'new_only') {
        // Solo agregar las que no existan
        validUnits.forEach((u) => {
          const key = u.identificador.trim().toLowerCase()
          if (!existingMap.has(key)) {
            unitsToInsert.push({
              id_proyecto: projectId,
              identificador: u.identificador,
              superficie_m2: u.superficie_m2,
              porcentaje_aplicar: u.porcentaje_aplicar,
              estado: u.estado,
              precio_lista_usd: u.precio_lista_usd || null,
            })
          }
        })
      } else {
        // Upsert / Combinar
        validUnits.forEach((u) => {
          const key = u.identificador.trim().toLowerCase()
          const existing = existingMap.get(key)
          if (existing && existing.id) {
            unitsToUpdate.push({
              id: existing.id,
              id_proyecto: projectId,
              identificador: u.identificador,
              superficie_m2: u.superficie_m2,
              porcentaje_aplicar: u.porcentaje_aplicar,
              estado: u.estado,
              precio_lista_usd: u.precio_lista_usd || null,
            })
          } else {
            unitsToInsert.push({
              id_proyecto: projectId,
              identificador: u.identificador,
              superficie_m2: u.superficie_m2,
              porcentaje_aplicar: u.porcentaje_aplicar,
              estado: u.estado,
              precio_lista_usd: u.precio_lista_usd || null,
            })
          }
        })
      }

      const result = await onBatchSave(
        unitsToInsert,
        unitsToUpdate,
        importMode === 'replace'
      )

      if (!result.success) {
        throw new Error(result.error || 'Error al persistir unidades en la base de datos')
      }

      onImportSuccess(unitsToInsert.length, unitsToUpdate.length)
      handleClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error durante la importación')
      setStep('preview')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setParsedUnits([])
    setErrorMessage(null)
    setIsProcessing(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Importar Stock desde Excel
              </h2>
              <p className="text-xs text-slate-400">
                Carga masiva de unidades, m², coeficientes y precios para{' '}
                <span className="text-amber-400 font-semibold">{projectName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadExcelTemplate(projectName)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700"
              title="Descargar plantilla de ejemplo .xlsx"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Descargar Plantilla
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pasos / Stepper */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-6">
            <div
              className={`flex items-center gap-2 ${
                step === 'upload' ? 'text-amber-600 font-black' : 'text-emerald-600'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'upload'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                1
              </span>
              <span>1. Archivo</span>
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`flex items-center gap-2 ${
                step === 'mapping'
                  ? 'text-amber-600 font-black'
                  : step === 'preview' || step === 'importing'
                  ? 'text-emerald-600'
                  : ''
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'mapping'
                    ? 'bg-amber-500 text-white'
                    : step === 'preview' || step === 'importing'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </span>
              <span>2. Columnas</span>
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`flex items-center gap-2 ${
                step === 'preview' || step === 'importing' ? 'text-amber-600 font-black' : ''
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'preview' || step === 'importing'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </span>
              <span>3. Vista Previa & Confirmación</span>
            </div>
          </div>

          {file && (
            <div className="text-[11px] text-slate-500 truncate max-w-xs font-medium">
              📄 {file.name}
            </div>
          )}
        </div>

        {/* Mensaje de error general */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Contenido según Step */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PASO 1: CARGA DE ARCHIVO */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-amber-500 bg-amber-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 mb-1">
                  Arrastra tu archivo Excel o haz clic para seleccionarlo
                </h3>
                <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                  Formatos compatibles: <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span>.
                  Detectaremos automáticamente las columnas de unidades, m², estado y precios.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  Examinar archivos
                </div>
              </div>

              {/* Guía rápida / Beneficios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Detección Inteligente
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Reconoce encabezados como &quot;1º A&quot;, &quot;Depto&quot;, &quot;Superficie (m²)&quot;, &quot;Estado&quot;, &quot;USD&quot;.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sin Riesgo de Sobrescritura
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Puedes elegir actualizar unidades existentes, agregar solo nuevas o reemplazar todo.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Vista Previa Completa
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Revisarás cada fila calculada y validada antes de confirmar el guardado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: MAPEO DE COLUMNAS */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  <span>Archivo procesado con {parsedUnits.length} filas.</span>
                </div>

                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-slate-700 font-semibold">Hoja de cálculo:</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-bold text-slate-800 text-xs"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">
                  Mapeo de Columnas
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Asigna las columnas de tu Excel a los campos del sistema de stock.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Identificador */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Identificador / Unidad <span className="text-rose-500">* (Obligatorio)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Ej: 1° A, Depto 204, Cochera 12</p>
                    <select
                      value={mapping.identificador}
                      onChange={(e) => handleMappingChange('identificador', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Superficie m2 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Superficie (m²) <span className="text-rose-500">* (Obligatorio)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Ej: 45.5, 62, 110.0</p>
                    <select
                      value={mapping.superficie_m2}
                      onChange={(e) => handleMappingChange('superficie_m2', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Coeficiente / % Aplicar */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      % Coeficiente / Pct a Aplicar <span className="text-slate-400 font-normal">(Opcional, default 100%)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Ej: 100, 105, 95 (o 1.05)</p>
                    <select
                      value={mapping.porcentaje_aplicar}
                      onChange={(e) => handleMappingChange('porcentaje_aplicar', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                    >
                      <option value="">-- Usar 100% por defecto --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Estado de la Unidad <span className="text-slate-400 font-normal">(Opcional, default disponible)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Ej: disponible, reservada, vendida</p>
                    <select
                      value={mapping.estado}
                      onChange={(e) => handleMappingChange('estado', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                    >
                      <option value="">-- Usar &apos;disponible&apos; por defecto --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Precio Lista USD */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Precio de Lista (USD) <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Ej: 85000, 120000</p>
                    <select
                      value={mapping.precio_lista_usd}
                      onChange={(e) => handleMappingChange('precio_lista_usd', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                    >
                      <option value="">-- Sin precio de lista fijo --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipología */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Tipología / Ambientes <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Ej: 2 Ambientes, Monoambiente, Cochera</p>
                    <select
                      value={mapping.tipologia}
                      onChange={(e) => handleMappingChange('tipologia', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
                    >
                      <option value="">-- Ninguna --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: VISTA PREVIA & REGLAS DE IMPORTACIÓN */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Filas
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Válidas para Carga
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {stats.validCount} <span className="text-xs font-bold">({stats.totalM2} m²)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Coincide con Existentes
                  </div>
                  <div className="text-xl font-black text-amber-700 mt-1">
                    {stats.duplicatesCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Nuevas a Crear
                  </div>
                  <div className="text-xl font-black text-blue-700 mt-1">{stats.newCount}</div>
                </div>
              </div>

              {/* Modo de Importación */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Modo de Importación:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'upsert'
                        ? 'bg-slate-800 border-amber-500 text-white'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'upsert'}
                      onChange={() => setImportMode('upsert')}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Actualizar y Agregar (Recomendado)</div>
                      <div className="text-[11px] text-slate-400">
                        Actualiza m², coeficientes y estado de existentes y agrega las nuevas.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'new_only'
                        ? 'bg-slate-800 border-amber-500 text-white'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'new_only'}
                      onChange={() => setImportMode('new_only')}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Solo Nuevas</div>
                      <div className="text-[11px] text-slate-400">
                        Omite las que ya existen en el proyecto. No modifica stock actual.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-rose-950/60 border-rose-500 text-white'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-500 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-300">Reemplazar Todo</div>
                      <div className="text-[11px] text-slate-400">
                        Elimina el stock actual de este proyecto y carga la lista del Excel.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Filtro y Tabla de Vista Previa */}
              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span>Vista Previa de Filas</span>
                    <span className="text-slate-400 font-normal">
                      ({filteredPreviewUnits.length} de {parsedUnits.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Filtrar:
                    </span>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                      <button
                        onClick={() => setPreviewFilter('all')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          previewFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Todas ({stats.total})
                      </button>
                      <button
                        onClick={() => setPreviewFilter('valid')}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          previewFilter === 'valid'
                            ? 'bg-emerald-600 text-white'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        Válidas ({stats.validCount})
                      </button>
                      {stats.duplicatesCount > 0 && (
                        <button
                          onClick={() => setPreviewFilter('duplicates')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            previewFilter === 'duplicates'
                              ? 'bg-amber-600 text-white'
                              : 'text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          Existentes ({stats.duplicatesCount})
                        </button>
                      )}
                      {stats.invalidCount > 0 && (
                        <button
                          onClick={() => setPreviewFilter('invalid')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            previewFilter === 'invalid'
                              ? 'bg-rose-600 text-white'
                              : 'text-rose-700 hover:bg-rose-50'
                          }`}
                        >
                          Inválidas ({stats.invalidCount})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Estado Fila</th>
                        <th className="py-2.5 px-3">Identificador</th>
                        <th className="py-2.5 px-3">Superficie</th>
                        <th className="py-2.5 px-3">% Coef</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Precio Lista (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPreviewUnits.length > 0 ? (
                        filteredPreviewUnits.map((u, i) => {
                          const isExisting = existingMap.has(
                            u.identificador.trim().toLowerCase()
                          )

                          return (
                            <tr
                              key={i}
                              className={`hover:bg-slate-50 transition-colors ${
                                !u.isValid
                                  ? 'bg-rose-50/50'
                                  : isExisting
                                  ? 'bg-amber-50/30'
                                  : ''
                              }`}
                            >
                              <td className="py-2 px-3">
                                {u.isValid ? (
                                  isExisting ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                      Existente
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                      Nueva
                                    </span>
                                  )
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800"
                                    title={u.validationError}
                                  >
                                    Error
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-800">
                                {u.identificador || (
                                  <span className="text-rose-500 italic">Sin identificador</span>
                                )}
                                {u.tipologia && (
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    {u.tipologia}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-700 font-semibold">
                                {u.superficie_m2 > 0 ? (
                                  `${u.superficie_m2} m²`
                                ) : (
                                  <span className="text-rose-500 font-bold">0 m²</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-bold">
                                {u.porcentaje_aplicar}%
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    u.estado === 'disponible'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : u.estado === 'reservada'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {u.estado}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {u.precio_lista_usd
                                  ? `$${u.precio_lista_usd.toLocaleString('es-AR')}`
                                  : '-'}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                            No hay filas para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: IMPORTANDO / PROCESANDO */}
          {step === 'importing' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800">
                Guardando unidades en la base de datos...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Procesando registros para el proyecto {projectName}. No cierres esta ventana.
              </p>
            </div>
          )}
        </div>

        {/* Footer Modal con Botonera de Acción */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div>
            {step === 'mapping' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-200/60 transition-colors"
              >
                ← Cambiar Archivo
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-200/60 transition-colors"
              >
                ← Volver al Mapeo
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            {step === 'mapping' && (
              <button
                type="button"
                onClick={handleGoToPreview}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md transition-all active:scale-[0.98]"
              >
                <span>Continuar a Vista Previa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing || stats.validCount === 0}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-black shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                  importMode === 'replace'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {importMode === 'replace'
                    ? `Confirmar Reemplazo (${stats.validCount} unidades)`
                    : `Confirmar e Importar ${stats.validCount} Unidades`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
