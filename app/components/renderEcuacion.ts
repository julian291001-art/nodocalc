import katex from "katex"

export async function ecuacionAPNG(latex: string, display = true, altura = 70): Promise<string> {
  const html = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
    trust: true,
  })

  const W = 600
  const H = altura
  const scale = 2

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <style>
        @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
        .katex { font-size: 15px; color: #1e293b; }
        .katex-display { margin: 0; }
      </style>
      <foreignObject width="${W}" height="${H}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          width: ${W}px;
          height: ${H}px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          padding: 4px 12px;
          box-sizing: border-box;
        ">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext("2d")!
    ctx.scale(scale, scale)
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, W, H)

    const img = new Image()
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      ctx.fillStyle = "#1e293b"
      ctx.font = "13px serif"
      ctx.fillText(latex.replace(/\\/g, ""), 10, H / 2)
      resolve(canvas.toDataURL("image/png"))
    }
    img.src = url
  })
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