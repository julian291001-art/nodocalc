import katex from "katex"

export async function ecuacionAPNG(latex: string, display = true, altura = 100): Promise<string> {
  // Renderizar KaTeX a HTML
  const html = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
  })

  // Crear elemento temporal para medir tamaño real
  const medidor = document.createElement("div")
  medidor.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 580px;
    padding: 16px;
    background: white;
    font-size: 16px;
    visibility: hidden;
  `
  medidor.innerHTML = html
  document.body.appendChild(medidor)
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))
  const alturaReal = Math.max(medidor.offsetHeight + 32, altura)
  const anchoReal = 620
  document.body.removeChild(medidor)

  // Crear canvas con las dimensiones correctas
  const canvas = document.createElement("canvas")
  const scale = 3
  canvas.width = anchoReal * scale
  canvas.height = alturaReal * scale
  const ctx = canvas.getContext("2d")!
  ctx.scale(scale, scale)
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, anchoReal, alturaReal)

  // Crear imagen desde SVG foreignObject con el HTML de KaTeX
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${anchoReal}" height="${alturaReal}">
      <foreignObject width="${anchoReal}" height="${alturaReal}">
        <div xmlns="http://www.w3.org/1999/xhtml"
          style="
            width: ${anchoReal}px;
            height: ${alturaReal}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            padding: 8px 16px;
            box-sizing: border-box;
            font-size: 16px;
          ">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `

  // Inline todas las fuentes de KaTeX como base64
  return new Promise((resolve) => {
    const img = new Image()
    const blob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>`, svgContent],
      { type: "image/svg+xml;charset=utf-8" }
    )
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      ctx.drawImage(img, 0, 0, anchoReal, alturaReal)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/png"))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      // Fallback: texto simple centrado
      ctx.fillStyle = "#1e293b"
      ctx.font = "14px serif"
      ctx.textAlign = "center"
      ctx.fillText(latex.replace(/\\[a-z]+/g, "").replace(/[{}]/g, ""), anchoReal / 2, alturaReal / 2)
      resolve(canvas.toDataURL("image/png"))
    }

    img.src = url
  })
}

export async function renderizarEcuaciones(
  ecuaciones: { key: string; latex: string; display?: boolean; altura?: number }[]
): Promise<Record<string, string>> {
  const results: { key: string; png: string }[] = []
  for (const { key, latex, display = true, altura = 100 } of ecuaciones) {
    const png = await ecuacionAPNG(latex, display, altura)
    results.push({ key, png })
  }
  return Object.fromEntries(results.map(({ key, png }) => [key, png]))
}