async function fetchData() {
      const { data: dataProyectos } = await supabase.from('proyectos').select('*').order('nombre', { ascending: true })
      const { data: dataHistorial } = await supabase.from('historial_versiones_proyecto').select('*, proyectos(nombre)').order('fecha_referencia', { ascending: true })

      if (dataProyectos) setProyectos(dataProyectos)
      if (dataHistorial) {
        const historialFormateado = dataHistorial.map(h => {
          // Usamos directamente la nueva fecha de referencia
          const dateString = h.fecha_referencia || new Date().toISOString().split('T')[0]
          const [year, month, day] = dateString.split('-')
          const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
          
          return {
            ...h,
            fecha: dateObj.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
            nombreProyecto: h.proyectos?.nombre || 'Desconocido'
          }
        })
        setHistorial(historialFormateado)

        if (dataProyectos) {
          const resumen = dataProyectos.map(p => {
            const historialProyecto = dataHistorial.filter(h => h.id_proyecto === p.id)
            // Tomamos el último registro basado en el orden del array
            const ultimoRegistro = historialProyecto.length > 0 ? historialProyecto[historialProyecto.length - 1] : null
            return {
              nombre: p.nombre,
              id: p.id,
              ultimoPrecioUSD: ultimoRegistro ? Math.round(ultimoRegistro.resultado_precio_promedio_usd) : 0,
            }
          }).filter(r => r.ultimoPrecioUSD > 0)
          
          setResumenPrecios(resumen.sort((a, b) => b.ultimoPrecioUSD - a.ultimoPrecioUSD))
        }
      }
      setCargando(false)
    }
