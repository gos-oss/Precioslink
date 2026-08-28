import * as XLSX from 'xlsx'

export interface ParsedExcelUnit {
  identificador: string
  superficie_m2: number
  porcentaje_aplicar: number
  estado: 'disponible' | 'reservada' | 'vendida'
  precio_lista_usd?: number
  tipologia?: string
  piso?: string
  rawRow: Record<string, any>
  isValid: boolean
  validationError?: string
}

export interface ColumnMapping {
  identificador: string
  superficie_m2: string
  porcentaje_aplicar: string
  estado: string
  precio_lista_usd: string
  tipologia?: string
  piso?: string
}

// Normaliza strings para matching insensible a mayúsculas, tildes y espacios
function normalizeKey(str: string): string {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// Normaliza el estado de la unidad
export function normalizeEstado(val: any): 'disponible' | 'reservada' | 'vendida' {
  if (!val) return 'disponible'
  const norm = normalizeKey(String(val))

  if (norm.includes('vend') || norm.includes('sold') || norm.includes('escritur') || norm.includes('ocupad')) {
    return 'vendida'
  }
  if (norm.includes('res') || norm.includes('sen') || norm.includes('bloq') || norm.includes('apalabr')) {
    return 'reservada'
  }
  return 'disponible'
}

// Limpia y extrae números de celdas que puedan tener "45.5 m2" o "$ 15.000,50"
export function parseNumericValue(val: any, defaultValue: number = 0): number {
  if (val === null || val === undefined || val === '') return defaultValue
  if (typeof val === 'number') return isNaN(val) ? defaultValue : val

  let str = String(val).trim()
  // Reemplazar signos de moneda y letras comunes de unidades
  str = str.replace(/[$\sUSDarsm²M2]/gi, '')

  // Si tiene formato argentino (ej: 1.250,50), normalizar a 1250.50
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.')
  }

  const num = parseFloat(str)
  return isNaN(num) ? defaultValue : num
}

// Detecta automáticamente las columnas más probables en una hoja de Excel
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    identificador: '',
    superficie_m2: '',
    porcentaje_aplicar: '',
    estado: '',
    precio_lista_usd: '',
    tipologia: '',
    piso: '',
  }

  headers.forEach((header) => {
    const norm = normalizeKey(header)

    // Identificador
    if (!mapping.identificador) {
      if (
        norm === 'identificador' ||
        norm === 'unidad' ||
        norm === 'departamento' ||
        norm === 'depto' ||
        norm === 'nro' ||
        norm === 'numero' ||
        norm === 'codigo' ||
        norm === 'unit' ||
        norm === 'unidades' ||
        norm.includes('identific') ||
        norm.includes('depto')
      ) {
        mapping.identificador = header
      }
    }

    // Superficie
    if (!mapping.superficie_m2) {
      if (
        norm === 'superficie' ||
        norm === 'superficiem2' ||
        norm === 'm2' ||
        norm === 'metros' ||
        norm === 'sup' ||
        norm === 'aream2' ||
        norm === 'area' ||
        norm === 'supm2' ||
        norm === 'superficietotal' ||
        norm.includes('superficie') ||
        norm.includes('m2') ||
        norm.includes('metros')
      ) {
        mapping.superficie_m2 = header
      }
    }

    // Coeficiente / % a aplicar
    if (!mapping.porcentaje_aplicar) {
      if (
        norm === 'porcentajeaplicar' ||
        norm === 'porcentaje' ||
        norm === 'coeficiente' ||
        norm === 'coef' ||
        norm === 'pct' ||
        norm === 'factor' ||
        norm === 'incidencia' ||
        norm.includes('coef') ||
        norm.includes('porcent') ||
        norm.includes('aplicar')
      ) {
        mapping.porcentaje_aplicar = header
      }
    }

    // Estado
    if (!mapping.estado) {
      if (
        norm === 'estado' ||
        norm === 'status' ||
        norm === 'condicion' ||
        norm === 'situacion' ||
        norm === 'disponibilidad'
      ) {
        mapping.estado = header
      }
    }

    // Precio lista USD
    if (!mapping.precio_lista_usd) {
      if (
        norm === 'preciolistausd' ||
        norm === 'preciousd' ||
        norm === 'valorusd' ||
        norm === 'precio' ||
        norm === 'monto' ||
        norm === 'preciolista' ||
        norm === 'valortotal' ||
        norm === 'usd' ||
        norm.includes('preciousd') ||
        norm.includes('valorusd')
      ) {
        mapping.precio_lista_usd = header
      }
    }

    // Tipología
    if (!mapping.tipologia) {
      if (
        norm === 'tipologia' ||
        norm === 'tipo' ||
        norm === 'ambientes' ||
        norm === 'dormitorios' ||
        norm === 'categoria'
      ) {
        mapping.tipologia = header
      }
    }

    // Piso
    if (!mapping.piso) {
      if (norm === 'piso' || norm === 'nivel' || norm === 'planta' || norm === 'floor') {
        mapping.piso = header
      }
    }
  })

  // Fallbacks si no se detectó identificador exacto
  if (!mapping.identificador && headers.length > 0) {
    mapping.identificador = headers[0]
  }

  // Fallback si no se detectó superficie exacta
  if (!mapping.superficie_m2 && headers.length > 1) {
    const candidate = headers.find((h) => {
      const n = normalizeKey(h)
      return n.includes('sup') || n.includes('m2') || n.includes('met')
    })
    if (candidate) mapping.superficie_m2 = candidate
    else if (headers[1] !== mapping.identificador) mapping.superficie_m2 = headers[1]
  }

  return mapping
}

