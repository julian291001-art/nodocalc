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
  bodyText: { fontSize: 9, color: "#64748b", fontFamily: "Helvetica-Oblique", marginBottom: 10 },
  table: { marginBottom: 10 },
  tableHead: { flexDirection: "row", backgroundColor: "#1d4ed8", padding: 5, borderRadius: 3 },
  tableHeadCell: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 8, flex: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 4, backgroundColor: "#f8fafc" },
  tableCell: { fontSize: 8, flex: 1, color: "#334155" },
  tableCellB: { fontSize: 8, flex: 1, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  stepBox: { marginBottom: 10, backgroundColor: "#f8fafc", padding: 8, borderRadius: 3, borderLeftWidth: 3, borderLeftColor: "#1d4ed8" },
  stepTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1d4ed8", marginBottom: 6 },
  stepFormula: { fontSize: 9, color: "#334155", marginBottom: 3 },
  stepResult: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a8a", backgroundColor: "#dbeafe", padding: 5, borderRadius: 3, marginTop: 4, borderWidth: 1, borderColor: "#93c5fd" },
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
  metodoBadge: { fontSize: 8, color: "#1d4ed8", backgroundColor: "#eff6ff", padding: 4, borderRadius: 3, borderWidth: 1, borderColor: "#bfdbfe", marginBottom: 10, alignSelf: "flex-start" },
})

