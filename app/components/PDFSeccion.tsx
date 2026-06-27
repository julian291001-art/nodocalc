"use client"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#1e293b",
    paddingTop: 45,
    paddingBottom: 55,
    paddingHorizontal: 50,
  },

  // ── Encabezado ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 8,
    marginBottom: 14,
  },
  headerLogo: { fontSize: 16, fontFamily: "Times-Bold", color: "#1d4ed8" },
  headerSub: { fontSize: 7, color: "#64748b", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 9, fontFamily: "Times-Bold", color: "#1e293b" },
  headerDate: { fontSize: 7, color: "#64748b", marginTop: 2 },

  // ── Portada ──
  coverPage: { flex: 1, justifyContent: "center", alignItems: "center" },
  coverLogo: { fontSize: 42, fontFamily: "Times-Bold", color: "#1d4ed8", marginBottom: 4 },
  coverLogoSub: { fontSize: 12, color: "#64748b", marginBottom: 40 },
  coverLine: { width: 100, height: 2, backgroundColor: "#1d4ed8", marginBottom: 40 },
  coverTitle: { fontSize: 22, fontFamily: "Times-Bold", color: "#1e293b", textAlign: "center", marginBottom: 8 },
  coverSubtitle: { fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 50 },
  coverBox: { width: "100%", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4, padding: 24, backgroundColor: "#f8fafc" },
  coverRow: { flexDirection: "row", marginBottom: 10 },
  coverLabel: { fontSize: 9, fontFamily: "Times-Bold", color: "#64748b", width: 110 },
  coverValue: { fontSize: 10, color: "#1e293b", flex: 1 },
  coverFooter: { position: "absolute", bottom: 40, alignItems: "center" },
  coverFooterText: { fontSize: 8, color: "#94a3b8" },

  // ── Títulos ──
  secTitle: {
    fontSize: 13,
    fontFamily: "Times-Bold",
    color: "#1d4ed8",
    marginTop: 16,
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 4,
  },
  subTitle: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    color: "#334155",
    marginTop: 12,
    marginBottom: 8,
  },

  // ── Bloque de ecuación ──
  eqBlock: {
    marginBottom: 14,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#1d4ed8",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 3,
  },
  eqBlockTitle: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    color: "#1d4ed8",
    marginBottom: 8,
  },
  eqGeneral: {
    fontSize: 11,
    fontFamily: "Times-Roman",
    color: "#334155",
    textAlign: "center",
    marginBottom: 6,
  },
  eqSustitucion: {
    fontSize: 11,
    fontFamily: "Times-Roman",
    color: "#475569",
    textAlign: "center",
    marginBottom: 6,
  },
  eqIntermedio: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 6,
  },
  eqResultado: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    color: "#1e3a8a",
    textAlign: "center",
    backgroundColor: "#dbeafe",
    padding: 6,
    borderRadius: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  eqNota: {
    fontSize: 8,
    fontFamily: "Times-Italic",
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },

  // ── Tablas ──
  table: { marginBottom: 12 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#1d4ed8",
    padding: 5,
    borderRadius: 3,
  },
  tableHeadCell: { color: "white", fontFamily: "Times-Bold", fontSize: 8, flex: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4, backgroundColor: "#f8fafc" },
  tableCell: { fontSize: 8, flex: 1, color: "#334155", fontFamily: "Times-Roman" },
  tableCellB: { fontSize: 8, flex: 1, color: "#1e293b", fontFamily: "Times-Bold" },

  // ── Resultados finales ──
  resGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  resCard: { width: "48%", backgroundColor: "#eff6ff", borderRadius: 4, padding: 8, borderWidth: 1, borderColor: "#bfdbfe" },
  resLabel: { fontSize: 7, color: "#3b82f6", fontFamily: "Times-Bold", marginBottom: 2 },
  resValue: { fontSize: 11, fontFamily: "Times-Bold", color: "#1e3a8a" },
  resUnit: { fontSize: 7, color: "#64748b", fontFamily: "Times-Roman" },

  // ── Imagen ──
  canvasImg: { width: "100%", height: 200, objectFit: "contain", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 3, marginBottom: 10 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: "#94a3b8", fontFamily: "Times-Roman" },
  footerPage: { fontSize: 7, color: "#94a3b8", fontFamily: "Times-Roman" },

  // ── Disclaimer ──
  disclaimer: {
    backgroundColor: "#fefce8",
    borderRadius: 3,
    padding: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginTop: 16,
  },
  disclaimerText: { fontSize: 7, color: "#92400e", fontFamily: "Times-Roman" },

  // ── Separador ──
  sep: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginVertical: 8 },
})

// ── Tipos ──────────────────────────────────────────────────────────────────
type Elemento = {
  id: number; plantilla: string; params: Record<string, number>
  x0: number; y0: number; signo: 1 | -1; label: string
  coordPts?: { x: number; y: number }[]
}

type ResultadoSeccion = {
  A: number; xc: number; yc: number; Icx: number; Icy: number; Ixy: number
  Sx_top: number; Sx_bot: number; Sy: number; rx: number; ry: number
  J: number; I1: number; I2: number; theta_p: number
}

type DatosUsuario = {
  ingeniero: string; empresa: string; proyecto: string; descripcion: string; fecha: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function f2(n: number) { return n.toFixed(2) }
function f4(n: number) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(4)
}
function fecha() {
  return new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
}

// ── Componente de ecuación ─────────────────────────────────────────────────
function Ecuacion({ titulo, general, sustitucion, intermedio, resultado, nota }: {
  titulo: string
  general: string
  sustitucion?: string
  intermedio?: string
  resultado: string
  nota?: string
}) {
  return (
    <View style={styles.eqBlock}>
      <Text style={styles.eqBlockTitle}>{titulo}</Text>
      <Text style={styles.eqGeneral}>{general}</Text>
      {sustitucion && <Text style={styles.eqSustitucion}>{sustitucion}</Text>}
      {intermedio && <Text style={styles.eqIntermedio}>{intermedio}</Text>}
      <Text style={styles.eqResultado}>{resultado}</Text>
      {nota && <Text style={styles.eqNota}>{nota}</Text>}
    </View>
  )
}