// Lee un archivo Excel / CSV y retorna las hojas y filas
export async function readExcelFile(file: File): Promise<{
  sheetNames: string[]
  sheetsData: Record<string, { headers: string[]; rows: Record<string, any>[] }>
}> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  const sheetsData: Record<string, { headers: string[]; rows: Record<string, any>[] }> = {}

  workbook.SheetNames.forEach((name) => {
    const sheet = workbook.Sheets[name]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

    // Extraer headers de la primera fila o del JSON
    let headers: string[] = []
    if (jsonData.length > 0) {
      headers = Object.keys(jsonData[0])
    }

    sheetsData[name] = {
      headers,
      rows: jsonData,
    }
  })

  return {
    sheetNames: workbook.SheetNames,
    sheetsData,
  }
}

// Procesa filas crudas según el mapeo de columnas seleccionado
export function mapRowsToUnits(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): ParsedExcelUnit[] {
  return rawRows.map((row, index) => {
    const rawId = mapping.identificador ? row[mapping.identificador] : ''
    const rawSup = mapping.superficie_m2 ? row[mapping.superficie_m2] : ''
    const rawPct = mapping.porcentaje_aplicar ? row[mapping.porcentaje_aplicar] : ''
    const rawEst = mapping.estado ? row[mapping.estado] : ''
    const rawPrecio = mapping.precio_lista_usd ? row[mapping.precio_lista_usd] : ''
    const rawTipo = mapping.tipologia ? row[mapping.tipologia] : ''
    const rawPiso = mapping.piso ? row[mapping.piso] : ''

    const identificador = String(rawId || '').trim()
    const superficie = parseNumericValue(rawSup, 0)
    
    let porcentaje = parseNumericValue(rawPct, 100)
    // Si viene como decimal ej: 1.05 o 0.95 convertir a 105 o 95
    if (porcentaje > 0 && porcentaje <= 3) {
      porcentaje = Math.round(porcentaje * 100 * 10) / 10
    }
    if (porcentaje === 0) porcentaje = 100

    const estado = normalizeEstado(rawEst)
    const precioLista = rawPrecio ? parseNumericValue(rawPrecio, 0) : undefined

    let isValid = true
    let validationError: string | undefined

    if (!identificador) {
      isValid = false
      validationError = `Fila #${index + 1}: Falta identificador de unidad`
    } else if (superficie <= 0) {
      isValid = false
      validationError = `Fila #${index + 1}: Superficie inválida (${rawSup})`
    }

    return {
      identificador,
      superficie_m2: Number(superficie.toFixed(2)),
      porcentaje_aplicar: Number(porcentaje.toFixed(2)),
      estado,
      precio_lista_usd: precioLista && precioLista > 0 ? Math.round(precioLista) : undefined,
      tipologia: rawTipo ? String(rawTipo).trim() : undefined,
      piso: rawPiso ? String(rawPiso).trim() : undefined,
      rawRow: row,
      isValid,
      validationError,
    }
  })
}

