import katex from "katex"

export async function ecuacionAPNG(latex: string, display = true, altura = 100): Promise<string> {
  const wrapper = document.createElement("div")
  wrapper.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    background-color: white;
    width: 620px;
    box-sizing: border-box;
  `

  const inner = document.createElement("div")
  inner.style.cssText = `
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: ${altura}px;
    background-color: white;
  `

  inner.innerHTML = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
  })

  wrapper.appendChild(inner)
  document.body.appendChild(wrapper)

  // Esperar dos frames para que KaTeX termine de renderizar
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))

  // Medir altura real del contenido
  const alturaReal = Math.max(inner.getBoundingClientRect().height + 8, altura)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h2c = (await import("html2canvas")).default as any
    const canvas = await h2c(inner, {
      scale: 2,
      logging: false,
      useCORS: true,
      width: 620,
      height: alturaReal,
    })
    return canvas.toDataURL("image/png")
  } finally {
    document.body.removeChild(wrapper)
  }
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