// ── Paso a paso por plantilla ──────────────────────────────────────────────
function PasoAPasoElemento({ el }: { el: Elemento }) {
  const p = el.params
  const signoStr = el.signo > 0 ? "(+ suma)" : "(- resta)"

  if (el.plantilla === "rectangular") {
    const A = p.b * p.h
    const xc = p.b / 2 + el.x0
    const yc = p.h / 2 + el.y0
    const Icx = p.b * Math.pow(p.h, 3) / 12
    const Icy = p.h * Math.pow(p.b, 3) / 12
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Seccion Rectangular {signoStr}</Text>
        <Ecuacion
          titulo="Area"
          general="A  =  b x h"
          sustitucion={`A  =  ${f2(p.b)} x ${f2(p.h)}`}
          resultado={`A  =  ${f4(A)} cm2`}
        />
        <Ecuacion
          titulo="Centroide en x"
          general="x_c  =  b/2  +  x0"
          sustitucion={`x_c  =  ${f2(p.b)}/2  +  ${f2(el.x0)}`}
          intermedio={`x_c  =  ${f2(p.b / 2)}  +  ${f2(el.x0)}`}
          resultado={`x_c  =  ${f4(xc)} cm`}
        />
        <Ecuacion
          titulo="Centroide en y"
          general="y_c  =  h/2  +  y0"
          sustitucion={`y_c  =  ${f2(p.h)}/2  +  ${f2(el.y0)}`}
          intermedio={`y_c  =  ${f2(p.h / 2)}  +  ${f2(el.y0)}`}
          resultado={`y_c  =  ${f4(yc)} cm`}
        />
        <Ecuacion
          titulo="Inercia centroidal x (respecto al centroide propio)"
          general="Icx  =  b x h^3 / 12"
          sustitucion={`Icx  =  ${f2(p.b)} x ${f2(p.h)}^3 / 12`}
          intermedio={`Icx  =  ${f2(p.b)} x ${f2(Math.pow(p.h, 3))} / 12`}
          resultado={`Icx  =  ${f4(Icx)} cm4`}
        />
        <Ecuacion
          titulo="Inercia centroidal y (respecto al centroide propio)"
          general="Icy  =  h x b^3 / 12"
          sustitucion={`Icy  =  ${f2(p.h)} x ${f2(p.b)}^3 / 12`}
          intermedio={`Icy  =  ${f2(p.h)} x ${f2(Math.pow(p.b, 3))} / 12`}
          resultado={`Icy  =  ${f4(Icy)} cm4`}
        />
      </View>
    )
  }

  if (el.plantilla === "circular") {
    const A = Math.PI * p.r * p.r
    const xc = p.r + el.x0
    const yc = p.r + el.y0
    const Ic = Math.PI * Math.pow(p.r, 4) / 4
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Seccion Circular {signoStr}</Text>
        <Ecuacion
          titulo="Area"
          general="A  =  PI x r^2"
          sustitucion={`A  =  3.14159 x ${f2(p.r)}^2`}
          intermedio={`A  =  3.14159 x ${f2(p.r * p.r)}`}
          resultado={`A  =  ${f4(A)} cm2`}
        />
        <Ecuacion
          titulo="Centro del circulo"
          general="(x_c, y_c)  =  (r + x0,  r + y0)"
          sustitucion={`(x_c, y_c)  =  (${f2(p.r)} + ${f2(el.x0)},  ${f2(p.r)} + ${f2(el.y0)})`}
          resultado={`(x_c, y_c)  =  (${f4(xc)},  ${f4(yc)}) cm`}
        />
        <Ecuacion
          titulo="Inercia centroidal (Icx = Icy por simetria axial)"
          general="Ic  =  PI x r^4 / 4"
          sustitucion={`Ic  =  3.14159 x ${f2(p.r)}^4 / 4`}
          intermedio={`Ic  =  3.14159 x ${f2(Math.pow(p.r, 4))} / 4`}
          resultado={`Icx  =  Icy  =  ${f4(Ic)} cm4`}
          nota="Por simetria axial: Ixy = 0"
        />
      </View>
    )
  }

  if (el.plantilla === "tubo") {
    const ri = p.r - p.t
    const A = Math.PI * (p.r * p.r - ri * ri)
    const xc = p.r + el.x0
    const yc = p.r + el.y0
    const Ic = Math.PI * (Math.pow(p.r, 4) - Math.pow(ri, 4)) / 4
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Tubo Circular {signoStr}</Text>
        <Ecuacion
          titulo="Radio interior"
          general="r_i  =  r  -  t"
          sustitucion={`r_i  =  ${f2(p.r)}  -  ${f2(p.t)}`}
          resultado={`r_i  =  ${f4(ri)} cm`}
        />
        <Ecuacion
          titulo="Area neta (corona circular)"
          general="A  =  PI x (r^2  -  r_i^2)"
          sustitucion={`A  =  3.14159 x (${f2(p.r)}^2  -  ${f2(ri)}^2)`}
          intermedio={`A  =  3.14159 x (${f2(p.r * p.r)}  -  ${f2(ri * ri)})`}
          resultado={`A  =  ${f4(A)} cm2`}
        />
        <Ecuacion
          titulo="Centro del tubo"
          general="(x_c, y_c)  =  (r + x0,  r + y0)"
          sustitucion={`(x_c, y_c)  =  (${f2(p.r)} + ${f2(el.x0)},  ${f2(p.r)} + ${f2(el.y0)})`}
          resultado={`(x_c, y_c)  =  (${f4(xc)},  ${f4(yc)}) cm`}
        />
        <Ecuacion
          titulo="Inercia centroidal (Icx = Icy por simetria)"
          general="Ic  =  PI x (r^4  -  r_i^4) / 4"
          sustitucion={`Ic  =  3.14159 x (${f2(p.r)}^4  -  ${f2(ri)}^4) / 4`}
          intermedio={`Ic  =  3.14159 x (${f2(Math.pow(p.r, 4))}  -  ${f2(Math.pow(ri, 4))}) / 4`}
          resultado={`Icx  =  Icy  =  ${f4(Ic)} cm4`}
        />
      </View>
    )
  }

  if (el.plantilla === "I") {
    const A1 = p.bf_inf * p.tf_inf
    const A2 = p.tw * p.hw
    const A3 = p.bf_sup * p.tf_sup
    const y1 = p.tf_inf / 2 + el.y0
    const y2 = p.tf_inf + p.hw / 2 + el.y0
    const y3 = p.tf_inf + p.hw + p.tf_sup / 2 + el.y0
    const A = A1 + A2 + A3
    const yc = (A1 * y1 + A2 * y2 + A3 * y3) / A
    const Ic1 = p.bf_inf * Math.pow(p.tf_inf, 3) / 12
    const Ic2 = p.tw * Math.pow(p.hw, 3) / 12
    const Ic3 = p.bf_sup * Math.pow(p.tf_sup, 3) / 12
    const Ics1 = Ic1 + A1 * Math.pow(y1 - yc, 2)
    const Ics2 = Ic2 + A2 * Math.pow(y2 - yc, 2)
    const Ics3 = Ic3 + A3 * Math.pow(y3 - yc, 2)
    const Icx = Ics1 + Ics2 + Ics3
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Perfil I Asimetrico {signoStr}</Text>
        <Text style={styles.eqNota}>Descomposicion en 3 rectangulos: ala inferior (1), alma (2), ala superior (3)</Text>

        <Ecuacion titulo="Area ala inferior [1]"
          general="A1  =  bf,inf  x  tf,inf"
          sustitucion={`A1  =  ${f2(p.bf_inf)}  x  ${f2(p.tf_inf)}`}
          resultado={`A1  =  ${f4(A1)} cm2`} />
        <Ecuacion titulo="Centroide ala inferior y1 (desde origen)"
          general="y1  =  tf,inf / 2  +  y0"
          sustitucion={`y1  =  ${f2(p.tf_inf)} / 2  +  ${f2(el.y0)}`}
          resultado={`y1  =  ${f4(y1)} cm`} />

        <Ecuacion titulo="Area alma [2]"
          general="A2  =  tw  x  hw"
          sustitucion={`A2  =  ${f2(p.tw)}  x  ${f2(p.hw)}`}
          resultado={`A2  =  ${f4(A2)} cm2`} />
        <Ecuacion titulo="Centroide alma y2"
          general="y2  =  tf,inf  +  hw/2  +  y0"
          sustitucion={`y2  =  ${f2(p.tf_inf)}  +  ${f2(p.hw)}/2  +  ${f2(el.y0)}`}
          resultado={`y2  =  ${f4(y2)} cm`} />

        <Ecuacion titulo="Area ala superior [3]"
          general="A3  =  bf,sup  x  tf,sup"
          sustitucion={`A3  =  ${f2(p.bf_sup)}  x  ${f2(p.tf_sup)}`}
          resultado={`A3  =  ${f4(A3)} cm2`} />
        <Ecuacion titulo="Centroide ala superior y3"
          general="y3  =  tf,inf  +  hw  +  tf,sup/2  +  y0"
          sustitucion={`y3  =  ${f2(p.tf_inf)}  +  ${f2(p.hw)}  +  ${f2(p.tf_sup)}/2  +  ${f2(el.y0)}`}
          resultado={`y3  =  ${f4(y3)} cm`} />

        <Ecuacion titulo="Area total"
          general="A  =  A1  +  A2  +  A3"
          sustitucion={`A  =  ${f2(A1)}  +  ${f2(A2)}  +  ${f2(A3)}`}
          resultado={`A  =  ${f4(A)} cm2`} />

        <Ecuacion titulo="Centroide global y_c del perfil I"
          general="y_c  =  (A1*y1  +  A2*y2  +  A3*y3) / A"
          sustitucion={`y_c  =  (${f2(A1)}x${f2(y1)}  +  ${f2(A2)}x${f2(y2)}  +  ${f2(A3)}x${f2(y3)}) / ${f2(A)}`}
          resultado={`y_c  =  ${f4(yc)} cm`} />

        <Ecuacion titulo="Inercia ala inferior con Steiner [1]"
          general="Ics1  =  (bf,inf x tf,inf^3)/12  +  A1 x (y1 - y_c)^2"
          sustitucion={`Ics1  =  (${f2(p.bf_inf)} x ${f2(p.tf_inf)}^3)/12  +  ${f2(A1)} x (${f2(y1)} - ${f2(yc)})^2`}
          intermedio={`Ics1  =  ${f4(Ic1)}  +  ${f4(A1 * Math.pow(y1 - yc, 2))}`}
          resultado={`Ics1  =  ${f4(Ics1)} cm4`} />

        <Ecuacion titulo="Inercia alma con Steiner [2]"
          general="Ics2  =  (tw x hw^3)/12  +  A2 x (y2 - y_c)^2"
          sustitucion={`Ics2  =  (${f2(p.tw)} x ${f2(p.hw)}^3)/12  +  ${f2(A2)} x (${f2(y2)} - ${f2(yc)})^2`}
          intermedio={`Ics2  =  ${f4(Ic2)}  +  ${f4(A2 * Math.pow(y2 - yc, 2))}`}
          resultado={`Ics2  =  ${f4(Ics2)} cm4`} />

        <Ecuacion titulo="Inercia ala superior con Steiner [3]"
          general="Ics3  =  (bf,sup x tf,sup^3)/12  +  A3 x (y3 - y_c)^2"
          sustitucion={`Ics3  =  (${f2(p.bf_sup)} x ${f2(p.tf_sup)}^3)/12  +  ${f2(A3)} x (${f2(y3)} - ${f2(yc)})^2`}
          intermedio={`Ics3  =  ${f4(Ic3)}  +  ${f4(A3 * Math.pow(y3 - yc, 2))}`}
          resultado={`Ics3  =  ${f4(Ics3)} cm4`} />

        <Ecuacion titulo="Inercia centroidal total Icx"
          general="Icx  =  Ics1  +  Ics2  +  Ics3"
          sustitucion={`Icx  =  ${f4(Ics1)}  +  ${f4(Ics2)}  +  ${f4(Ics3)}`}
          resultado={`Icx  =  ${f4(Icx)} cm4`} />
      </View>
    )
  }

  if (el.plantilla === "T") {
    const A1 = p.tw * p.hw
    const A2 = p.bf * p.tf
    const y1 = p.hw / 2 + el.y0
    const y2 = p.hw + p.tf / 2 + el.y0
    const A = A1 + A2
    const yc = (A1 * y1 + A2 * y2) / A
    const Ic1 = p.tw * Math.pow(p.hw, 3) / 12
    const Ic2 = p.bf * Math.pow(p.tf, 3) / 12
    const Ics1 = Ic1 + A1 * Math.pow(y1 - yc, 2)
    const Ics2 = Ic2 + A2 * Math.pow(y2 - yc, 2)
    const Icx = Ics1 + Ics2
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Perfil T {signoStr}</Text>
        <Text style={styles.eqNota}>Descomposicion en 2 rectangulos: alma (1) y ala (2)</Text>

        <Ecuacion titulo="Area alma [1]"
          general="A1  =  tw  x  hw"
          sustitucion={`A1  =  ${f2(p.tw)}  x  ${f2(p.hw)}`}
          resultado={`A1  =  ${f4(A1)} cm2`} />
        <Ecuacion titulo="Centroide alma y1"
          general="y1  =  hw/2  +  y0"
          sustitucion={`y1  =  ${f2(p.hw)}/2  +  ${f2(el.y0)}`}
          resultado={`y1  =  ${f4(y1)} cm`} />

        <Ecuacion titulo="Area ala [2]"
          general="A2  =  bf  x  tf"
          sustitucion={`A2  =  ${f2(p.bf)}  x  ${f2(p.tf)}`}
          resultado={`A2  =  ${f4(A2)} cm2`} />
        <Ecuacion titulo="Centroide ala y2"
          general="y2  =  hw  +  tf/2  +  y0"
          sustitucion={`y2  =  ${f2(p.hw)}  +  ${f2(p.tf)}/2  +  ${f2(el.y0)}`}
          resultado={`y2  =  ${f4(y2)} cm`} />

        <Ecuacion titulo="Area total"
          general="A  =  A1  +  A2"
          sustitucion={`A  =  ${f2(A1)}  +  ${f2(A2)}`}
          resultado={`A  =  ${f4(A)} cm2`} />

        <Ecuacion titulo="Centroide global y_c"
          general="y_c  =  (A1*y1  +  A2*y2) / A"
          sustitucion={`y_c  =  (${f2(A1)}x${f2(y1)}  +  ${f2(A2)}x${f2(y2)}) / ${f2(A)}`}
          resultado={`y_c  =  ${f4(yc)} cm`} />

        <Ecuacion titulo="Inercia alma con Steiner [1]"
          general="Ics1  =  (tw x hw^3)/12  +  A1 x (y1 - y_c)^2"
          sustitucion={`Ics1  =  (${f2(p.tw)} x ${f2(p.hw)}^3)/12  +  ${f2(A1)} x (${f2(y1)} - ${f2(yc)})^2`}
          intermedio={`Ics1  =  ${f4(Ic1)}  +  ${f4(A1 * Math.pow(y1 - yc, 2))}`}
          resultado={`Ics1  =  ${f4(Ics1)} cm4`} />

        <Ecuacion titulo="Inercia ala con Steiner [2]"
          general="Ics2  =  (bf x tf^3)/12  +  A2 x (y2 - y_c)^2"
          sustitucion={`Ics2  =  (${f2(p.bf)} x ${f2(p.tf)}^3)/12  +  ${f2(A2)} x (${f2(y2)} - ${f2(yc)})^2`}
          intermedio={`Ics2  =  ${f4(Ic2)}  +  ${f4(A2 * Math.pow(y2 - yc, 2))}`}
          resultado={`Ics2  =  ${f4(Ics2)} cm4`} />

        <Ecuacion titulo="Inercia centroidal total Icx"
          general="Icx  =  Ics1  +  Ics2"
          sustitucion={`Icx  =  ${f4(Ics1)}  +  ${f4(Ics2)}`}
          resultado={`Icx  =  ${f4(Icx)} cm4`} />
      </View>
    )
  }

  if (el.plantilla === "L") {
    const A = p.b * p.h - (p.b - p.t) * (p.h - p.t)
    const A1 = p.b * p.t
    const A2 = p.t * (p.h - p.t)
    const xc1 = p.b / 2 + el.x0
    const yc1 = p.t / 2 + el.y0
    const xc2 = p.t / 2 + el.x0
    const yc2 = p.t + (p.h - p.t) / 2 + el.y0
    const xcG = (A1 * xc1 + A2 * xc2) / A
    const ycG = (A1 * yc1 + A2 * yc2) / A
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Angulo L {signoStr}</Text>
        <Text style={styles.eqNota}>Descomposicion en 2 rectangulos: horizontal (1) y vertical (2)</Text>

        <Ecuacion titulo="Area horizontal [1]"
          general="A1  =  b  x  t"
          sustitucion={`A1  =  ${f2(p.b)}  x  ${f2(p.t)}`}
          resultado={`A1  =  ${f4(A1)} cm2`} />

        <Ecuacion titulo="Area vertical [2]"
          general="A2  =  t  x  (h - t)"
          sustitucion={`A2  =  ${f2(p.t)}  x  (${f2(p.h)} - ${f2(p.t)})`}
          resultado={`A2  =  ${f4(A2)} cm2`} />

        <Ecuacion titulo="Area total"
          general="A  =  A1  +  A2"
          sustitucion={`A  =  ${f2(A1)}  +  ${f2(A2)}`}
          resultado={`A  =  ${f4(A)} cm2`} />

        <Ecuacion titulo="Centroide global x_c"
          general="x_c  =  (A1*xc1  +  A2*xc2) / A"
          sustitucion={`x_c  =  (${f2(A1)}x${f2(xc1)}  +  ${f2(A2)}x${f2(xc2)}) / ${f2(A)}`}
          resultado={`x_c  =  ${f4(xcG)} cm`} />

        <Ecuacion titulo="Centroide global y_c"
          general="y_c  =  (A1*yc1  +  A2*yc2) / A"
          sustitucion={`y_c  =  (${f2(A1)}x${f2(yc1)}  +  ${f2(A2)}x${f2(yc2)}) / ${f2(A)}`}
          resultado={`y_c  =  ${f4(ycG)} cm`}
          nota="Las inercias se calculan por formula de Gauss (poligono)" />
      </View>
    )
  }

  if (el.plantilla === "C") {
    const A1 = p.bf_inf * p.tf_inf
    const A2 = p.tw * p.hw
    const A3 = p.bf_sup * p.tf_sup
    const y1 = p.tf_inf / 2 + el.y0
    const y2 = p.tf_inf + p.hw / 2 + el.y0
    const y3 = p.tf_inf + p.hw + p.tf_sup / 2 + el.y0
    const A = A1 + A2 + A3
    const yc = (A1 * y1 + A2 * y2 + A3 * y3) / A
    const Ic1 = p.bf_inf * Math.pow(p.tf_inf, 3) / 12
    const Ic2 = p.tw * Math.pow(p.hw, 3) / 12
    const Ic3 = p.bf_sup * Math.pow(p.tf_sup, 3) / 12
    const Ics1 = Ic1 + A1 * Math.pow(y1 - yc, 2)
    const Ics2 = Ic2 + A2 * Math.pow(y2 - yc, 2)
    const Ics3 = Ic3 + A3 * Math.pow(y3 - yc, 2)
    const Icx = Ics1 + Ics2 + Ics3
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Canal C Asimetrico {signoStr}</Text>
        <Text style={styles.eqNota}>Descomposicion en 3 rectangulos: ala inferior (1), alma (2), ala superior (3)</Text>

        <Ecuacion titulo="Area ala inferior [1]"
          general="A1  =  bf,inf  x  tf,inf"
          sustitucion={`A1  =  ${f2(p.bf_inf)}  x  ${f2(p.tf_inf)}`}
          resultado={`A1  =  ${f4(A1)} cm2`} />
        <Ecuacion titulo="Centroide ala inferior y1"
          general="y1  =  tf,inf/2  +  y0"
          sustitucion={`y1  =  ${f2(p.tf_inf)}/2  +  ${f2(el.y0)}`}
          resultado={`y1  =  ${f4(y1)} cm`} />

        <Ecuacion titulo="Area alma [2]"
          general="A2  =  tw  x  hw"
          sustitucion={`A2  =  ${f2(p.tw)}  x  ${f2(p.hw)}`}
          resultado={`A2  =  ${f4(A2)} cm2`} />
        <Ecuacion titulo="Centroide alma y2"
          general="y2  =  tf,inf  +  hw/2  +  y0"
          sustitucion={`y2  =  ${f2(p.tf_inf)}  +  ${f2(p.hw)}/2  +  ${f2(el.y0)}`}
          resultado={`y2  =  ${f4(y2)} cm`} />

        <Ecuacion titulo="Area ala superior [3]"
          general="A3  =  bf,sup  x  tf,sup"
          sustitucion={`A3  =  ${f2(p.bf_sup)}  x  ${f2(p.tf_sup)}`}
          resultado={`A3  =  ${f4(A3)} cm2`} />
        <Ecuacion titulo="Centroide ala superior y3"
          general="y3  =  tf,inf  +  hw  +  tf,sup/2  +  y0"
          sustitucion={`y3  =  ${f2(p.tf_inf)}  +  ${f2(p.hw)}  +  ${f2(p.tf_sup)}/2  +  ${f2(el.y0)}`}
          resultado={`y3  =  ${f4(y3)} cm`} />

        <Ecuacion titulo="Area total"
          general="A  =  A1  +  A2  +  A3"
          sustitucion={`A  =  ${f2(A1)}  +  ${f2(A2)}  +  ${f2(A3)}`}
          resultado={`A  =  ${f4(A)} cm2`} />

        <Ecuacion titulo="Centroide global y_c"
          general="y_c  =  (A1*y1  +  A2*y2  +  A3*y3) / A"
          sustitucion={`y_c  =  (${f2(A1)}x${f2(y1)}  +  ${f2(A2)}x${f2(y2)}  +  ${f2(A3)}x${f2(y3)}) / ${f2(A)}`}
          resultado={`y_c  =  ${f4(yc)} cm`} />

        <Ecuacion titulo="Inercia ala inferior con Steiner [1]"
          general="Ics1  =  (bf,inf x tf,inf^3)/12  +  A1 x (y1 - y_c)^2"
          sustitucion={`Ics1  =  (${f2(p.bf_inf)} x ${f2(p.tf_inf)}^3)/12  +  ${f2(A1)} x (${f2(y1)} - ${f2(yc)})^2`}
          intermedio={`Ics1  =  ${f4(Ic1)}  +  ${f4(A1 * Math.pow(y1 - yc, 2))}`}
          resultado={`Ics1  =  ${f4(Ics1)} cm4`} />

        <Ecuacion titulo="Inercia alma con Steiner [2]"
          general="Ics2  =  (tw x hw^3)/12  +  A2 x (y2 - y_c)^2"
          sustitucion={`Ics2  =  (${f2(p.tw)} x ${f2(p.hw)}^3)/12  +  ${f2(A2)} x (${f2(y2)} - ${f2(yc)})^2`}
          intermedio={`Ics2  =  ${f4(Ic2)}  +  ${f4(A2 * Math.pow(y2 - yc, 2))}`}
          resultado={`Ics2  =  ${f4(Ics2)} cm4`} />

        <Ecuacion titulo="Inercia ala superior con Steiner [3]"
          general="Ics3  =  (bf,sup x tf,sup^3)/12  +  A3 x (y3 - y_c)^2"
          sustitucion={`Ics3  =  (${f2(p.bf_sup)} x ${f2(p.tf_sup)}^3)/12  +  ${f2(A3)} x (${f2(y3)} - ${f2(yc)})^2`}
          intermedio={`Ics3  =  ${f4(Ic3)}  +  ${f4(A3 * Math.pow(y3 - yc, 2))}`}
          resultado={`Ics3  =  ${f4(Ics3)} cm4`} />

        <Ecuacion titulo="Inercia centroidal total Icx"
          general="Icx  =  Ics1  +  Ics2  +  Ics3"
          sustitucion={`Icx  =  ${f4(Ics1)}  +  ${f4(Ics2)}  +  ${f4(Ics3)}`}
          resultado={`Icx  =  ${f4(Icx)} cm4`} />
      </View>
    )
  }

  if (el.plantilla === "cajon") {
    const bS = p.b_sup || p.b, bI = p.b_inf || p.b
    const tS = p.t_sup || p.t, tI = p.t_inf || p.t, tL = p.t_izq || p.t, tR = p.t_der || p.t
    const Aext = bI * p.h
    const bint = bI - tL - tR
    const hint = p.h - tS - tI
    const Aint = bint * hint
    const A = Aext - Aint
    const yc_ext = p.h / 2 + el.y0
    const yc_int = tI + hint / 2 + el.y0
    const Icx_ext = bI * Math.pow(p.h, 3) / 12
    const Icx_int = bint * Math.pow(hint, 3) / 12
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Cajon Parametrico {signoStr}</Text>
        <Text style={styles.eqNota}>Rectangulo exterior menos rectangulo interior (hueco)</Text>

        <Ecuacion titulo="Area rectangulo exterior"
          general="A_ext  =  b_inf  x  h"
          sustitucion={`A_ext  =  ${f2(bI)}  x  ${f2(p.h)}`}
          resultado={`A_ext  =  ${f4(Aext)} cm2`} />

        <Ecuacion titulo="Dimensiones del hueco interior"
          general="b_int  =  b_inf - t_izq - t_der     h_int  =  h - t_sup - t_inf"
          sustitucion={`b_int  =  ${f2(bI)} - ${f2(tL)} - ${f2(tR)}  =  ${f2(bint)} cm     h_int  =  ${f2(p.h)} - ${f2(tS)} - ${f2(tI)}  =  ${f2(hint)} cm`}
          resultado={`b_int  =  ${f4(bint)} cm     h_int  =  ${f4(hint)} cm`} />

        <Ecuacion titulo="Area hueco interior"
          general="A_int  =  b_int  x  h_int"
          sustitucion={`A_int  =  ${f2(bint)}  x  ${f2(hint)}`}
          resultado={`A_int  =  ${f4(Aint)} cm2`} />

        <Ecuacion titulo="Area neta del cajon"
          general="A  =  A_ext  -  A_int"
          sustitucion={`A  =  ${f4(Aext)}  -  ${f4(Aint)}`}
          resultado={`A  =  ${f4(A)} cm2`} />

        <Ecuacion titulo="Centroide exterior y_c,ext"
          general="y_c,ext  =  h/2  +  y0"
          sustitucion={`y_c,ext  =  ${f2(p.h)}/2  +  ${f2(el.y0)}`}
          resultado={`y_c,ext  =  ${f4(yc_ext)} cm`} />

        <Ecuacion titulo="Centroide hueco y_c,int"
          general="y_c,int  =  t_inf  +  h_int/2  +  y0"
          sustitucion={`y_c,int  =  ${f2(tI)}  +  ${f2(hint)}/2  +  ${f2(el.y0)}`}
          resultado={`y_c,int  =  ${f4(yc_int)} cm`} />

        <Ecuacion titulo="Inercia exterior Icx,ext"
          general="Icx,ext  =  b_inf  x  h^3  /  12"
          sustitucion={`Icx,ext  =  ${f2(bI)}  x  ${f2(p.h)}^3  /  12`}
          resultado={`Icx,ext  =  ${f4(Icx_ext)} cm4`} />

        <Ecuacion titulo="Inercia hueco Icx,int"
          general="Icx,int  =  b_int  x  h_int^3  /  12"
          sustitucion={`Icx,int  =  ${f2(bint)}  x  ${f2(hint)}^3  /  12`}
          resultado={`Icx,int  =  ${f4(Icx_int)} cm4`} />

        <Ecuacion titulo="Inercia neta Icx (Steiner incluido en calculo global)"
          general="Icx  =  Icx,ext  -  Icx,int  (aprox. si centroide coindice)"
          sustitucion={`Icx  aprox  =  ${f4(Icx_ext)}  -  ${f4(Icx_int)}`}
          resultado={`Icx  aprox  =  ${f4(Icx_ext - Icx_int)} cm4`}
          nota="Valor exacto calculado con Steiner en seccion compuesta global" />
      </View>
    )
  }

  if (el.plantilla === "coordenadas") {
    const pts = el.coordPts || []
    return (
      <View>
        <Text style={styles.subTitle}>{el.label} — Seccion por Coordenadas {signoStr}</Text>
        <Ecuacion
          titulo="Area por formula de Gauss (Shoelace)"
          general="A  =  |Sum_i( x_i * y_(i+1)  -  x_(i+1) * y_i )| / 2"
          sustitucion={`Numero de vertices: n = ${pts.length}`}
          resultado="Calculado numericamente (ver tabla de vertices)"
        />
        <Ecuacion
          titulo="Centroide por formula de Gauss"
          general="x_c  =  Sum_i[ (x_i + x_(i+1)) * (x_i*y_(i+1) - x_(i+1)*y_i) ] / (6A)"
          sustitucion="y_c  =  Sum_i[ (y_i + y_(i+1)) * (x_i*y_(i+1) - x_(i+1)*y_i) ] / (6A)"
          resultado="Calculado numericamente"
        />
        <Ecuacion
          titulo="Inercia por formula de Gauss"
          general="Ix  =  Sum_i[ (y_i^2 + y_i*y_(i+1) + y_(i+1)^2) * (x_i*y_(i+1) - x_(i+1)*y_i) ] / 12"
          resultado="Calculado numericamente"
          nota="Sentido horario = area positiva. Sentido antihorario = area negativa (hueco)"
        />
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { flex: 0.5 }]}>P</Text>
            <Text style={styles.tableHeadCell}>x (cm)</Text>
            <Text style={styles.tableHeadCell}>y (cm)</Text>
          </View>
          {pts.map((pt, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 0.5 }]}>{i + 1}</Text>
              <Text style={styles.tableCellB}>{f4(pt.x)}</Text>
              <Text style={styles.tableCellB}>{f4(pt.y)}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return <View><Text style={styles.eqNota}>{el.label} — tipo no reconocido</Text></View>
}