type Fuerza = {
  id: number; nombre: string; magnitud: number; angulo: number; color: string
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

function Header() {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerLogo}>NodoCalc</Text>
        <Text style={styles.headerSub}>Plataforma de calculo para ingenieria civil</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>Fundamentos Vectoriales — Estatica</Text>
        <Text style={styles.headerDate}>{fechaHoy()}</Text>
      </View>
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Desarrollado por Julian Leon y Miguel Cardenas — NodoCalc</Text>
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Pagina ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

export function PDFVectorial({ fuerzas, Rx, Ry, R, theta, metodo, imagenCanvas, datosUsuario, unidadFuerza }: {
  fuerzas: Fuerza[]
  Rx: number; Ry: number; R: number; theta: number
  metodo: string
  imagenCanvas?: string
  datosUsuario: DatosUsuario
  unidadFuerza: string
}) {
  const nombreMetodo = metodo === "descomposicion" ? "Descomposicion Rectangular" : metodo === "vectorial" ? "Metodo Vectorial (i, j)" : "Poligono de Fuerzas"

  return (
    <Document>

      {/* PORTADA */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverLogo}>NodoCalc</Text>
          <Text style={styles.coverLogoSub}>Plataforma de calculo para ingenieria civil</Text>
          <View style={styles.coverLine} />
          <Text style={styles.coverTitle}>MEMORIA DE CALCULO</Text>
          <Text style={styles.coverSubtitle}>Fundamentos Vectoriales — Suma de Fuerzas Concurrentes</Text>
          <View style={{ height: 20 }} />
          <View style={styles.coverBox}>
            {[
              { l: "Proyecto:", v: datosUsuario.proyecto || "—" },
              { l: "Descripcion:", v: datosUsuario.descripcion || "—" },
              { l: "Ingeniero:", v: datosUsuario.ingeniero || "—" },
              { l: "Empresa:", v: datosUsuario.empresa || "—" },
              { l: "Fecha:", v: fechaHoy() },
              { l: "Metodo:", v: nombreMetodo },
              { l: "N. de fuerzas:", v: `${fuerzas.length}` },
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

      {/* SECCION 1 — DATOS Y DIAGRAMA */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>1.  DATOS DE ENTRADA</Text>

        <Text style={styles.metodoBadge}>Metodo: {nombreMetodo}</Text>

        <Text style={styles.subTitle}>1.1  Sistema de fuerzas concurrentes</Text>
        <Text style={styles.bodyText}>
          Se tienen {fuerzas.length} fuerzas concurrentes en un punto. Cada fuerza se define por su magnitud y el angulo que forma con el eje x positivo (medido en sentido antihorario).
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadCell}>Fuerza</Text>
            <Text style={styles.tableHeadCell}>Magnitud ({unidadFuerza})</Text>
            <Text style={styles.tableHeadCell}>Angulo (deg)</Text>
            <Text style={styles.tableHeadCell}>Fx ({unidadFuerza})</Text>
            <Text style={styles.tableHeadCell}>Fy ({unidadFuerza})</Text>
          </View>
          {fuerzas.map((f, i) => (
            <View key={f.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.tableCellB}>{f.nombre}</Text>
              <Text style={styles.tableCell}>{f2(f.magnitud)}</Text>
              <Text style={styles.tableCell}>{f2(f.angulo)}</Text>
              <Text style={styles.tableCell}>{f2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))}</Text>
              <Text style={styles.tableCell}>{f2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, { backgroundColor: "#dbeafe" }]}>
            <Text style={styles.tableCellB}>SUMA</Text>
            <Text style={styles.tableCell}>—</Text>
            <Text style={styles.tableCell}>—</Text>
            <Text style={[styles.tableCellB, { color: "#1d4ed8" }]}>{f2(Rx)}</Text>
            <Text style={[styles.tableCellB, { color: "#1d4ed8" }]}>{f2(Ry)}</Text>
          </View>
        </View>

        <Text style={styles.subTitle}>1.2  Diagrama vectorial</Text>
        {imagenCanvas ? (
          <Image src={imagenCanvas} style={styles.canvasImg} />
        ) : (
          <Text style={styles.bodyText}>Diagrama no disponible</Text>
        )}

        <Footer />
      </Page>

      {/* SECCION 2 — DESARROLLO */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>2.  DESARROLLO DEL CALCULO</Text>
        <Text style={styles.bodyText}>
          Se aplica el metodo de {nombreMetodo.toLowerCase()} para determinar la fuerza resultante del sistema de fuerzas concurrentes.
        </Text>

        {/* Descomposicion rectangular */}
        {metodo === "descomposicion" && (
          <View>
            <Text style={styles.subTitle}>2.1  Descomposicion de cada fuerza en componentes rectangulares</Text>
            <Text style={styles.bodyText}>Para cada fuerza F con magnitud |F| y angulo theta:   Fx = |F| cos(theta)   Fy = |F| sen(theta)</Text>

            {fuerzas.map(f => (
              <View key={f.id} style={styles.stepBox}>
                <Text style={styles.stepTitle}>{f.nombre} = {f2(f.magnitud)} {unidadFuerza}  angulo = {f2(f.angulo)} deg</Text>
                <Text style={styles.stepFormula}>{f.nombre}x  =  {f2(f.magnitud)} x cos({f2(f.angulo)} deg)</Text>
                <Text style={styles.stepFormula}>{f.nombre}x  =  {f2(f.magnitud)} x {f2(Math.cos(f.angulo * Math.PI / 180))}</Text>
                <Text style={[styles.stepResult, { marginBottom: 4 }]}>{f.nombre}x  =  {f2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))} {unidadFuerza}</Text>
                <Text style={styles.stepFormula}>{f.nombre}y  =  {f2(f.magnitud)} x sen({f2(f.angulo)} deg)</Text>
                <Text style={styles.stepFormula}>{f.nombre}y  =  {f2(f.magnitud)} x {f2(Math.sin(f.angulo * Math.PI / 180))}</Text>
                <Text style={styles.stepResult}>{f.nombre}y  =  {f2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))} {unidadFuerza}</Text>
              </View>
            ))}

            <Text style={styles.subTitle}>2.2  Suma de componentes</Text>
            <View style={styles.stepBox}>
              <Text style={styles.stepTitle}>Componente x total</Text>
              <Text style={styles.stepFormula}>Rx  =  {fuerzas.map(f => `${f.nombre}x`).join(" + ")}</Text>
              <Text style={styles.stepFormula}>Rx  =  {fuerzas.map(f => f2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))).join(" + ")}</Text>
              <Text style={styles.stepResult}>Rx  =  {f2(Rx)} {unidadFuerza}</Text>
            </View>
            <View style={styles.stepBox}>
              <Text style={styles.stepTitle}>Componente y total</Text>
              <Text style={styles.stepFormula}>Ry  =  {fuerzas.map(f => `${f.nombre}y`).join(" + ")}</Text>
              <Text style={styles.stepFormula}>Ry  =  {fuerzas.map(f => f2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))).join(" + ")}</Text>
              <Text style={styles.stepResult}>Ry  =  {f2(Ry)} {unidadFuerza}</Text>
            </View>
          </View>
        )}

        {/* Vectorial */}
        {metodo === "vectorial" && (
          <View>
            <Text style={styles.subTitle}>2.1  Representacion vectorial en forma cartesiana</Text>
            <Text style={styles.bodyText}>Cada fuerza se expresa como vector: F = Fx i + Fy j</Text>
            {fuerzas.map(f => (
              <View key={f.id} style={styles.stepBox}>
                <Text style={styles.stepTitle}>{f.nombre} = {f2(f.magnitud)} {unidadFuerza}  angulo = {f2(f.angulo)} deg</Text>
                <Text style={styles.stepFormula}>{f.nombre}  =  {f2(f.magnitud)} cos({f2(f.angulo)} deg) i  +  {f2(f.magnitud)} sen({f2(f.angulo)} deg) j</Text>
                <Text style={styles.stepResult}>{f.nombre}  =  {f2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))} i  +  {f2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))} j  {unidadFuerza}</Text>
              </View>
            ))}
            <View style={styles.stepBox}>
              <Text style={styles.stepTitle}>Suma vectorial</Text>
              <Text style={styles.stepFormula}>R  =  ({fuerzas.map(f => f2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))).join(" + ")}) i  +  ({fuerzas.map(f => f2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))).join(" + ")}) j</Text>
              <Text style={styles.stepResult}>R  =  {f2(Rx)} i  +  {f2(Ry)} j  {unidadFuerza}</Text>
            </View>
          </View>
        )}

        {/* Poligono */}
        {metodo === "poligono" && (
          <View>
            <Text style={styles.subTitle}>2.1  Construccion del poligono de fuerzas</Text>
            <Text style={styles.bodyText}>Se trazan los vectores en secuencia cabeza a cola. La resultante es el vector que cierra el poligono desde el origen hasta el extremo final.</Text>
            {fuerzas.map((f, i) => (
              <View key={f.id} style={styles.stepBox}>
                <Text style={styles.stepTitle}>Paso {i + 1}: Trazar {f.nombre}</Text>
                <Text style={styles.stepFormula}>{f.nombre}  =  {f2(f.magnitud)} {unidadFuerza}  angulo {f2(f.angulo)} deg desde el extremo anterior</Text>
                <Text style={styles.stepFormula}>Componentes:  Fx = {f2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))} {unidadFuerza}   Fy = {f2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))} {unidadFuerza}</Text>
              </View>
            ))}
          </View>
        )}

        <Footer />
      </Page>

      {/* SECCION 3 — RESULTANTE Y RESUMEN */}
      <Page size="A4" style={styles.page}>
        <Header />
        <Text style={styles.secTitle}>3.  CALCULO DE LA RESULTANTE</Text>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>3.1  Magnitud de la resultante</Text>
          <Text style={styles.stepFormula}>|R|  =  sqrt(Rx^2 + Ry^2)</Text>
          <Text style={styles.stepFormula}>|R|  =  sqrt(({f2(Rx)})^2 + ({f2(Ry)})^2)</Text>
          <Text style={styles.stepFormula}>|R|  =  sqrt({f2(Rx * Rx)} + {f2(Ry * Ry)})</Text>
          <Text style={styles.stepFormula}>|R|  =  sqrt({f2(Rx * Rx + Ry * Ry)})</Text>
          <Text style={styles.stepResult}>|R|  =  {f4(R)} {unidadFuerza}</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>3.2  Direccion de la resultante</Text>
          <Text style={styles.stepFormula}>theta  =  arctan(Ry / Rx)</Text>
          <Text style={styles.stepFormula}>theta  =  arctan({f2(Ry)} / {f2(Rx)})</Text>
          <Text style={styles.stepResult}>theta  =  {f4(theta)} deg  (medido desde el eje x positivo, sentido antihorario)</Text>
        </View>

        <View style={styles.stepBox}>
          <Text style={styles.stepTitle}>3.3  Verificacion por cuadrante</Text>
          <Text style={styles.stepFormula}>Rx = {f2(Rx)} {unidadFuerza}   ({Rx >= 0 ? "positivo" : "negativo"})</Text>
          <Text style={styles.stepFormula}>Ry = {f2(Ry)} {unidadFuerza}   ({Ry >= 0 ? "positivo" : "negativo"})</Text>
          <Text style={styles.stepResult}>
            {Rx >= 0 && Ry >= 0 ? "La resultante se encuentra en el primer cuadrante (0 a 90 deg)" :
              Rx < 0 && Ry >= 0 ? "La resultante se encuentra en el segundo cuadrante (90 a 180 deg)" :
                Rx < 0 && Ry < 0 ? "La resultante se encuentra en el tercer cuadrante (180 a 270 deg)" :
                  "La resultante se encuentra en el cuarto cuadrante (270 a 360 deg)"}
          </Text>
        </View>

        <Text style={styles.secTitle}>4.  RESUMEN DE RESULTADOS</Text>
        <View style={styles.resGrid}>
          <View style={styles.resCard}><Text style={styles.resLabel}>Componente Rx</Text><Text style={styles.resValue}>{f4(Rx)}</Text><Text style={styles.resUnit}>{unidadFuerza}</Text></View>
          <View style={styles.resCard}><Text style={styles.resLabel}>Componente Ry</Text><Text style={styles.resValue}>{f4(Ry)}</Text><Text style={styles.resUnit}>{unidadFuerza}</Text></View>
          <View style={styles.resCard}><Text style={styles.resLabel}>Magnitud |R|</Text><Text style={styles.resValue}>{f4(R)}</Text><Text style={styles.resUnit}>{unidadFuerza}</Text></View>
          <View style={styles.resCard}><Text style={styles.resLabel}>Direccion theta</Text><Text style={styles.resValue}>{f4(theta)}</Text><Text style={styles.resUnit}>grados</Text></View>
          <View style={styles.resCard}><Text style={styles.resLabel}>N. de fuerzas</Text><Text style={styles.resValue}>{fuerzas.length}</Text><Text style={styles.resUnit}>fuerzas</Text></View>
          <View style={styles.resCard}><Text style={styles.resLabel}>Metodo usado</Text><Text style={[styles.resValue, { fontSize: 8 }]}>{nombreMetodo}</Text><Text style={styles.resUnit}> </Text></View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            NOTA: Esta memoria de calculo ha sido generada automaticamente por NodoCalc. Los resultados deben ser verificados por un ingeniero civil competente antes de su uso en proyectos reales. NodoCalc y sus desarrolladores no se responsabilizan por el uso incorrecto de estos resultados.
          </Text>
        </View>

        <Footer />
      </Page>

    </Document>
  )
}