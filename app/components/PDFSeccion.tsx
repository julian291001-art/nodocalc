"use client"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    paddingTop: 45,
    paddingBottom: 55,
    paddingHorizontal: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 8,
    marginBottom: 14,
  },
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
  secTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
    marginTop: 16,
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 4,
  },
  subTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 12,
    marginBottom: 6,
  },
  eqBlock: {
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#1d4ed8",
  },
  eqBlockTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
    marginBottom: 6,
  },
  eqImg: {
    width: "100%",
    height: 65,
    objectFit: "contain",
  },
  eqImgSm: {
    width: "100%",
    height: 45,
    objectFit: "contain",
  },
  eqResultBox: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 3,
    padding: 5,
    marginTop: 4,
  },
  eqResultImg: {
    width: "100%",
    height: 40,
    objectFit: "contain",
  },
  eqNota: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 3,
  },
  table: { marginBottom: 10 },
  tableHead: { flexDirection: "row", backgroundColor: "#1d4ed8", padding: 5, borderRadius: 3 },
  tableHeadCell: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 8, flex: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4, backgroundColor: "#f8fafc" },
  tableCell: { fontSize: 8, flex: 1, color: "#334155" },
  tableCellB: { fontSize: 8, flex: 1, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  resGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  resCard: { width: "48%", backgroundColor: "#eff6ff", borderRadius: 4, padding: 8, borderWidth: 1, borderColor: "#bfdbfe" },
  resLabel: { fontSize: 7, color: "#3b82f6", fontFamily: "Helvetica-Bold", marginBottom: 2 },
  resValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  resUnit: { fontSize: 7, color: "#64748b" },
  canvasImg: { width: "100%", height: 220, objectFit: "contain", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 3, marginBottom: 10 },
  footer: { position: "absolute", bottom: 20, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 5 },
  footerText: { fontSize: 7, color: "#94a3b8" },
  footerPage: { fontSize: 7, color: "#94a3b8" },
  disclaimer: { backgroundColor: "#fefce8", borderRadius: 3, padding: 8, borderWidth: 1, borderColor: "#fde68a", marginTop: 16 },
  disclaimerText: { fontSize: 7, color: "#92400e" },
  sep: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginVertical: 8 },
  bodyText: { fontSize: 9, color: "#64748b", fontFamily: "Helvetica-Oblique", marginBottom: 10 },
})

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

function f2(n: number) { return n.toFixed(2) }
function f4(n: number) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(4)
}
function fechaHoy() {
  return new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
}

// ── Bloque de ecuación con imágenes KaTeX ─────────────────────────────────
function BloqueEq({ titulo, imgs, nota }: {
  titulo: string
  imgs: { src: string; esResultado?: boolean; altura?: number }[]
  nota?: string
}) {
  return (
    <View style={styles.eqBlock}>
      <Text style={styles.eqBlockTitle}>{titulo}</Text>
      {imgs.map((img, i) =>
        img.esResultado ? (
          <View key={i} style={styles.eqResultBox}>
            <Image src={img.src} style={{ width: "100%", height: img.altura || 40, objectFit: "contain" }} />
          </View>
        ) : (
          <Image key={i} src={img.src} style={{ width: "100%", height: img.altura || 60, objectFit: "contain" }} />
        )
      )}
      {nota && <Text style={styles.eqNota}>{nota}</Text>}
    </View>
  )
}

function Header() {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerLogo}>NodoCalc</Text>
        <Text style={styles.headerSub}>Plataforma de calculo para ingenieria civil</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>Propiedades Geometricas de Seccion</Text>
        <Text style={styles.headerDate}>{fechaHoy()}</Text>
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

