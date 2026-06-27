import katex from "katex"

export async function ecuacionAPNG(latex: string, display = true, altura = 70): Promise<string> {
  const html = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "mathml",
  })

  const W = 600
  const H = altura
  const scale = 2

  const canvas = document.createElement("canvas")
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext("2d")!
  ctx.scale(scale, scale)
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = "#1e293b"
  ctx.font = `${display ? 15 : 13}px serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  // Extraer texto plano del MathML para renderizar con canvas
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  const texto = tmp.textContent || latex.replace(/\\/g, "").replace(/\{|\}/g, "")
  ctx.fillText(texto, W / 2, H / 2)

  return canvas.toDataURL("image/png")
}

export async function renderizarEcuaciones(
  ecuaciones: { key: string; latex: string; display?: boolean; altura?: number }[]
): Promise<Record<string, string>> {
  const results = await Promise.all(
    ecuaciones.map(async ({ key, latex, display = true, altura = 70 }) => ({
      key,
      png: await ecuacionAPNG(latex, display, altura),
    }))
  )
  return Object.fromEntries(results.map(({ key, png }) => [key, png]))
}