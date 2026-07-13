"use client"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", paddingTop: 45, paddingBottom: 55, paddingHorizontal: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#1d4ed8", paddingBottom: 8, marginBottom: 14 },
  headerLogo: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  headerSub: { fontSize: 7, color: "#64748b", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  headerDate: { fontSize: 7, color: "#64748b", marginTop: 2 },
  coverPage: { flex: 1, justifyContent: "center", alignItems: "center" },
  coverLogo: { fontSize: 42, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 4 },
  coverLogoSub: { fontSize: 12, color: "#64748b", marginBottom: 40 },
  coverLine: { width: 100, height: 2, backgroundColor: "#1d4ed8", marginBottom: 40 },
  coverTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1e293b", textAlign: "center", marginBottom: 8 },
  coverSubtitle: { fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 50 },
  coverBox: { width: "100%", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4, padding: 24, backgroundColor: "#f8fafc" },
  coverRow: { flexDirection: "row", marginBottom: 10 },
  coverLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#64748b", width: 110 },
  coverValue: { fontSize: 10, color: "#1e293b", flex: 1 },
  coverFooter: { position: "absolute", bottom: 40, alignItems: "center" },
  coverFooterText: { fontSize: 8, color: "#94a3b8" },
  secTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginTop: 16, marginBottom: 10, borderBottomWidth: 1.5, borderBottomColor: "#1d4ed8", paddingBottom: 4 },
  subTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#334155", marginTop: 12, marginBottom: 6 },
  bodyText: { fontSize: 9, color: "#64748b", marginBottom: 6, lineHeight: 1.5 },
  table: { marginBottom: 10 },
  tableHead: { flexDirection: "row", backgroundColor: "#1d4ed8", padding: 5, borderRadius: 3 },
  tableHeadCell: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 8, flex: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4, backgroundColor: "#f8fafc" },
  tableCell: { fontSize: 8, flex: 1, color: "#334155" },
  tableCellB: { fontSize: 8, flex: 1, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  stepBox: { marginBottom: 8, backgroundColor: "#f8fafc", padding: 8, borderRadius: 3, borderLeftWidth: 3, borderLeftColor: "#1d4ed8" },
  stepTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 4 },
  stepLine: { fontSize: 8, color: "#334155", marginBottom: 2, fontFamily: "Courier" },
  stepResult: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a8a", backgroundColor: "#dbeafe", padding: 5, borderRadius: 3, marginTop: 4, borderWidth: 1, borderColor: "#93c5fd" },
  matrizBox: { backgroundColor: "#1e293b", padding: 8, borderRadius: 3, marginBottom: 8 },
  matrizTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#93c5fd", marginBottom: 4 },
  matrizLine: { fontSize: 7, color: "#e2e8f0", fontFamily: "Courier", marginBottom: 1 },
  resCard: { width: "48%", backgroundColor: "#eff6ff", borderRadius: 4, padding: 8, borderWidth: 1, borderColor: "#bfdbfe", marginBottom: 6 },
  resLabel: { fontSize: 7, color: "#3b82f6", fontFamily: "Helvetica-Bold", marginBottom: 2 },
  resValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  resUnit: { fontSize: 7, color: "#64748b" },
  canvasImg: { width: "100%", height: 200, objectFit: "contain", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 3, marginBottom: 10 },
  footer: { position: "absolute", bottom: 20, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 5 },
  footerText: { fontSize: 7, color: "#94a3b8" },
  disclaimer: { backgroundColor: "#fefce8", borderRadius: 3, padding: 8, borderWidth: 1, borderColor: "#fde68a", marginTop: 16 },
  disclaimerText: { fontSize: 7, color: "#92400e" },
})

type Nodo = { id: number; nombre: string; x: number; y: number; apoyo: string; anguloRodillo: number }
type ElementoCalc = { id: number; nombre: string; nodoA: number; nodoB: number; tipo: string; conocido: boolean; valorConocido: number; tensionAdmisible: number; color: string; angDesdeA: number; longitud: number }
type FuerzaExterna = { id: number; nodoId: number; nombre: string; magnitud: number; angulo: number; modo: string; color: string }
type Incognita = { tipo: string; refId: number; nombre: string }
type DisenoResultado = { wMax: number; factoresK: { nombre: string; k: number; wMaxIndividual: number }[]; cableGobernante: string } | null
type DatosUsuario = { ingeniero: string; empresa: string; proyecto: string; descripcion: string }