// ── Documento PDF ──────────────────────────────────────────────────────────
export function PDFSeccion({ elementos, resultado, datosUsuario, imagenCanvas, ecuacionesPNG }: {
  elementos: Elemento[]
  resultado: ResultadoSeccion
  datosUsuario: DatosUsuario
  imagenCanvas?: string
  ecuacionesPNG: Record<string, string>
})
{
  const eq = ecuacionesPNG

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
              { l: "Fecha:", v: fechaHoy() },
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

      {/* SECCIÓN 1 — DESCRIPCIÓN */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>1.  DESCRIPCION DE LA SECCION</Text>

        <Text style={styles.subTitle}>1.1  Vista de la seccion en el plano cartesiano</Text>
        {imagenCanvas ? (
          <Image src={imagenCanvas} style={styles.canvasImg} />
        ) : (
          <Text style={styles.eqNota}>Imagen no disponible</Text>
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
        {elementos.map((el) => (
          <View key={el.id} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#334155", marginBottom: 4 }}>
              {el.label}  —  {el.plantilla}
            </Text>
            {el.plantilla === "coordenadas" ? (
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={[styles.tableHeadCell, { flex: 0.5 }]}>Vertice</Text>
                  <Text style={styles.tableHeadCell}>x (cm)</Text>
                  <Text style={styles.tableHeadCell}>y (cm)</Text>
                </View>
                {(el.coordPts || []).map((pt, i) => (
                  <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>P{i + 1}</Text>
                    <Text style={styles.tableCellB}>{f4(pt.x)}</Text>
                    <Text style={styles.tableCellB}>{f4(pt.y)}</Text>
                  </View>
                ))}
              </View>
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

      {/* SECCIÓN 2 — DESARROLLO POR ELEMENTO */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>2.  DESARROLLO DEL CALCULO POR ELEMENTO</Text>
        <Text style={styles.bodyText}>
          Se calcula el area, centroide e inercia propia de cada elemento respecto a su centroide propio.
          Se aplica el Teorema de Steiner para trasladar al centroide global de la seccion compuesta.
        </Text>

        {elementos.map((el) => {
          const pre = `el_${el.id}_`
          return (
            <View key={el.id}>
              <Text style={styles.subTitle}>
                {el.label}  —  {el.plantilla}  {el.signo > 0 ? "(+ suma)" : "(- resta)"}
              </Text>

              {/* Rectangular */}
              {el.plantilla === "rectangular" && (
                <View>
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_sus`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}xc_gen`] && <BloqueEq titulo="Centroide en x" imgs={[{ src: eq[`${pre}xc_gen`] }, { src: eq[`${pre}xc_sus`] }, { src: eq[`${pre}xc_res`], esResultado: true }]} />}
                  {eq[`${pre}yc_gen`] && <BloqueEq titulo="Centroide en y" imgs={[{ src: eq[`${pre}yc_gen`] }, { src: eq[`${pre}yc_sus`] }, { src: eq[`${pre}yc_res`], esResultado: true }]} />}
                  {eq[`${pre}Icx_gen`] && <BloqueEq titulo="Inercia centroidal x" imgs={[{ src: eq[`${pre}Icx_gen`] }, { src: eq[`${pre}Icx_sus`] }, { src: eq[`${pre}Icx_int`] }, { src: eq[`${pre}Icx_res`], esResultado: true }]} />}
                  {eq[`${pre}Icy_gen`] && <BloqueEq titulo="Inercia centroidal y" imgs={[{ src: eq[`${pre}Icy_gen`] }, { src: eq[`${pre}Icy_sus`] }, { src: eq[`${pre}Icy_int`] }, { src: eq[`${pre}Icy_res`], esResultado: true }]} />}
                </View>
              )}

              {/* Circular */}
              {el.plantilla === "circular" && (
                <View>
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_sus`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}cc_gen`] && <BloqueEq titulo="Centro del circulo" imgs={[{ src: eq[`${pre}cc_gen`] }, { src: eq[`${pre}cc_res`], esResultado: true }]} />}
                  {eq[`${pre}Ic_gen`] && <BloqueEq titulo="Inercia centroidal (Icx = Icy por simetria)" imgs={[{ src: eq[`${pre}Ic_gen`] }, { src: eq[`${pre}Ic_sus`] }, { src: eq[`${pre}Ic_res`], esResultado: true }]} nota="Por simetria axial: Ixy = 0" />}
                </View>
              )}

              {/* Tubo */}
              {el.plantilla === "tubo" && (
                <View>
                  {eq[`${pre}ri_gen`] && <BloqueEq titulo="Radio interior" imgs={[{ src: eq[`${pre}ri_gen`] }, { src: eq[`${pre}ri_res`], esResultado: true }]} />}
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area neta (corona circular)" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_sus`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}Ic_gen`] && <BloqueEq titulo="Inercia centroidal" imgs={[{ src: eq[`${pre}Ic_gen`] }, { src: eq[`${pre}Ic_sus`] }, { src: eq[`${pre}Ic_res`], esResultado: true }]} />}
                </View>
              )}

              {/* Perfil I */}
              {el.plantilla === "I" && (
                <View>
                  <Text style={styles.eqNota}>Descomposicion: ala inferior [1], alma [2], ala superior [3]</Text>
                  {eq[`${pre}A1_gen`] && <BloqueEq titulo="Area ala inferior [1]" imgs={[{ src: eq[`${pre}A1_gen`] }, { src: eq[`${pre}A1_res`], esResultado: true }]} />}
                  {eq[`${pre}y1_gen`] && <BloqueEq titulo="Centroide ala inferior y1" imgs={[{ src: eq[`${pre}y1_gen`] }, { src: eq[`${pre}y1_res`], esResultado: true }]} />}
                  {eq[`${pre}A2_gen`] && <BloqueEq titulo="Area alma [2]" imgs={[{ src: eq[`${pre}A2_gen`] }, { src: eq[`${pre}A2_res`], esResultado: true }]} />}
                  {eq[`${pre}y2_gen`] && <BloqueEq titulo="Centroide alma y2" imgs={[{ src: eq[`${pre}y2_gen`] }, { src: eq[`${pre}y2_res`], esResultado: true }]} />}
                  {eq[`${pre}A3_gen`] && <BloqueEq titulo="Area ala superior [3]" imgs={[{ src: eq[`${pre}A3_gen`] }, { src: eq[`${pre}A3_res`], esResultado: true }]} />}
                  {eq[`${pre}y3_gen`] && <BloqueEq titulo="Centroide ala superior y3" imgs={[{ src: eq[`${pre}y3_gen`] }, { src: eq[`${pre}y3_res`], esResultado: true }]} />}
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area total" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}yc_gen`] && <BloqueEq titulo="Centroide global y_c" imgs={[{ src: eq[`${pre}yc_gen`] }, { src: eq[`${pre}yc_sus`] }, { src: eq[`${pre}yc_res`], esResultado: true }]} />}
                  {eq[`${pre}Ics1_gen`] && <BloqueEq titulo="Inercia ala inferior con Steiner [1]" imgs={[{ src: eq[`${pre}Ics1_gen`] }, { src: eq[`${pre}Ics1_sus`] }, { src: eq[`${pre}Ics1_res`], esResultado: true }]} />}
                  {eq[`${pre}Ics2_gen`] && <BloqueEq titulo="Inercia alma con Steiner [2]" imgs={[{ src: eq[`${pre}Ics2_gen`] }, { src: eq[`${pre}Ics2_sus`] }, { src: eq[`${pre}Ics2_res`], esResultado: true }]} />}
                  {eq[`${pre}Ics3_gen`] && <BloqueEq titulo="Inercia ala superior con Steiner [3]" imgs={[{ src: eq[`${pre}Ics3_gen`] }, { src: eq[`${pre}Ics3_sus`] }, { src: eq[`${pre}Ics3_res`], esResultado: true }]} />}
                  {eq[`${pre}Icx_gen`] && <BloqueEq titulo="Inercia centroidal total Icx" imgs={[{ src: eq[`${pre}Icx_gen`] }, { src: eq[`${pre}Icx_sus`] }, { src: eq[`${pre}Icx_res`], esResultado: true }]} />}
                </View>
              )}

              {/* T */}
              {el.plantilla === "T" && (
                <View>
                  <Text style={styles.eqNota}>Descomposicion: alma [1], ala [2]</Text>
                  {eq[`${pre}A1_gen`] && <BloqueEq titulo="Area alma [1]" imgs={[{ src: eq[`${pre}A1_gen`] }, { src: eq[`${pre}A1_res`], esResultado: true }]} />}
                  {eq[`${pre}y1_gen`] && <BloqueEq titulo="Centroide alma y1" imgs={[{ src: eq[`${pre}y1_gen`] }, { src: eq[`${pre}y1_res`], esResultado: true }]} />}
                  {eq[`${pre}A2_gen`] && <BloqueEq titulo="Area ala [2]" imgs={[{ src: eq[`${pre}A2_gen`] }, { src: eq[`${pre}A2_res`], esResultado: true }]} />}
                  {eq[`${pre}y2_gen`] && <BloqueEq titulo="Centroide ala y2" imgs={[{ src: eq[`${pre}y2_gen`] }, { src: eq[`${pre}y2_res`], esResultado: true }]} />}
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area total" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}yc_gen`] && <BloqueEq titulo="Centroide global y_c" imgs={[{ src: eq[`${pre}yc_gen`] }, { src: eq[`${pre}yc_sus`] }, { src: eq[`${pre}yc_res`], esResultado: true }]} />}
                  {eq[`${pre}Ics1_gen`] && <BloqueEq titulo="Inercia alma con Steiner [1]" imgs={[{ src: eq[`${pre}Ics1_gen`] }, { src: eq[`${pre}Ics1_sus`] }, { src: eq[`${pre}Ics1_res`], esResultado: true }]} />}
                  {eq[`${pre}Ics2_gen`] && <BloqueEq titulo="Inercia ala con Steiner [2]" imgs={[{ src: eq[`${pre}Ics2_gen`] }, { src: eq[`${pre}Ics2_sus`] }, { src: eq[`${pre}Ics2_res`], esResultado: true }]} />}
                  {eq[`${pre}Icx_gen`] && <BloqueEq titulo="Inercia centroidal total Icx" imgs={[{ src: eq[`${pre}Icx_gen`] }, { src: eq[`${pre}Icx_sus`] }, { src: eq[`${pre}Icx_res`], esResultado: true }]} />}
                </View>
              )}

              {/* L */}
              {el.plantilla === "L" && (
                <View>
                  <Text style={styles.eqNota}>Descomposicion: franja horizontal [1], franja vertical [2]</Text>
                  {eq[`${pre}A1_gen`] && <BloqueEq titulo="Area franja horizontal [1]" imgs={[{ src: eq[`${pre}A1_gen`] }, { src: eq[`${pre}A1_res`], esResultado: true }]} />}
                  {eq[`${pre}A2_gen`] && <BloqueEq titulo="Area franja vertical [2]" imgs={[{ src: eq[`${pre}A2_gen`] }, { src: eq[`${pre}A2_res`], esResultado: true }]} />}
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area total" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}xc_gen`] && <BloqueEq titulo="Centroide global x_c" imgs={[{ src: eq[`${pre}xc_gen`] }, { src: eq[`${pre}xc_sus`] }, { src: eq[`${pre}xc_res`], esResultado: true }]} />}
                  {eq[`${pre}yc_gen`] && <BloqueEq titulo="Centroide global y_c" imgs={[{ src: eq[`${pre}yc_gen`] }, { src: eq[`${pre}yc_sus`] }, { src: eq[`${pre}yc_res`], esResultado: true }]} nota="Inercias calculadas por formula de Gauss" />}
                </View>
              )}

              {/* C */}
              {el.plantilla === "C" && (
                <View>
                  <Text style={styles.eqNota}>Descomposicion: ala inferior [1], alma [2], ala superior [3]</Text>
                  {eq[`${pre}A1_gen`] && <BloqueEq titulo="Area ala inferior [1]" imgs={[{ src: eq[`${pre}A1_gen`] }, { src: eq[`${pre}A1_res`], esResultado: true }]} />}
                  {eq[`${pre}A2_gen`] && <BloqueEq titulo="Area alma [2]" imgs={[{ src: eq[`${pre}A2_gen`] }, { src: eq[`${pre}A2_res`], esResultado: true }]} />}
                  {eq[`${pre}A3_gen`] && <BloqueEq titulo="Area ala superior [3]" imgs={[{ src: eq[`${pre}A3_gen`] }, { src: eq[`${pre}A3_res`], esResultado: true }]} />}
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area total" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}yc_gen`] && <BloqueEq titulo="Centroide global y_c" imgs={[{ src: eq[`${pre}yc_gen`] }, { src: eq[`${pre}yc_sus`] }, { src: eq[`${pre}yc_res`], esResultado: true }]} />}
                  {eq[`${pre}Icx_gen`] && <BloqueEq titulo="Inercia centroidal total Icx" imgs={[{ src: eq[`${pre}Icx_gen`] }, { src: eq[`${pre}Icx_sus`] }, { src: eq[`${pre}Icx_res`], esResultado: true }]} />}
                </View>
              )}

              {/* Cajón */}
              {el.plantilla === "cajon" && (
                <View>
                  <Text style={styles.eqNota}>Rectangulo exterior menos rectangulo interior</Text>
                  {eq[`${pre}Aext_gen`] && <BloqueEq titulo="Area exterior" imgs={[{ src: eq[`${pre}Aext_gen`] }, { src: eq[`${pre}Aext_res`], esResultado: true }]} />}
                  {eq[`${pre}Aint_gen`] && <BloqueEq titulo="Area hueco interior" imgs={[{ src: eq[`${pre}Aint_gen`] }, { src: eq[`${pre}Aint_res`], esResultado: true }]} />}
                  {eq[`${pre}A_gen`] && <BloqueEq titulo="Area neta" imgs={[{ src: eq[`${pre}A_gen`] }, { src: eq[`${pre}A_res`], esResultado: true }]} />}
                  {eq[`${pre}Icx_gen`] && <BloqueEq titulo="Inercia centroidal Icx" imgs={[{ src: eq[`${pre}Icx_gen`] }, { src: eq[`${pre}Icx_sus`] }, { src: eq[`${pre}Icx_res`], esResultado: true }]} />}
                </View>
              )}

              {/* Coordenadas */}
              {el.plantilla === "coordenadas" && (
                <View>
                  {eq[`${pre}gauss_A`] && <BloqueEq titulo="Area por formula de Gauss" imgs={[{ src: eq[`${pre}gauss_A`] }]} />}
                  {eq[`${pre}gauss_xc`] && <BloqueEq titulo="Centroide x por formula de Gauss" imgs={[{ src: eq[`${pre}gauss_xc`] }]} />}
                  {eq[`${pre}gauss_yc`] && <BloqueEq titulo="Centroide y por formula de Gauss" imgs={[{ src: eq[`${pre}gauss_yc`] }]} />}
                  {eq[`${pre}gauss_Ix`] && <BloqueEq titulo="Inercia Ix por formula de Gauss" imgs={[{ src: eq[`${pre}gauss_Ix`] }]} nota="Sentido horario = area positiva" />}
                  <View style={styles.table}>
                    <View style={styles.tableHead}>
                      <Text style={[styles.tableHeadCell, { flex: 0.5 }]}>P</Text>
                      <Text style={styles.tableHeadCell}>x (cm)</Text>
                      <Text style={styles.tableHeadCell}>y (cm)</Text>
                    </View>
                    {(el.coordPts || []).map((pt, i) => (
                      <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{i + 1}</Text>
                        <Text style={styles.tableCellB}>{f4(pt.x)}</Text>
                        <Text style={styles.tableCellB}>{f4(pt.y)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.sep} />
            </View>
          )
        })}
        <Footer />
      </Page>

      {/* SECCIÓN 3 — CENTROIDE Y INERCIAS GLOBALES */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>3.  CENTROIDE DE LA SECCION COMPUESTA</Text>
        <Text style={styles.bodyText}>
          El centroide global se obtiene ponderando el area de cada elemento por su centroide.
          Los elementos con operacion (-) se restan.
        </Text>

        {eq["global_A_gen"] && <BloqueEq titulo="3.1  Area total" imgs={[{ src: eq["global_A_gen"] }, { src: eq["global_A_res"], esResultado: true }]} />}
        {eq["global_xc_gen"] && <BloqueEq titulo="3.2  Centroide en x" imgs={[{ src: eq["global_xc_gen"] }, { src: eq["global_xc_res"], esResultado: true }]} />}
        {eq["global_yc_gen"] && <BloqueEq titulo="3.3  Centroide en y" imgs={[{ src: eq["global_yc_gen"] }, { src: eq["global_yc_res"], esResultado: true }]} />}

        <Text style={styles.secTitle}>4.  INERCIAS CENTROIDALES DE LA SECCION COMPUESTA</Text>
        <Text style={styles.bodyText}>
          Se aplica el Teorema de Steiner. La inercia propia de cada elemento se traslada al centroide global.
        </Text>

        {eq["global_Icx_gen"] && <BloqueEq titulo="4.1  Inercia centroidal en x — Teorema de Steiner" imgs={[{ src: eq["global_Icx_gen"] }, { src: eq["global_Icx_steiner"] }, { src: eq["global_Icx_res"], esResultado: true }]} />}
        {eq["global_Icy_gen"] && <BloqueEq titulo="4.2  Inercia centroidal en y" imgs={[{ src: eq["global_Icy_gen"] }, { src: eq["global_Icy_res"], esResultado: true }]} />}
        {eq["global_Ixy_gen"] && <BloqueEq titulo="4.3  Inercia producto" imgs={[{ src: eq["global_Ixy_gen"] }, { src: eq["global_Ixy_res"], esResultado: true }]} />}
        {eq["global_J_gen"] && <BloqueEq titulo="4.4  Momento polar de inercia" imgs={[{ src: eq["global_J_gen"] }, { src: eq["global_J_sus"] }, { src: eq["global_J_res"], esResultado: true }]} />}

        <Footer />
      </Page>

      {/* SECCIÓN 4 — MÓDULOS Y EJES PRINCIPALES */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>5.  MODULOS RESISTENTES Y RADIOS DE GIRO</Text>

        {eq["mod_Sxp_gen"] && <BloqueEq titulo="5.1  Modulo resistente elastico superior Sx(+)" imgs={[{ src: eq["mod_Sxp_gen"] }, { src: eq["mod_Sxp_sus"] }, { src: eq["mod_Sxp_res"], esResultado: true }]} nota="y_max = coordenada y del punto mas alejado superiormente" />}
        {eq["mod_Sxm_gen"] && <BloqueEq titulo="5.2  Modulo resistente elastico inferior Sx(-)" imgs={[{ src: eq["mod_Sxm_gen"] }, { src: eq["mod_Sxm_sus"] }, { src: eq["mod_Sxm_res"], esResultado: true }]} />}
        {eq["mod_Sy_gen"] && <BloqueEq titulo="5.3  Modulo resistente en y" imgs={[{ src: eq["mod_Sy_gen"] }, { src: eq["mod_Sy_sus"] }, { src: eq["mod_Sy_res"], esResultado: true }]} />}
        {eq["mod_rx_gen"] && <BloqueEq titulo="5.4  Radio de giro en x" imgs={[{ src: eq["mod_rx_gen"] }, { src: eq["mod_rx_sus"] }, { src: eq["mod_rx_int"] }, { src: eq["mod_rx_res"], esResultado: true }]} />}
        {eq["mod_ry_gen"] && <BloqueEq titulo="5.5  Radio de giro en y" imgs={[{ src: eq["mod_ry_gen"] }, { src: eq["mod_ry_sus"] }, { src: eq["mod_ry_int"] }, { src: eq["mod_ry_res"], esResultado: true }]} />}

        <Text style={styles.secTitle}>6.  EJES PRINCIPALES DE INERCIA</Text>

        {eq["ejes_R_gen"] && <BloqueEq titulo="6.1  Radio del circulo de Mohr" imgs={[{ src: eq["ejes_R_gen"] }, { src: eq["ejes_R_sus"] }, { src: eq["ejes_R_res"], esResultado: true }]} />}
        {eq["ejes_I1_gen"] && <BloqueEq titulo="6.2  Inercia principal maxima I1" imgs={[{ src: eq["ejes_I1_gen"] }, { src: eq["ejes_I1_sus"] }, { src: eq["ejes_I1_res"], esResultado: true }]} />}
        {eq["ejes_I2_gen"] && <BloqueEq titulo="6.3  Inercia principal minima I2" imgs={[{ src: eq["ejes_I2_gen"] }, { src: eq["ejes_I2_sus"] }, { src: eq["ejes_I2_res"], esResultado: true }]} />}
        {eq["ejes_tp_gen"] && <BloqueEq titulo="6.4  Angulo de los ejes principales" imgs={[{ src: eq["ejes_tp_gen"] }, { src: eq["ejes_tp_sus"] }, { src: eq["ejes_tp_res"], esResultado: true }]} />}

        <Text style={styles.secTitle}>7.  RESUMEN DE RESULTADOS</Text>
        <View style={styles.resGrid}>
          {[
            { l: "Area total  A", v: f4(resultado.A), u: "cm\u00b2" },
            { l: "Centroide  x_c", v: f4(resultado.xc), u: "cm" },
            { l: "Centroide  y_c", v: f4(resultado.yc), u: "cm" },
            { l: "Inercia  Icx", v: f4(resultado.Icx), u: "cm\u2074" },
            { l: "Inercia  Icy", v: f4(resultado.Icy), u: "cm\u2074" },
            { l: "Inercia producto  Ixy", v: f4(resultado.Ixy), u: "cm\u2074" },
            { l: "Modulo  Sx(+)", v: f4(resultado.Sx_top), u: "cm\u00b3" },
            { l: "Modulo  Sx(-)", v: f4(resultado.Sx_bot), u: "cm\u00b3" },
            { l: "Modulo  Sy", v: f4(resultado.Sy), u: "cm\u00b3" },
            { l: "Radio giro  rx", v: f4(resultado.rx), u: "cm" },
            { l: "Radio giro  ry", v: f4(resultado.ry), u: "cm" },
            { l: "Momento polar  J", v: f4(resultado.J), u: "cm\u2074" },
            { l: "Inercia principal  I1", v: f4(resultado.I1), u: "cm\u2074" },
            { l: "Inercia principal  I2", v: f4(resultado.I2), u: "cm\u2074" },
            { l: "Angulo ejes  \u03b8p", v: resultado.theta_p.toFixed(2), u: "grados" },
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
          </Text>
        </View>

        <Footer />
      </Page>

    </Document>
  )
}