import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer"

// ── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1e293b", paddingTop: 40, paddingBottom: 50, paddingHorizontal: 45 },
  
  // Encabezado
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#1d4ed8", paddingBottom: 10, marginBottom: 16 },
  logoBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  logoSub: { fontSize: 7, color: "#64748b", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  headerDate: { fontSize: 7, color: "#64748b", marginTop: 2 },

  // Portada
  coverPage: { flex: 1, justifyContent: "center", alignItems: "center", padding: 60 },
  coverLogo: { fontSize: 36, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 6 },
  coverLogoSub: { fontSize: 11, color: "#64748b", marginBottom: 48 },
  coverTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1e293b", textAlign: "center", marginBottom: 8 },
  coverSubtitle: { fontSize: 11, color: "#64748b", textAlign: "center", marginBottom: 48 },
  coverDivider: { width: 80, height: 2, backgroundColor: "#1d4ed8", marginBottom: 48 },
  coverInfoBox: { width: "100%", backgroundColor: "#f8fafc", borderRadius: 6, padding: 24, borderWidth: 1, borderColor: "#e2e8f0" },
  coverInfoRow: { flexDirection: "row", marginBottom: 10 },
  coverInfoLabel: { fontSize: 8, color: "#64748b", width: 100, fontFamily: "Helvetica-Bold" },
  coverInfoValue: { fontSize: 9, color: "#1e293b", flex: 1 },
  coverFooter: { position: "absolute", bottom: 40, alignItems: "center" },
  coverFooterText: { fontSize: 8, color: "#94a3b8" },

  // Secciones
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 8, marginTop: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  subsectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#334155", marginBottom: 6, marginTop: 10 },

  // Tablas
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1d4ed8", borderRadius: 3, padding: 5, marginBottom: 2 },
  tableHeaderCell: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 8, flex: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", padding: 4, alignItems: "center" },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", padding: 4, backgroundColor: "#f8fafc", alignItems: "center" },
  tableCell: { fontSize: 8, flex: 1, color: "#334155" },
  tableCellBold: { fontSize: 8, flex: 1, color: "#1e293b", fontFamily: "Helvetica-Bold" },

  // Paso a paso
  stepBox: { backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: "#1d4ed8" },
  stepTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 6 },
  stepFormula: { fontSize: 8.5, color: "#334155", marginBottom: 3, fontFamily: "Helvetica" },
  stepResult: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1e293b", backgroundColor: "#dbeafe", padding: 4, borderRadius: 3, marginTop: 4 },
  stepNote: { fontSize: 7.5, color: "#64748b", marginTop: 3, fontStyle: "italic" },

  // Resultados
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  resultCard: { width: "48%", backgroundColor: "#eff6ff", borderRadius: 4, padding: 8, borderWidth: 1, borderColor: "#bfdbfe" },
  resultLabel: { fontSize: 7, color: "#3b82f6", fontFamily: "Helvetica-Bold", marginBottom: 2 },
  resultValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  resultUnit: { fontSize: 7, color: "#64748b" },

  // Imagen sección
  sectionImage: { width: "100%", height: 200, objectFit: "contain", borderRadius: 4, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 10 },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 45, right: 45, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6 },
  footerText: { fontSize: 7, color: "#94a3b8" },
  footerPage: { fontSize: 7, color: "#94a3b8" },

  // Disclaimer
  disclaimer: { backgroundColor: "#fefce8", borderRadius: 4, padding: 8, borderWidth: 1, borderColor: "#fde68a", marginTop: 14 },
  disclaimerText: { fontSize: 7, color: "#92400e" },
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
  ingeniero: string
  empresa: string
  proyecto: string
  descripcion: string
  fecha: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

function fmt2(n: number) { return fmt(n, 2) }
function fmt4(n: number) { return fmt(n, 4) }