// ── Encabezado y pie de pagina ─────────────────────────────────────────────
function Header() {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerLogo}>NodoCalc</Text>
        <Text style={styles.headerSub}>Plataforma de calculo para ingenieria civil</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>Propiedades Geometricas de Seccion</Text>
        <Text style={styles.headerDate}>{fecha()}</Text>
      </View>
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Desarrollado por Julian Leon y Miguel Cardenas — NodoCalc</Text>
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `Pagina ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

// ── Documento PDF principal ────────────────────────────────────────────────
export function PDFSeccion({ elementos, resultado, datosUsuario, imagenCanvas }: {
  elementos: Elemento[]
  resultado: ResultadoSeccion
  datosUsuario: DatosUsuario
  imagenCanvas?: string
}) {
  return (
    <Document>

      {/* PORTADA */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverLogo}>NodoCalc</Text>
          <Text style={styles.coverLogoSub}>Plataforma de calculo para ingenieria civil</Text>
          <View style={styles.coverLine} />
          <Text style={styles.coverTitle}>MEMORIA DE CALCULO</Text>
          <Text style={styles.coverSubtitle}>Propiedades Geometricas de Seccion Transversal</Text>
          <View style={{ height: 20 }} />
          <View style={styles.coverBox}>
            {[
              { l: "Proyecto:", v: datosUsuario.proyecto || "—" },
              { l: "Descripcion:", v: datosUsuario.descripcion || "—" },
              { l: "Ingeniero:", v: datosUsuario.ingeniero || "—" },
              { l: "Empresa:", v: datosUsuario.empresa || "—" },
              { l: "Fecha:", v: fecha() },
              { l: "N. de elementos:", v: `${elementos.length}` },
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

      {/* SECCION 1 — DESCRIPCION */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>1.  DESCRIPCION DE LA SECCION</Text>

        {imagenCanvas && (
          <View>
            <Text style={styles.subTitle}>1.1  Vista de la seccion en el plano cartesiano</Text>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <View style={styles.canvasImg}>
              <Text> </Text>
            </View>
          </View>
        )}

        <Text style={styles.subTitle}>1.2  Elementos que componen la seccion</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { flex: 0.4 }]}>#</Text>
            <Text style={styles.tableHeadCell}>Elemento</Text>
            <Text style={styles.tableHeadCell}>Tipo</Text>
            <Text style={styles.tableHeadCell}>Operacion</Text>
            <Text style={styles.tableHeadCell}>Posicion (cm)</Text>
          </View>
          {elementos.map((el, i) => (
            <View key={el.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 0.4 }]}>{i + 1}</Text>
              <Text style={styles.tableCellB}>{el.label}</Text>
              <Text style={styles.tableCell}>{el.plantilla}</Text>
              <Text style={[styles.tableCell, { color: el.signo > 0 ? "#1d4ed8" : "#dc2626" }]}>{el.signo > 0 ? "+ Suma" : "- Resta"}</Text>
              <Text style={styles.tableCell}>({el.x0}, {el.y0})</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subTitle}>1.3  Dimensiones por elemento</Text>
        {elementos.map((el, idx) => (
          <View key={el.id} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 9, fontFamily: "Times-Bold", color: "#334155", marginBottom: 4 }}>
              {el.label}  —  {el.plantilla}
            </Text>
            {el.plantilla === "coordenadas" ? (
              <Text style={styles.eqNota}>Ver tabla de coordenadas en seccion de desarrollo</Text>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={styles.tableHeadCell}>Parametro</Text>
                  <Text style={styles.tableHeadCell}>Valor (cm)</Text>
                </View>
                {Object.entries(el.params).map(([k, v], i) => (
                  <View key={k} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={styles.tableCell}>{k}</Text>
                    <Text style={styles.tableCellB}>{f2(v)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <Footer />
      </Page>

      {/* SECCION 2 — PASO A PASO POR ELEMENTO */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>2.  DESARROLLO DEL CALCULO POR ELEMENTO</Text>
        <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 12, fontFamily: "Times-Italic" }}>
          Se calcula el area, centroide e inercia propia de cada elemento respecto a su propio centroide.
          Posteriormente se aplica el Teorema de Steiner para trasladar al centroide global de la seccion compuesta.
        </Text>
        {elementos.map(el => (
          <View key={el.id}>
            <PasoAPasoElemento el={el} />
            <View style={styles.sep} />
          </View>
        ))}
        <Footer />
      </Page>

      {/* SECCION 3 — CENTROIDE GLOBAL */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>3.  CENTROIDE DE LA SECCION COMPUESTA</Text>
        <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 10, fontFamily: "Times-Italic" }}>
          El centroide global se obtiene ponderando el area de cada elemento por la posicion de su centroide.
          Los elementos con operacion (-) se restan (huecos).
        </Text>

        <Ecuacion
          titulo="3.1  Area total de la seccion"
          general="A  =  Sum_i( signo_i  x  A_i )     donde signo = +1 para area, -1 para hueco"
          resultado={`A  =  ${f4(resultado.A)} cm2`}
        />

        <Ecuacion
          titulo="3.2  Centroide en x"
          general="x_c  =  Sum_i( signo_i  x  A_i  x  x_c,i ) / A"
          resultado={`x_c  =  ${f4(resultado.xc)} cm`}
        />

        <Ecuacion
          titulo="3.3  Centroide en y"
          general="y_c  =  Sum_i( signo_i  x  A_i  x  y_c,i ) / A"
          resultado={`y_c  =  ${f4(resultado.yc)} cm`}
        />

        <Text style={styles.secTitle}>4.  INERCIAS CENTROIDALES DE LA SECCION COMPUESTA</Text>
        <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 10, fontFamily: "Times-Italic" }}>
          Se aplica el Teorema de Steiner (traslado de ejes paralelos).
          La inercia centroidal propia de cada elemento se obtiene como Ic,propio = I_origen - A*y_c^2,
          y luego se traslada al centroide global con el termino de Steiner A*(y_c,i - y_c,global)^2.
        </Text>

        <Ecuacion
          titulo="4.1  Inercia centroidal en x — Teorema de Steiner"
          general="Icx  =  Sum_i[ signo_i x ( Icx,propio,i  +  A_i x (y_c,i - y_c)^2 ) ]"
          sustitucion="donde:  Icx,propio,i  =  Ix,origen,i  -  A_i x y_c,i^2"
          resultado={`Icx  =  ${f4(resultado.Icx)} cm4`}
        />

        <Ecuacion
          titulo="4.2  Inercia centroidal en y"
          general="Icy  =  Sum_i[ signo_i x ( Icy,propio,i  +  A_i x (x_c,i - x_c)^2 ) ]"
          resultado={`Icy  =  ${f4(resultado.Icy)} cm4`}
        />

        <Ecuacion
          titulo="4.3  Inercia producto centroidal"
          general="Ixy  =  Sum_i[ signo_i x ( Ixy,propio,i  +  A_i x (x_c,i - x_c) x (y_c,i - y_c) ) ]"
          resultado={`Ixy  =  ${f4(resultado.Ixy)} cm4`}
        />

        <Ecuacion
          titulo="4.4  Momento polar de inercia"
          general="J  =  Icx  +  Icy"
          sustitucion={`J  =  ${f4(resultado.Icx)}  +  ${f4(resultado.Icy)}`}
          resultado={`J  =  ${f4(resultado.J)} cm4`}
        />

        <Footer />
      </Page>

      {/* SECCION 4 — MODULOS Y RADIOS */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>5.  MODULOS RESISTENTES Y RADIOS DE GIRO</Text>

        <Ecuacion
          titulo="5.1  Modulo resistente elastico superior"
          general="Sx(+)  =  Icx / (y_max  -  y_c)"
          sustitucion={`Sx(+)  =  ${f4(resultado.Icx)} / (y_max  -  ${f4(resultado.yc)})`}
          resultado={`Sx(+)  =  ${f4(resultado.Sx_top)} cm3`}
          nota="y_max = coordenada y del punto mas alejado superiormente del centroide"
        />

        <Ecuacion
          titulo="5.2  Modulo resistente elastico inferior"
          general="Sx(-)  =  Icx / (y_c  -  y_min)"
          sustitucion={`Sx(-)  =  ${f4(resultado.Icx)} / (${f4(resultado.yc)}  -  y_min)`}
          resultado={`Sx(-)  =  ${f4(resultado.Sx_bot)} cm3`}
        />

        <Ecuacion
          titulo="5.3  Modulo resistente en y"
          general="Sy  =  Icy / x_max"
          sustitucion={`Sy  =  ${f4(resultado.Icy)} / x_max`}
          resultado={`Sy  =  ${f4(resultado.Sy)} cm3`}
        />

        <Ecuacion
          titulo="5.4  Radio de giro en x"
          general="rx  =  sqrt( Icx / A )"
          sustitucion={`rx  =  sqrt( ${f4(resultado.Icx)} / ${f4(resultado.A)} )`}
          intermedio={`rx  =  sqrt( ${f4(resultado.Icx / resultado.A)} )`}
          resultado={`rx  =  ${f4(resultado.rx)} cm`}
        />

        <Ecuacion
          titulo="5.5  Radio de giro en y"
          general="ry  =  sqrt( Icy / A )"
          sustitucion={`ry  =  sqrt( ${f4(resultado.Icy)} / ${f4(resultado.A)} )`}
          intermedio={`ry  =  sqrt( ${f4(resultado.Icy / resultado.A)} )`}
          resultado={`ry  =  ${f4(resultado.ry)} cm`}
        />

        <Text style={styles.secTitle}>6.  EJES PRINCIPALES DE INERCIA</Text>

        <Ecuacion
          titulo="6.1  Radio del circulo de Mohr"
          general="R  =  sqrt( ((Icx - Icy)/2)^2  +  Ixy^2 )"
          sustitucion={`R  =  sqrt( ((${f4(resultado.Icx)} - ${f4(resultado.Icy)})/2)^2  +  ${f4(resultado.Ixy)}^2 )`}
          resultado={`R  =  ${f4(Math.sqrt(Math.pow((resultado.Icx - resultado.Icy) / 2, 2) + Math.pow(resultado.Ixy, 2)))} cm4`}
        />

        <Ecuacion
          titulo="6.2  Inercia principal maxima"
          general="I1  =  (Icx + Icy)/2  +  R"
          sustitucion={`I1  =  (${f4(resultado.Icx)} + ${f4(resultado.Icy)})/2  +  R`}
          resultado={`I1  =  ${f4(resultado.I1)} cm4`}
        />

        <Ecuacion
          titulo="6.3  Inercia principal minima"
          general="I2  =  (Icx + Icy)/2  -  R"
          sustitucion={`I2  =  (${f4(resultado.Icx)} + ${f4(resultado.Icy)})/2  -  R`}
          resultado={`I2  =  ${f4(resultado.I2)} cm4`}
        />

        <Ecuacion
          titulo="6.4  Angulo de los ejes principales"
          general="theta_p  =  (1/2) x arctan( -2*Ixy / (Icx - Icy) )"
          sustitucion={`theta_p  =  (1/2) x arctan( -2 x ${f4(resultado.Ixy)} / (${f4(resultado.Icx)} - ${f4(resultado.Icy)}) )`}
          resultado={`theta_p  =  ${resultado.theta_p.toFixed(2)} grados`}
        />

        <Text style={styles.secTitle}>7.  RESUMEN DE RESULTADOS</Text>
        <View style={styles.resGrid}>
          {[
            { l: "Area total  A", v: f4(resultado.A), u: "cm2" },
            { l: "Centroide  x_c", v: f4(resultado.xc), u: "cm" },
            { l: "Centroide  y_c", v: f4(resultado.yc), u: "cm" },
            { l: "Inercia  Icx", v: f4(resultado.Icx), u: "cm4" },
            { l: "Inercia  Icy", v: f4(resultado.Icy), u: "cm4" },
            { l: "Inercia producto  Ixy", v: f4(resultado.Ixy), u: "cm4" },
            { l: "Modulo  Sx(+)", v: f4(resultado.Sx_top), u: "cm3" },
            { l: "Modulo  Sx(-)", v: f4(resultado.Sx_bot), u: "cm3" },
            { l: "Modulo  Sy", v: f4(resultado.Sy), u: "cm3" },
            { l: "Radio giro  rx", v: f4(resultado.rx), u: "cm" },
            { l: "Radio giro  ry", v: f4(resultado.ry), u: "cm" },
            { l: "Momento polar  J", v: f4(resultado.J), u: "cm4" },
            { l: "Inercia principal  I1", v: f4(resultado.I1), u: "cm4" },
            { l: "Inercia principal  I2", v: f4(resultado.I2), u: "cm4" },
            { l: "Angulo ejes  theta_p", v: resultado.theta_p.toFixed(2), u: "grados" },
          ].map(({ l, v, u }) => (
            <View key={l} style={styles.resCard}>
              <Text style={styles.resLabel}>{l}</Text>
              <Text style={styles.resValue}>{v}</Text>
              <Text style={styles.resUnit}>{u}</Text>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            NOTA: Esta memoria de calculo ha sido generada automaticamente por NodoCalc.
            Los resultados deben ser verificados por un ingeniero civil competente antes de su uso en diseno estructural.
            NodoCalc y sus desarrolladores no se responsabilizan por el uso incorrecto de estos resultados.
            El usuario es responsable de verificar la validez de los datos de entrada y la aplicabilidad
            de los resultados a su proyecto especifico.
          </Text>
        </View>

        <Footer />
      </Page>

    </Document>
  )
}