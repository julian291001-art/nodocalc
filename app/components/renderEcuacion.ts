import katex from "katex"

export async function ecuacionAPNG(latex: string, display = true, altura = 100): Promise<string> {
  const container = document.createElement("div")
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    background-color: white;
    padding: 20px 24px;
    width: 620px;
    min-height: ${altura}px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `

  container.innerHTML = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
  })

  document.body.appendChild(container)

  // Esperar un frame para que el DOM se estabilice
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h2c = (await import("html2canvas")).default as any
    const realAltura = Math.max(container.scrollHeight + 20, altura)
    container.style.minHeight = `${realAltura}px`
    const canvas = await h2c(container, {
      scale: 2,
      logging: false,
      useCORS: true,
      width: 620,
      height: realAltura,
    })
    return canvas.toDataURL("image/png")
  } finally {
    document.body.removeChild(container)
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