// Genera y descarga una plantilla Excel de ejemplo
export function downloadExcelTemplate(projectName: string = 'Proyecto') {
  const templateData = [
    {
      'Identificador': '1º A',
      'Piso': '1',
      'Tipologia': '2 Ambientes con Balcón',
      'Superficie (m2)': 54.5,
      '% Coeficiente': 100,
      'Estado': 'disponible',
      'Precio Lista USD': 95000,
    },
    {
      'Identificador': '1º B',
      'Piso': '1',
      'Tipologia': '1 Ambiente / Monoambiente',
      'Superficie (m2)': 38.0,
      '% Coeficiente': 98,
      'Estado': 'disponible',
      'Precio Lista USD': 68000,
    },
    {
      'Identificador': '2º A',
      'Piso': '2',
      'Tipologia': '3 Ambientes con Balcón Terraza',
      'Superficie (m2)': 78.2,
      '% Coeficiente': 105,
      'Estado': 'reservada',
      'Precio Lista USD': 142000,
    },
    {
      'Identificador': '2º B',
      'Piso': '2',
      'Tipologia': '2 Ambientes',
      'Superficie (m2)': 54.5,
      '% Coeficiente': 102,
      'Estado': 'vendida',
      'Precio Lista USD': 98000,
    },
    {
      'Identificador': 'Cochera 01',
      'Piso': 'Subsuelo 1',
      'Tipologia': 'Cochera Cubierta',
      'Superficie (m2)': 12.5,
      '% Coeficiente': 60,
      'Estado': 'disponible',
      'Precio Lista USD': 15000,
    },
    {
      'Identificador': 'Cochera 02',
      'Piso': 'Subsuelo 1',
      'Tipologia': 'Cochera Cubierta',
      'Superficie (m2)': 12.5,
      '% Coeficiente': 60,
      'Estado': 'vendida',
      'Precio Lista USD': 15000,
    },
    {
      'Identificador': 'Local Comercial 01',
      'Piso': 'Planta Baja',
      'Tipologia': 'Local a la Calle',
      'Superficie (m2)': 110.0,
      '% Coeficiente': 130,
      'Estado': 'disponible',
      'Precio Lista USD': 220000,
    },
  ]

  const ws = XLSX.utils.json_to_sheet(templateData)

  // Ajustar anchos de columnas
  ws['!cols'] = [
    { wch: 22 }, // Identificador
    { wch: 12 }, // Piso
    { wch: 30 }, // Tipologia
    { wch: 18 }, // Superficie
    { wch: 16 }, // Coeficiente
    { wch: 14 }, // Estado
    { wch: 18 }, // Precio
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Unidades_Stock')

  const fileName = `Plantilla_Stock_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// Exporta unidades actuales a un archivo Excel (.xlsx)
export function exportUnitsToExcel(units: any[], projectName: string = 'Proyecto') {
  const exportData = units.map((u) => ({
    'Identificador': u.identificador || '',
    'Superficie (m²)': Number(u.superficie_m2 || 0),
    '% Aplicar': Number(u.porcentaje_aplicar ?? 100),
    'Estado': u.estado || 'disponible',
    'Precio Lista (USD)': u.precio_lista_usd ? Number(u.precio_lista_usd) : '',
    'ID Sistema': u.id || '',
  }))

  const ws = XLSX.utils.json_to_sheet(exportData)
  ws['!cols'] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 15 },
    { wch: 20 },
    { wch: 38 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock_Unidades')

  const fileName = `Stock_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}
