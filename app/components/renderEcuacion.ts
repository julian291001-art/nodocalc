import katex from "katex"
import html2canvas from "html2canvas"

export async function ecuacionAPNG(latex: string, display = true, altura = 70): Promise<string> {
  // Crear contenedor invisible en el DOM
  const container = document.createElement("div")
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    background: white;
    padding: 8px 20px;
    width: 620px;
    min-height: ${altura}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: KaTeX_Math, serif;
    box-sizing: border-box;
  `

  // Renderizar KaTeX dentro del div
  container.innerHTML = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
  })

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: false,
      width: 620,
      height: altura,
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
  for (const { key, latex, display = true, altura = 70 } of ecuaciones) {
    const png = await ecuacionAPNG(latex, display, altura)
    results.push({ key, png })
  }
  return Object.fromEntries(results.map(({ key, png }) => [key, png]))
}