function f2(n: number) { return n.toFixed(2) }
function f4(n: number) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(4)
}
function fechaHoy() {
  return new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
}
function nombreApoyo(a: string) {
  const m: Record<string, string> = { libre: "Libre", fijo: "Anclaje fijo", pasador: "Pasador", rodillo: "Rodillo", empotrado: "Empotrado", polea: "Polea" }
  return m[a] ?? a
}

function Header({ titulo }: { titulo: string }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerLogo}>NodoCalc</Text>
        <Text style={styles.headerSub}>Plataforma de calculo para ingenieria civil</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>{titulo}</Text>
        <Text style={styles.headerDate}>{fechaHoy()}</Text>
      </View>
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Desarrollado por Julian Leon y Miguel Cardenas — NodoCalc</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Pagina ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

export function PDFEquilibrio2D({
  nodos, elementos, fuerzas, incognitas, solucion, checkPorNodo,
  modoDiseno, disenoResultado, imagenCanvas, datosUsuario, unidadFuerza, unidadLong
}: {
  nodos: Nodo[]
  elementos: ElementoCalc[]
  fuerzas: FuerzaExterna[]
  incognitas: Incognita[]
  solucion: number[] | null
  checkPorNodo: { nombre: string; fx: number; fy: number }[]
  modoDiseno: boolean
  disenoResultado: DisenoResultado
  imagenCanvas?: string
  datosUsuario: DatosUsuario
  unidadFuerza: string
  unidadLong: string
}) {
  const getNodo = (id: number) => nodos.find(n => n.id === id)!
  const nodosLibres = nodos.filter(n => n.apoyo !== "fijo")

  // ── Construir desarrollo paso a paso ────────────────────────────────────
  type Paso = { titulo: string; lineas: string[]; resultado?: string; esMatriz?: boolean }
  const pasos: Paso[] = []

  // Paso 1: Identificación
  pasos.push({
    titulo: "Paso 1 — Identificacion del sistema",
    lineas: [
      `Nudos totales: ${nodos.length}   Nudos libres (generan ecuaciones): ${nodosLibres.length}`,
      `Nudos libres: ${nodosLibres.map(n => `${n.nombre}(${f2(n.x)}, ${f2(n.y)})`).join("  |  ")}`,
      `Elementos: ${elementos.map(e => `${e.nombre}(${e.tipo})`).join("  |  ")}`,
      `Fuerzas externas: ${fuerzas.map(f => f.nombre).join(", ")}`,
      `Incognitas del sistema: ${incognitas.map(i => i.nombre).join(", ")}`,
      `Total incognitas: ${incognitas.length}   Total ecuaciones disponibles: ${nodosLibres.length * 2}`,
      modoDiseno ? `MODO DISENO: W se toma = 1 ${unidadFuerza} como referencia para calcular factores k = T/W` : "",
    ].filter(l => l !== "")
  })

  // Paso 2: Ángulos de elementos
  pasos.push({
    titulo: "Paso 2 — Calculo de angulos y longitudes de elementos",
    lineas: [
      "Para cada elemento se calcula el angulo desde el nodo A hacia el nodo B:",
      "  theta = arctan2(yB - yA, xB - xA)",
      "  L = sqrt((xB-xA)^2 + (yB-yA)^2)",
      "",
      ...elementos.map(e => {
        const A = getNodo(e.nodoA), B = getNodo(e.nodoB)
        return `${e.nombre}: ${A.nombre}(${f2(A.x)},${f2(A.y)}) -> ${B.nombre}(${f2(B.x)},${f2(B.y)})`
          + `  |  L=${f4(e.longitud)} ${unidadLong}  |  theta=${f4(e.angDesdeA)} deg`
      })
    ]
  })

  // Pasos 3+: Ecuaciones por nudo
  nodosLibres.forEach((n, ni) => {
    const eqXParts: string[] = []
    const eqYParts: string[] = []
    const sustX: string[] = []
    const sustY: string[] = []
    let sumKX = 0, sumKY = 0

    elementos.forEach(e => {
      let angN: number | null = null
      if (e.nodoA === n.id) angN = e.angDesdeA
      else if (e.nodoB === n.id) angN = e.angDesdeA + 180
      if (angN !== null) {
        const cosA = Math.cos(angN * Math.PI / 180)
        const sinA = Math.sin(angN * Math.PI / 180)
        if (e.conocido) {
          eqXParts.push(`${f2(e.valorConocido)}*cos(${f2(angN)} deg)`)
          eqYParts.push(`${f2(e.valorConocido)}*sin(${f2(angN)} deg)`)
          sustX.push(`${f4(e.valorConocido * cosA)}`)
          sustY.push(`${f4(e.valorConocido * sinA)}`)
          sumKX += e.valorConocido * cosA
          sumKY += e.valorConocido * sinA
        } else {
          eqXParts.push(`${e.nombre}*cos(${f2(angN)} deg)`)
          eqYParts.push(`${e.nombre}*sin(${f2(angN)} deg)`)
          sustX.push(`${e.nombre}*(${f4(cosA)})`)
          sustY.push(`${e.nombre}*(${f4(sinA)})`)
        }
      }
    })

    const fuerzasNudo = fuerzas.filter(f => f.nodoId === n.id)
    fuerzasNudo.forEach(f => {
      const mag = modoDiseno && f.modo === "soloMagnitud" ? 1 : f.magnitud
      const cosA = Math.cos(f.angulo * Math.PI / 180)
      const sinA = Math.sin(f.angulo * Math.PI / 180)
      if (f.modo === "completa" || (modoDiseno && f.modo === "soloMagnitud")) {
        eqXParts.push(`${f.nombre}*cos(${f2(f.angulo)} deg)`)
        eqYParts.push(`${f.nombre}*sin(${f2(f.angulo)} deg)`)
        sustX.push(`${f4(mag * cosA)}`)
        sustY.push(`${f4(mag * sinA)}`)
        sumKX += mag * cosA
        sumKY += mag * sinA
      } else if (f.modo === "soloMagnitud") {
        eqXParts.push(`${f.nombre}*cos(${f2(f.angulo)} deg)`)
        eqYParts.push(`${f.nombre}*sin(${f2(f.angulo)} deg)`)
        sustX.push(`${f.nombre}*(${f4(cosA)})`)
        sustY.push(`${f.nombre}*(${f4(sinA)})`)
      }
    })

    pasos.push({
      titulo: `Paso ${ni + 3} — Equilibrio en nudo ${n.nombre} (${f2(n.x)}, ${f2(n.y)})`,
      lineas: [
        `Elementos conectados: ${elementos.filter(e => e.nodoA === n.id || e.nodoB === n.id).map(e => e.nombre).join(", ")}`,
        `Fuerzas externas: ${fuerzasNudo.length > 0 ? fuerzasNudo.map(f => f.nombre).join(", ") : "ninguna"}`,
        "",
        `SFx = 0:  ${eqXParts.join(" + ")} = 0`,
        `         Sustitucion:  ${sustX.join(" + ")} = 0`,
        "",
        `SFy = 0:  ${eqYParts.join(" + ")} = 0`,
        `         Sustitucion:  ${sustY.join(" + ")} = 0`,
      ]
    })
  })

  // Paso N: Sistema matricial
  const ni_count = incognitas.length
  const A_mat: number[][] = []
  const b_vec: number[] = []

  nodosLibres.forEach(n => {
    const rowX = new Array(ni_count).fill(0)
    const rowY = new Array(ni_count).fill(0)
    let kX = 0, kY = 0

    elementos.forEach(e => {
      let angN: number | null = null
      if (e.nodoA === n.id) angN = e.angDesdeA
      else if (e.nodoB === n.id) angN = e.angDesdeA + 180
      if (angN !== null) {
        const cosA = Math.cos(angN * Math.PI / 180)
        const sinA = Math.sin(angN * Math.PI / 180)
        if (e.conocido) { kX += e.valorConocido * cosA; kY += e.valorConocido * sinA }
        else {
          const idx = incognitas.findIndex(i => i.tipo === "elemento" && i.refId === e.id)
          if (idx >= 0) { rowX[idx] += cosA; rowY[idx] += sinA }
        }
      }
    })

    fuerzas.filter(f => f.nodoId === n.id).forEach(f => {
      const mag = modoDiseno && f.modo === "soloMagnitud" ? 1 : f.magnitud
      if (f.modo === "completa" || (modoDiseno && f.modo === "soloMagnitud")) {
        kX += mag * Math.cos(f.angulo * Math.PI / 180)
        kY += mag * Math.sin(f.angulo * Math.PI / 180)
      } else if (f.modo === "soloMagnitud") {
        const idx = incognitas.findIndex(i => i.tipo === "fuerzaMag" && i.refId === f.id)
        if (idx >= 0) { rowX[idx] += Math.cos(f.angulo * Math.PI / 180); rowY[idx] += Math.sin(f.angulo * Math.PI / 180) }
      }
    })

    A_mat.push(rowX); b_vec.push(-kX)
    A_mat.push(rowY); b_vec.push(-kY)
  })

  const matrizLineas: string[] = [
    `Sistema A * x = b  (${A_mat.length} ecuaciones, ${ni_count} incognitas)`,
    "",
    `Incognitas x = [ ${incognitas.map(i => i.nombre).join(",  ")} ]`,
    "",
    "Matriz A (coeficientes):",
    ...A_mat.map((row, i) => `  Ec.${i + 1}: [ ${row.map(v => f4(v).padStart(9)).join("  ")} ]  |  b = ${f4(b_vec[i])}`),
    "",
    "Resolucion por eliminacion gaussiana con pivoteo parcial.",
    solucion ? `Solucion: x = [ ${solucion.map(v => f4(v)).join(",  ")} ]` : "Sin solucion unica."
  ]

  pasos.push({ titulo: `Paso ${nodosLibres.length + 3} — Sistema matricial y solucion`, lineas: matrizLineas, esMatriz: true })

  // Paso final: verificación
  if (solucion) {
    pasos.push({
      titulo: `Paso ${nodosLibres.length + 4} — Verificacion de equilibrio`,
      lineas: [
        "Se sustituyen los valores calculados en las ecuaciones originales:",
        "",
        ...checkPorNodo.map(c =>
          `Nudo ${c.nombre}:  SFx = ${f4(c.fx)} ${unidadFuerza}   SFy = ${f4(c.fy)} ${unidadFuerza}   ${Math.abs(c.fx) < 0.01 && Math.abs(c.fy) < 0.01 ? "-> CUMPLE EQUILIBRIO" : "-> ERROR"}`
        )
      ],
      resultado: checkPorNodo.every(c => Math.abs(c.fx) < 0.01 && Math.abs(c.fy) < 0.01)
        ? "Verificacion exitosa: todos los nudos cumplen SFx=0 y SFy=0"
        : "Advertencia: algunos nudos no cumplen equilibrio exactamente"
    })
  }

  return (
    <Document>

      {/* ── PORTADA ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverLogo}>NodoCalc</Text>
          <Text style={styles.coverLogoSub}>Plataforma de calculo para ingenieria civil</Text>
          <View style={styles.coverLine} />
          <Text style={styles.coverTitle}>MEMORIA DE CALCULO</Text>
          <Text style={styles.coverSubtitle}>
            Equilibrio 2D — Sistema de Nodos y Elementos{"\n"}
            {modoDiseno ? "Modo Diseno: Peso Maximo Admisible" : "Analisis de Incognitas"}
          </Text>
          <View style={{ height: 20 }} />
          <View style={styles.coverBox}>
            {[
              { l: "Proyecto:", v: datosUsuario.proyecto || "—" },
              { l: "Descripcion:", v: datosUsuario.descripcion || "—" },
              { l: "Ingeniero:", v: datosUsuario.ingeniero || "—" },
              { l: "Empresa:", v: datosUsuario.empresa || "—" },
              { l: "Fecha:", v: fechaHoy() },
              { l: "Modo calculo:", v: modoDiseno ? "Diseno (W maximo)" : "Analisis (incognitas)" },
              { l: "Nudos:", v: `${nodos.length} total  (${nodosLibres.length} libres)` },
              { l: "Elementos:", v: `${elementos.length}` },
              { l: "Incognitas:", v: `${incognitas.length}` },
            ].map(({ l, v }) => (
              <View key={l} style={styles.coverRow}>
                <Text style={styles.coverLabel}>{l}</Text>
                <Text style={styles.coverValue}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>Desarrollado por Julian Leon y Miguel Cardenas — NodoCalc</Text>
        </View>
      </Page>

      {/* ── DATOS DEL SISTEMA ────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Header titulo="Equilibrio 2D — Datos del Sistema" />
        <Text style={styles.secTitle}>1.  DATOS DEL SISTEMA</Text>

        <Text style={styles.subTitle}>1.1  Nodos</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { flex: 0.5 }]}>Nodo</Text>
            <Text style={styles.tableHeadCell}>x ({unidadLong})</Text>
            <Text style={styles.tableHeadCell}>y ({unidadLong})</Text>
            <Text style={[styles.tableHeadCell, { flex: 2 }]}>Tipo de apoyo</Text>
          </View>
          {nodos.map((n, i) => (
            <View key={n.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellB, { flex: 0.5 }]}>{n.nombre}</Text>
              <Text style={styles.tableCell}>{f2(n.x)}</Text>
              <Text style={styles.tableCell}>{f2(n.y)}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{nombreApoyo(n.apoyo)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subTitle}>1.2  Elementos</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { flex: 0.6 }]}>Elem.</Text>
            <Text style={styles.tableHeadCell}>Tipo</Text>
            <Text style={[styles.tableHeadCell, { flex: 0.6 }]}>De</Text>
            <Text style={[styles.tableHeadCell, { flex: 0.6 }]}>A</Text>
            <Text style={styles.tableHeadCell}>L ({unidadLong})</Text>
            <Text style={styles.tableHeadCell}>theta (deg)</Text>
            <Text style={[styles.tableHeadCell, { flex: 1.8 }]}>Estado</Text>
          </View>
          {elementos.map((e, i) => (
            <View key={e.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellB, { flex: 0.6 }]}>{e.nombre}</Text>
              <Text style={styles.tableCell}>{e.tipo}</Text>
              <Text style={[styles.tableCell, { flex: 0.6 }]}>{getNodo(e.nodoA).nombre}</Text>
              <Text style={[styles.tableCell, { flex: 0.6 }]}>{getNodo(e.nodoB).nombre}</Text>
              <Text style={styles.tableCell}>{f4(e.longitud)}</Text>
              <Text style={styles.tableCell}>{f2(e.angDesdeA)}</Text>
              <Text style={[styles.tableCell, { flex: 1.8 }]}>
                {e.conocido ? `Conocido: ${f2(e.valorConocido)} ${unidadFuerza}` : `Incognita${modoDiseno && e.tipo === "cable" ? ` (T_adm=${f2(e.tensionAdmisible)})` : ""}`}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.subTitle}>1.3  Fuerzas externas</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { flex: 0.6 }]}>Fuerza</Text>
            <Text style={[styles.tableHeadCell, { flex: 0.6 }]}>Nudo</Text>
            <Text style={styles.tableHeadCell}>Magnitud ({unidadFuerza})</Text>
            <Text style={styles.tableHeadCell}>Angulo (deg)</Text>
            <Text style={[styles.tableHeadCell, { flex: 2 }]}>Modo</Text>
          </View>
          {fuerzas.map((f, i) => (
            <View key={f.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellB, { flex: 0.6 }]}>{f.nombre}</Text>
              <Text style={[styles.tableCell, { flex: 0.6 }]}>{getNodo(f.nodoId).nombre}</Text>
              <Text style={styles.tableCell}>{f.modo === "completa" ? f2(f.magnitud) : modoDiseno && f.modo === "soloMagnitud" ? "1 (ref W=1)" : "incognita"}</Text>
              <Text style={styles.tableCell}>{f2(f.angulo)}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{f.modo === "completa" ? "Magnitud y angulo conocidos" : f.modo === "soloMagnitud" ? "Solo angulo conocido — magnitud incognita" : "Resultante incognita"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subTitle}>1.4  Diagrama del sistema</Text>
        {imagenCanvas
          ? <Image src={imagenCanvas} style={styles.canvasImg} />
          : <Text style={styles.bodyText}>Diagrama no disponible — presione Calcular antes de generar el PDF</Text>
        }

        <Footer />
      </Page>

      {/* ── DESARROLLO PASO A PASO ───────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Header titulo="Equilibrio 2D — Desarrollo Analitico" />
        <Text style={styles.secTitle}>2.  DESARROLLO ANALITICO PASO A PASO</Text>

        {pasos.slice(0, Math.ceil(pasos.length / 2)).map((paso, i) => (
          <View key={i} style={paso.esMatriz ? styles.matrizBox : styles.stepBox} wrap={false}>
            <Text style={paso.esMatriz ? styles.matrizTitle : styles.stepTitle}>{paso.titulo}</Text>
            {paso.lineas.map((l, j) => (
              <Text key={j} style={paso.esMatriz ? styles.matrizLine : styles.stepLine}>{l}</Text>
            ))}
            {paso.resultado && <Text style={styles.stepResult}>{paso.resultado}</Text>}
          </View>
        ))}

        <Footer />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header titulo="Equilibrio 2D — Sistema Matricial" />
        <Text style={styles.secTitle}>2.  DESARROLLO (continuacion)</Text>

        {pasos.slice(Math.ceil(pasos.length / 2)).map((paso, i) => (
          <View key={i} style={paso.esMatriz ? styles.matrizBox : styles.stepBox} wrap={false}>
            <Text style={paso.esMatriz ? styles.matrizTitle : styles.stepTitle}>{paso.titulo}</Text>
            {paso.lineas.map((l, j) => (
              <Text key={j} style={paso.esMatriz ? styles.matrizLine : styles.stepLine}>{l}</Text>
            ))}
            {paso.resultado && <Text style={styles.stepResult}>{paso.resultado}</Text>}
          </View>
        ))}

        <Footer />
      </Page>

      {/* ── RESULTADOS ───────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Header titulo="Equilibrio 2D — Resultados" />
        <Text style={styles.secTitle}>3.  RESULTADOS</Text>

        {modoDiseno && disenoResultado ? (
          <>
            <Text style={styles.subTitle}>3.1  Peso maximo admisible — Modo Diseno</Text>
            <View style={[styles.stepResult, { marginBottom: 12 }]}>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: "#14532d" }}>
                W_max = {f4(disenoResultado.wMax)} {unidadFuerza}
              </Text>
              <Text style={{ fontSize: 9, color: "#166534", marginTop: 2 }}>
                Cable gobernante: {disenoResultado.cableGobernante} (es el primero en alcanzar su tension admisible)
              </Text>
            </View>
            <Text style={styles.bodyText}>
              Procedimiento: se resuelve el sistema con W = 1 {unidadFuerza} de referencia, obteniendo los factores
              k_i = T_i / W para cada cable. El peso maximo es W_max = min(T_adm_i / k_i).
            </Text>
            <Text style={styles.subTitle}>3.2  Factores de proporcionalidad</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={styles.tableHeadCell}>Cable</Text>
                <Text style={styles.tableHeadCell}>T con W=1 ({unidadFuerza})</Text>
                <Text style={styles.tableHeadCell}>k = T/W</Text>
                <Text style={styles.tableHeadCell}>T_adm ({unidadFuerza})</Text>
                <Text style={styles.tableHeadCell}>W_max ({unidadFuerza})</Text>
                <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>Estado</Text>
              </View>
              {disenoResultado.factoresK.map((f, i) => (
                <View key={f.nombre} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.tableCellB}>{f.nombre}</Text>
                  <Text style={styles.tableCell}>{f4(f.k)}</Text>
                  <Text style={styles.tableCell}>{f4(f.k)}</Text>
                  <Text style={styles.tableCell}>{f4(elementos.find(e => e.nombre === f.nombre)?.tensionAdmisible ?? 0)}</Text>
                  <Text style={[styles.tableCellB, { color: f.wMaxIndividual === disenoResultado.wMax ? "#dc2626" : "#1e293b" }]}>
                    {f4(f.wMaxIndividual)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.8, color: f.wMaxIndividual === disenoResultado.wMax ? "#dc2626" : "#16a34a" }]}>
                    {f.wMaxIndividual === disenoResultado.wMax ? "GOBIERNA" : "OK"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : solucion ? (
          <>
            <Text style={styles.subTitle}>3.1  Valores calculados de incognitas</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {incognitas.map((inc, i) => {
                if (inc.tipo === "resultanteX") return null
                if (inc.tipo === "resultanteY") {
                  const iX = incognitas.findIndex(ii => ii.tipo === "resultanteX" && ii.refId === inc.refId)
                  const rx = solucion[iX], ry = solucion[i]
                  const mag = Math.sqrt(rx*rx+ry*ry), ang = Math.atan2(ry,rx)*180/Math.PI
                  const fuerza = fuerzas.find(f => f.id === inc.refId)
                  return (
                    <View key={i} style={[styles.resCard, { width: "100%" }]}>
                      <Text style={styles.resLabel}>{fuerza?.nombre} (resultante incognita)</Text>
                      <Text style={styles.resValue}>|R| = {f4(mag)} {unidadFuerza}   ang = {f2(ang)} deg</Text>
                      <Text style={styles.resUnit}>Rx = {f4(rx)} {unidadFuerza}   Ry = {f4(ry)} {unidadFuerza}</Text>
                    </View>
                  )
                }
                const val = solucion[i]
                const esCompresion = inc.tipo === "elemento" && val < -0.01
                return (
                  <View key={i} style={[styles.resCard, esCompresion ? { borderColor: "#dc2626", backgroundColor: "#fef2f2" } : {}]}>
                    <Text style={[styles.resLabel, esCompresion ? { color: "#dc2626" } : {}]}>
                      {inc.nombre} {inc.tipo === "elemento" ? (val >= 0 ? "(Tension)" : "(Compresion)") : inc.tipo === "fuerzaMag" ? "(Fuerza — mag)" : "(Reaccion)"}
                    </Text>
                    <Text style={[styles.resValue, { color: esCompresion ? "#dc2626" : "#1e3a8a" }]}>{f4(val)}</Text>
                    <Text style={styles.resUnit}>{unidadFuerza}</Text>
                  </View>
                )
              })}
            </View>
          </>
        ) : (
          <Text style={styles.bodyText}>No se obtuvo solucion. Revise el planteamiento del problema.</Text>
        )}

        <Text style={styles.subTitle}>{modoDiseno ? "3.3" : "3.2"}  Verificacion de equilibrio</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadCell}>Nudo</Text>
            <Text style={styles.tableHeadCell}>SFx ({unidadFuerza})</Text>
            <Text style={styles.tableHeadCell}>SFy ({unidadFuerza})</Text>
            <Text style={styles.tableHeadCell}>Estado</Text>
          </View>
          {checkPorNodo.map((c, i) => {
            const ok = Math.abs(c.fx) < 0.01 && Math.abs(c.fy) < 0.01
            return (
              <View key={c.nombre} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.tableCellB}>{c.nombre}</Text>
                <Text style={styles.tableCell}>{f4(c.fx)}</Text>
                <Text style={styles.tableCell}>{f4(c.fy)}</Text>
                <Text style={[styles.tableCellB, { color: ok ? "#16a34a" : "#dc2626" }]}>
                  {ok ? "OK — Cumple equilibrio" : "ERROR — No cumple"}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            NOTA: Esta memoria de calculo ha sido generada automaticamente por NodoCalc. Los resultados deben ser verificados
            por un ingeniero civil competente antes de su uso en proyectos reales. NodoCalc y sus desarrolladores no se
            responsabilizan por el uso incorrecto de estos resultados.
          </Text>
        </View>

        <Footer />
      </Page>

    </Document>
  )
}