// ── Paso a paso por plantilla ──────────────────────────────────────────────
function getPasoAPaso(el: Elemento): { titulo: string; pasos: { formula: string; resultado: string; nota?: string }[] } {
  const p = el.params
  const signoStr = el.signo > 0 ? "+" : "−"

  switch (el.plantilla) {
    case "rectangular": {
      const A = p.b * p.h
      const Cx = p.b / 2
      const Cy = p.h / 2
      const Icx = p.b * Math.pow(p.h, 3) / 12
      const Icy = p.h * Math.pow(p.b, 3) / 12
      return {
        titulo: `${el.label} — Sección Rectangular (${signoStr})`,
        pasos: [
          { formula: `Área:  A = b × h = ${p.b} × ${p.h}`, resultado: `A = ${fmt2(A)} cm²` },
          { formula: `Centroide x:  x̄ = b/2 = ${p.b}/2`, resultado: `x̄ = ${fmt2(Cx + el.x0)} cm  (con desfase x₀=${el.x0})` },
          { formula: `Centroide y:  ȳ = h/2 = ${p.h}/2`, resultado: `ȳ = ${fmt2(Cy + el.y0)} cm  (con desfase y₀=${el.y0})` },
          { formula: `Inercia centroidal x:  Icx = b·h³/12 = ${p.b}×${p.h}³/12`, resultado: `Icx = ${fmt4(Icx)} cm⁴` },
          { formula: `Inercia centroidal y:  Icy = h·b³/12 = ${p.h}×${p.b}³/12`, resultado: `Icy = ${fmt4(Icy)} cm⁴` },
        ]
      }
    }
    case "circular": {
      const A = Math.PI * p.r * p.r
      const Cx = p.r + el.x0
      const Cy = p.r + el.y0
      const Ic = Math.PI * Math.pow(p.r, 4) / 4
      return {
        titulo: `${el.label} — Sección Circular (${signoStr})`,
        pasos: [
          { formula: `Área:  A = π·r² = π×${p.r}²`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Centro del círculo:  (r + x₀, r + y₀) = (${p.r}+${el.x0}, ${p.r}+${el.y0})`, resultado: `C = (${fmt2(Cx)}, ${fmt2(Cy)}) cm` },
          { formula: `Inercia centroidal:  Ic = π·r⁴/4 = π×${p.r}⁴/4`, resultado: `Icx = Icy = ${fmt4(Ic)} cm⁴` },
          { formula: `Inercia producto:  Ixy = 0`, resultado: `Ixy = 0 cm⁴`, nota: "Por simetría axial" },
        ]
      }
    }
    case "tubo": {
      const ri = p.r - p.t
      const A = Math.PI * (p.r * p.r - ri * ri)
      const Cx = p.r + el.x0
      const Cy = p.r + el.y0
      const Ic = Math.PI * (Math.pow(p.r, 4) - Math.pow(ri, 4)) / 4
      return {
        titulo: `${el.label} — Tubo Circular (${signoStr})`,
        pasos: [
          { formula: `Radio interior:  rᵢ = r − t = ${p.r} − ${p.t}`, resultado: `rᵢ = ${fmt2(ri)} cm` },
          { formula: `Área:  A = π·(r² − rᵢ²) = π×(${p.r}² − ${fmt2(ri)}²)`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Centro:  (r + x₀, r + y₀) = (${p.r}+${el.x0}, ${p.r}+${el.y0})`, resultado: `C = (${fmt2(Cx)}, ${fmt2(Cy)}) cm` },
          { formula: `Inercia centroidal:  Ic = π·(r⁴ − rᵢ⁴)/4 = π×(${p.r}⁴ − ${fmt2(ri)}⁴)/4`, resultado: `Icx = Icy = ${fmt4(Ic)} cm⁴` },
        ]
      }
    }
    case "I": {
      const A1 = p.bf_inf * p.tf_inf
      const A2 = p.tw * p.hw
      const A3 = p.bf_sup * p.tf_sup
      const y1 = p.tf_inf / 2 + el.y0
      const y2 = p.tf_inf + p.hw / 2 + el.y0
      const y3 = p.tf_inf + p.hw + p.tf_sup / 2 + el.y0
      const A = A1 + A2 + A3
      const yc = (A1 * y1 + A2 * y2 + A3 * y3) / A
      const Ic1 = p.bf_inf * Math.pow(p.tf_inf, 3) / 12 + A1 * Math.pow(y1 - yc, 2)
      const Ic2 = p.tw * Math.pow(p.hw, 3) / 12 + A2 * Math.pow(y2 - yc, 2)
      const Ic3 = p.bf_sup * Math.pow(p.tf_sup, 3) / 12 + A3 * Math.pow(y3 - yc, 2)
      return {
        titulo: `${el.label} — Perfil I Asimétrico (${signoStr})`,
        pasos: [
          { formula: `Ala inferior:  A₁ = bf,inf × tf,inf = ${p.bf_inf} × ${p.tf_inf}`, resultado: `A₁ = ${fmt2(A1)} cm²,  ȳ₁ = ${fmt2(y1)} cm` },
          { formula: `Alma:  A₂ = tw × hw = ${p.tw} × ${p.hw}`, resultado: `A₂ = ${fmt2(A2)} cm²,  ȳ₂ = ${fmt2(y2)} cm` },
          { formula: `Ala superior:  A₃ = bf,sup × tf,sup = ${p.bf_sup} × ${p.tf_sup}`, resultado: `A₃ = ${fmt2(A3)} cm²,  ȳ₃ = ${fmt2(y3)} cm` },
          { formula: `Área total:  A = A₁ + A₂ + A₃ = ${fmt2(A1)} + ${fmt2(A2)} + ${fmt2(A3)}`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Centroide y:  ȳ = (A₁ȳ₁ + A₂ȳ₂ + A₃ȳ₃) / A`, resultado: `ȳ = ${fmt4(yc)} cm` },
          { formula: `Inercia Steiner ala inf:  Ic₁ = bf,inf·tf,inf³/12 + A₁·(ȳ₁−ȳ)²`, resultado: `Ic₁ = ${fmt4(Ic1)} cm⁴` },
          { formula: `Inercia Steiner alma:  Ic₂ = tw·hw³/12 + A₂·(ȳ₂−ȳ)²`, resultado: `Ic₂ = ${fmt4(Ic2)} cm⁴` },
          { formula: `Inercia Steiner ala sup:  Ic₃ = bf,sup·tf,sup³/12 + A₃·(ȳ₃−ȳ)²`, resultado: `Ic₃ = ${fmt4(Ic3)} cm⁴` },
          { formula: `Inercia total:  Icx = Ic₁ + Ic₂ + Ic₃`, resultado: `Icx = ${fmt4(Ic1 + Ic2 + Ic3)} cm⁴` },
        ]
      }
    }
    case "T": {
      const A1 = p.tw * p.hw
      const A2 = p.bf * p.tf
      const y1 = p.hw / 2 + el.y0
      const y2 = p.hw + p.tf / 2 + el.y0
      const A = A1 + A2
      const yc = (A1 * y1 + A2 * y2) / A
      const Ic1 = p.tw * Math.pow(p.hw, 3) / 12 + A1 * Math.pow(y1 - yc, 2)
      const Ic2 = p.bf * Math.pow(p.tf, 3) / 12 + A2 * Math.pow(y2 - yc, 2)
      return {
        titulo: `${el.label} — Perfil T (${signoStr})`,
        pasos: [
          { formula: `Alma:  A₁ = tw × hw = ${p.tw} × ${p.hw}`, resultado: `A₁ = ${fmt2(A1)} cm²,  ȳ₁ = ${fmt2(y1)} cm` },
          { formula: `Ala:  A₂ = bf × tf = ${p.bf} × ${p.tf}`, resultado: `A₂ = ${fmt2(A2)} cm²,  ȳ₂ = ${fmt2(y2)} cm` },
          { formula: `Área total:  A = A₁ + A₂`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Centroide y:  ȳ = (A₁ȳ₁ + A₂ȳ₂) / A`, resultado: `ȳ = ${fmt4(yc)} cm` },
          { formula: `Inercia Steiner alma:  Ic₁ = tw·hw³/12 + A₁·(ȳ₁−ȳ)²`, resultado: `Ic₁ = ${fmt4(Ic1)} cm⁴` },
          { formula: `Inercia Steiner ala:  Ic₂ = bf·tf³/12 + A₂·(ȳ₂−ȳ)²`, resultado: `Ic₂ = ${fmt4(Ic2)} cm⁴` },
          { formula: `Inercia total:  Icx = Ic₁ + Ic₂`, resultado: `Icx = ${fmt4(Ic1 + Ic2)} cm⁴` },
        ]
      }
    }
    case "L": {
      const A = p.b * p.h - (p.b - p.t) * (p.h - p.t)
      return {
        titulo: `${el.label} — Ángulo L (${signoStr})`,
        pasos: [
          { formula: `Área rectángulo total:  A_tot = b × h = ${p.b} × ${p.h}`, resultado: `A_tot = ${fmt2(p.b * p.h)} cm²` },
          { formula: `Área hueco:  A_hue = (b−t) × (h−t) = ${p.b - p.t} × ${p.h - p.t}`, resultado: `A_hue = ${fmt2((p.b - p.t) * (p.h - p.t))} cm²` },
          { formula: `Área total:  A = A_tot − A_hue`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Nota: centroide e inercias calculados por fórmula de Gauss (polígono)`, resultado: `Ver tabla de resultados`, nota: "Sección L no simétrica — el centroide no está en el centro geométrico" },
        ]
      }
    }
    case "C": {
      const A1 = p.bf_inf * p.tf_inf
      const A2 = p.tw * p.hw
      const A3 = p.bf_sup * p.tf_sup
      const A = A1 + A2 + A3
      return {
        titulo: `${el.label} — Canal C Asimétrico (${signoStr})`,
        pasos: [
          { formula: `Ala inferior:  A₁ = bf,inf × tf,inf = ${p.bf_inf} × ${p.tf_inf}`, resultado: `A₁ = ${fmt2(A1)} cm²` },
          { formula: `Alma:  A₂ = tw × hw = ${p.tw} × ${p.hw}`, resultado: `A₂ = ${fmt2(A2)} cm²` },
          { formula: `Ala superior:  A₃ = bf,sup × tf,sup = ${p.bf_sup} × ${p.tf_sup}`, resultado: `A₃ = ${fmt2(A3)} cm²` },
          { formula: `Área total:  A = A₁ + A₂ + A₃`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Centroide e inercias por descomposición rectangular con Steiner`, resultado: `Ver tabla de resultados` },
        ]
      }
    }
    case "cajon": {
      const bS = p.b_sup || p.b, bI = p.b_inf || p.b
      const tS = p.t_sup || p.t, tI = p.t_inf || p.t, tL = p.t_izq || p.t, tR = p.t_der || p.t
      const Aext = bI * p.h
      const Aint = (bI - tL - tR) * (p.h - tS - tI)
      const A = Aext - Aint
      return {
        titulo: `${el.label} — Cajón Paramétrico (${signoStr})`,
        pasos: [
          { formula: `Área exterior:  A_ext ≈ b_inf × h = ${bI} × ${p.h}`, resultado: `A_ext = ${fmt2(Aext)} cm²` },
          { formula: `Área interior (hueco):  A_int = (b_inf−t_izq−t_der) × (h−t_sup−t_inf)`, resultado: `A_int = ${fmt2(Aint)} cm²` },
          { formula: `Área neta:  A = A_ext − A_int`, resultado: `A = ${fmt4(A)} cm²` },
          { formula: `Inercias por Gauss (polígono exterior − polígono interior)`, resultado: `Ver tabla de resultados` },
        ]
      }
    }
    case "coordenadas": {
      const pts = el.coordPts || []
      return {
        titulo: `${el.label} — Sección por Coordenadas (${signoStr})`,
        pasos: [
          { formula: `Número de vértices: n = ${pts.length}`, resultado: `Polígono cerrado` },
          { formula: `Área (fórmula de Gauss):  A = |Σᵢ(xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| / 2`, resultado: `Calculado numéricamente` },
          { formula: `Centroide:  x̄ = Σᵢ(xᵢ+xᵢ₊₁)(xᵢyᵢ₊₁−xᵢ₊₁yᵢ) / (6A)`, resultado: `Calculado numéricamente` },
          { formula: `Inercia:  Ix = Σᵢ(yᵢ²+yᵢyᵢ₊₁+yᵢ₊₁²)(xᵢyᵢ₊₁−xᵢ₊₁yᵢ) / 12`, resultado: `Calculado numéricamente` },
          { formula: `Coordenadas ingresadas:  ${pts.slice(0, 4).map(p => `(${p.x},${p.y})`).join(", ")}${pts.length > 4 ? ` ... +${pts.length - 4} más` : ""}`, resultado: `Sentido horario = área positiva` },
        ]
      }
    }
    default:
      return { titulo: el.label, pasos: [] }
  }
}

// ── Componentes PDF ────────────────────────────────────────────────────────
function HeaderPDF({ pagina }: { pagina: string }) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>NodoCalc</Text>
        <View>
          <Text style={styles.logoSub}>Plataforma de cálculo para ingeniería civil</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>{pagina}</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</Text>
      </View>
    </View>
  )
}

function FooterPDF() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Desarrollado por Julián León & Miguel Cárdenas — NodoCalc © {new Date().getFullYear()}</Text>
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

// ── Documento principal ────────────────────────────────────────────────────
export function PDFSeccion({
  elementos,
  resultado,
  datosUsuario,
  imagenCanvas,
}: {
  elementos: Elemento[]
  resultado: ResultadoSeccion
  datosUsuario: DatosUsuario
  imagenCanvas?: string
}) {
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })

  return (
    <Document>
      {/* ── PORTADA ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverLogo}>NodoCalc</Text>
          <Text style={styles.coverLogoSub}>Plataforma de cálculo para ingeniería civil</Text>
          <View style={styles.coverDivider} />
          <Text style={styles.coverTitle}>MEMORIA DE CÁLCULO</Text>
          <Text style={styles.coverSubtitle}>Propiedades Geométricas de Sección Transversal</Text>
          <View style={{ height: 24 }} />
          <View style={styles.coverInfoBox}>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Proyecto:</Text>
              <Text style={styles.coverInfoValue}>{datosUsuario.proyecto || "—"}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Descripción:</Text>
              <Text style={styles.coverInfoValue}>{datosUsuario.descripcion || "—"}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Ingeniero:</Text>
              <Text style={styles.coverInfoValue}>{datosUsuario.ingeniero || "—"}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Empresa:</Text>
              <Text style={styles.coverInfoValue}>{datosUsuario.empresa || "—"}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Fecha:</Text>
              <Text style={styles.coverInfoValue}>{fecha}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>N° de elementos:</Text>
              <Text style={styles.coverInfoValue}>{elementos.length} elemento{elementos.length !== 1 ? "s" : ""}</Text>
            </View>
          </View>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>Desarrollado por Julián León & Miguel Cárdenas — NodoCalc © {new Date().getFullYear()}</Text>
        </View>
      </Page>

      {/* ── SECCIÓN 1: DESCRIPCIÓN ── */}
      <Page size="A4" style={styles.page}>
        <HeaderPDF pagina="Propiedades Geométricas de Sección" />

        <Text style={styles.sectionTitle}>1. DESCRIPCIÓN DE LA SECCIÓN</Text>

        {imagenCanvas && (
          <View>
            <Text style={styles.subsectionTitle}>1.1 Vista de la sección en el plano cartesiano</Text>
            <Image src={imagenCanvas} style={styles.sectionImage} />
          </View>
        )}

        <Text style={styles.subsectionTitle}>1.2 Elementos que componen la sección</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>#</Text>
            <Text style={styles.tableHeaderCell}>Elemento</Text>
            <Text style={styles.tableHeaderCell}>Tipo</Text>
            <Text style={styles.tableHeaderCell}>Operación</Text>
            <Text style={styles.tableHeaderCell}>Posición</Text>
          </View>
          {elementos.map((el, idx) => (
            <View key={el.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { flex: 0.5 }]}>{idx + 1}</Text>
              <Text style={styles.tableCellBold}>{el.label}</Text>
              <Text style={styles.tableCell}>{el.plantilla}</Text>
              <Text style={[styles.tableCell, { color: el.signo > 0 ? "#1d4ed8" : "#dc2626" }]}>{el.signo > 0 ? "+ Suma" : "− Resta"}</Text>
              <Text style={styles.tableCell}>({el.x0}, {el.y0}) cm</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subsectionTitle}>1.3 Dimensiones por elemento</Text>
        {elementos.map((el, idx) => (
          <View key={el.id} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#334155", marginBottom: 4 }}>{el.label} — {el.plantilla}</Text>
            {el.plantilla === "coordenadas" ? (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Vértice</Text>
                  <Text style={styles.tableHeaderCell}>x (cm)</Text>
                  <Text style={styles.tableHeaderCell}>y (cm)</Text>
                </View>
                {(el.coordPts || []).map((pt, i) => (
                  <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={styles.tableCell}>P{i + 1}</Text>
                    <Text style={styles.tableCell}>{pt.x}</Text>
                    <Text style={styles.tableCell}>{pt.y}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Parámetro</Text>
                  <Text style={styles.tableHeaderCell}>Valor (cm)</Text>
                </View>
                {Object.entries(el.params).map(([key, val], i) => (
                  <View key={key} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={styles.tableCell}>{key}</Text>
                    <Text style={styles.tableCellBold}>{fmt2(val)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <FooterPDF />
      </Page>

      {/* ── SECCIÓN 2: PASO A PASO ── */}
      <Page size="A4" style={styles.page}>
        <HeaderPDF pagina="Propiedades Geométricas de Sección" />
        <Text style={styles.sectionTitle}>2. DESARROLLO DEL CÁLCULO</Text>
        <Text style={{ fontSize: 8, color: "#64748b", marginBottom: 10 }}>
          Se aplica el Teorema de Steiner (traslado de ejes paralelos) para obtener las inercias centroidales de la sección compuesta.
          La fórmula general es: Icx = Σ(Icxᵢ + Aᵢ·dᵢ²) donde dᵢ = ȳᵢ − ȳ es la distancia del centroide de cada elemento al centroide global.
        </Text>

        {elementos.map((el) => {
          const paso = getPasoAPaso(el)
          return (
            <View key={el.id} style={styles.stepBox}>
              <Text style={styles.stepTitle}>{paso.titulo}</Text>
              {paso.pasos.map((p, i) => (
                <View key={i} style={{ marginBottom: 4 }}>
                  <Text style={styles.stepFormula}>{p.formula}</Text>
                  <Text style={styles.stepResult}>→  {p.resultado}</Text>
                  {p.nota && <Text style={styles.stepNote}>* {p.nota}</Text>}
                </View>
              ))}
            </View>
          )
        })}

        <FooterPDF />
      </Page>

      {/* ── SECCIÓN 3: CENTROIDE GLOBAL ── */}
      <Page size="A4" style={styles.page}>
        <HeaderPDF pagina="Propiedades Geométricas de Sección" />
        <Text style={styles.sectionTitle}>3. CENTROIDE DE LA SECCIÓN COMPUESTA</Text>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>3.1 Área total de la sección</Text>
          <Text style={styles.stepFormula}>A = Σ (signoᵢ × Aᵢ)  donde signo = +1 para área positiva, −1 para hueco</Text>
          <Text style={styles.stepResult}>A = {fmt4(resultado.A)} cm²</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>3.2 Centroide en x</Text>
          <Text style={styles.stepFormula}>x̄ = Σ (signoᵢ × Aᵢ × x̄ᵢ) / A</Text>
          <Text style={styles.stepResult}>x̄ = {fmt4(resultado.xc)} cm</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>3.3 Centroide en y</Text>
          <Text style={styles.stepFormula}>ȳ = Σ (signoᵢ × Aᵢ × ȳᵢ) / A</Text>
          <Text style={styles.stepResult}>ȳ = {fmt4(resultado.yc)} cm</Text>
        </View>

        <Text style={styles.sectionTitle}>4. INERCIAS CENTROIDALES</Text>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>4.1 Teorema de Steiner (traslado de ejes paralelos)</Text>
          <Text style={styles.stepFormula}>Para cada elemento i con centroide propio en (x̄ᵢ, ȳᵢ):</Text>
          <Text style={styles.stepFormula}>  Icx,global,i = Icx,propio,i + Aᵢ × (ȳᵢ − ȳ)²</Text>
          <Text style={styles.stepFormula}>  Icy,global,i = Icy,propio,i + Aᵢ × (x̄ᵢ − x̄)²</Text>
          <Text style={styles.stepFormula}>Donde: Icx,propio = Ix,origen − Aᵢ × ȳᵢ²  (traslado al centroide propio)</Text>
          <Text style={styles.stepResult}>Inercia centroidal x:  Icx = {fmt4(resultado.Icx)} cm⁴</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>4.2 Inercia centroidal en y</Text>
          <Text style={styles.stepFormula}>Icy = Σ (signoᵢ × (Icy,propio,i + Aᵢ × (x̄ᵢ − x̄)²))</Text>
          <Text style={styles.stepResult}>Icy = {fmt4(resultado.Icy)} cm⁴</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>4.3 Inercia producto</Text>
          <Text style={styles.stepFormula}>Ixy = Σ (signoᵢ × (Ixy,propio,i + Aᵢ × (x̄ᵢ − x̄) × (ȳᵢ − ȳ)))</Text>
          <Text style={styles.stepResult}>Ixy = {fmt4(resultado.Ixy)} cm⁴</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>4.4 Momento polar de inercia</Text>
          <Text style={styles.stepFormula}>J = Icx + Icy</Text>
          <Text style={styles.stepFormula}>J = {fmt4(resultado.Icx)} + {fmt4(resultado.Icy)}</Text>
          <Text style={styles.stepResult}>J = {fmt4(resultado.J)} cm⁴</Text>
        </View>

        <FooterPDF />
      </Page>

      {/* ── SECCIÓN 4: MÓDULOS Y RADIOS ── */}
      <Page size="A4" style={styles.page}>
        <HeaderPDF pagina="Propiedades Geométricas de Sección" />
        <Text style={styles.sectionTitle}>5. MÓDULOS RESISTENTES Y RADIOS DE GIRO</Text>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>5.1 Módulos resistentes elásticos</Text>
          <Text style={styles.stepFormula}>Módulo resistente superior:  Sx⁺ = Icx / (ymax − ȳ)</Text>
          <Text style={styles.stepResult}>Sx⁺ = {fmt4(resultado.Sx_top)} cm³</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.stepFormula}>Módulo resistente inferior:  Sx⁻ = Icx / (ȳ − ymin)</Text>
          <Text style={styles.stepResult}>Sx⁻ = {fmt4(resultado.Sx_bot)} cm³</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.stepFormula}>Módulo resistente en y:  Sy = Icy / xmax</Text>
          <Text style={styles.stepResult}>Sy = {fmt4(resultado.Sy)} cm³</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>5.2 Radios de giro</Text>
          <Text style={styles.stepFormula}>Radio de giro x:  rx = √(Icx / A) = √({fmt4(resultado.Icx)} / {fmt4(resultado.A)})</Text>
          <Text style={styles.stepResult}>rx = {fmt4(resultado.rx)} cm</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.stepFormula}>Radio de giro y:  ry = √(Icy / A) = √({fmt4(resultado.Icy)} / {fmt4(resultado.A)})</Text>
          <Text style={styles.stepResult}>ry = {fmt4(resultado.ry)} cm</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>5.3 Ejes principales de inercia</Text>
          <Text style={styles.stepFormula}>R = √(((Icx − Icy)/2)² + Ixy²)</Text>
          <Text style={styles.stepFormula}>Inercia principal máxima:  I₁ = (Icx + Icy)/2 + R</Text>
          <Text style={styles.stepResult}>I₁ = {fmt4(resultado.I1)} cm⁴</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.stepFormula}>Inercia principal mínima:  I₂ = (Icx + Icy)/2 − R</Text>
          <Text style={styles.stepResult}>I₂ = {fmt4(resultado.I2)} cm⁴</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.stepFormula}>Ángulo ejes principales:  θp = (1/2) × arctan(−2Ixy / (Icx − Icy))</Text>
          <Text style={styles.stepResult}>θp = {fmt2(resultado.theta_p)}°</Text>
        </View>

        <Text style={styles.sectionTitle}>6. RESUMEN DE RESULTADOS</Text>
        <View style={styles.resultGrid}>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Área total A</Text><Text style={styles.resultValue}>{fmt4(resultado.A)}</Text><Text style={styles.resultUnit}>cm²</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Centroide x̄</Text><Text style={styles.resultValue}>{fmt4(resultado.xc)}</Text><Text style={styles.resultUnit}>cm</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Centroide ȳ</Text><Text style={styles.resultValue}>{fmt4(resultado.yc)}</Text><Text style={styles.resultUnit}>cm</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Inercia Icx</Text><Text style={styles.resultValue}>{fmt4(resultado.Icx)}</Text><Text style={styles.resultUnit}>cm⁴</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Inercia Icy</Text><Text style={styles.resultValue}>{fmt4(resultado.Icy)}</Text><Text style={styles.resultUnit}>cm⁴</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Inercia producto Ixy</Text><Text style={styles.resultValue}>{fmt4(resultado.Ixy)}</Text><Text style={styles.resultUnit}>cm⁴</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Módulo Sx⁺</Text><Text style={styles.resultValue}>{fmt4(resultado.Sx_top)}</Text><Text style={styles.resultUnit}>cm³</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Módulo Sx⁻</Text><Text style={styles.resultValue}>{fmt4(resultado.Sx_bot)}</Text><Text style={styles.resultUnit}>cm³</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Módulo Sy</Text><Text style={styles.resultValue}>{fmt4(resultado.Sy)}</Text><Text style={styles.resultUnit}>cm³</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Radio giro rx</Text><Text style={styles.resultValue}>{fmt4(resultado.rx)}</Text><Text style={styles.resultUnit}>cm</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Radio giro ry</Text><Text style={styles.resultValue}>{fmt4(resultado.ry)}</Text><Text style={styles.resultUnit}>cm</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Momento polar J</Text><Text style={styles.resultValue}>{fmt4(resultado.J)}</Text><Text style={styles.resultUnit}>cm⁴</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Inercia principal I₁</Text><Text style={styles.resultValue}>{fmt4(resultado.I1)}</Text><Text style={styles.resultUnit}>cm⁴</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Inercia principal I₂</Text><Text style={styles.resultValue}>{fmt4(resultado.I2)}</Text><Text style={styles.resultUnit}>cm⁴</Text></View>
          <View style={styles.resultCard}><Text style={styles.resultLabel}>Ángulo ejes θp</Text><Text style={styles.resultValue}>{fmt2(resultado.theta_p)}</Text><Text style={styles.resultUnit}>grados</Text></View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            NOTA: Esta memoria de cálculo ha sido generada automáticamente por NodoCalc. Los resultados deben ser verificados por un ingeniero civil competente antes de su uso en diseño estructural. NodoCalc y sus desarrolladores no se responsabilizan por el uso incorrecto de estos resultados. El usuario es responsable de verificar la validez de los datos de entrada y la aplicabilidad de los resultados a su proyecto específico.
          </Text>
        </View>

        <FooterPDF />
      </Page>
    </Document>
  )
}