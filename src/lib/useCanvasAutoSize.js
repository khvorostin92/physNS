import { useEffect } from 'react'

/**
 * Автоматически подгоняет размер canvas под ширину его родителя,
 * сохраняя aspectRatio и учитывая devicePixelRatio.
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {{aspect:number, maxHeightPx?:number}} opts
 */
export function useCanvasAutoSize(canvasRef, { aspect = 16/7, maxHeightPx = 560 } = {}){
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvas.parentElement) return
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))

    const el = canvas
    const parent = canvas.parentElement

    // наблюдаем ширину контейнера
    const ro = new ResizeObserver(() => {
      const cssW = parent.clientWidth
      let cssH = Math.round(cssW / aspect)
      if (cssH > maxHeightPx) {
        cssH = maxHeightPx
      }

      // CSS-размер для раскладки
      el.style.width = cssW + 'px'
      el.style.height = cssH + 'px'

      // Физический буфер пикселей (чёткий рендер на Retina)
      const pxW = Math.max(1, Math.floor(cssW * dpr))
      const pxH = Math.max(1, Math.floor(cssH * dpr))
      if (el.width !== pxW || el.height !== pxH) {
        el.width = pxW
        el.height = pxH
      }
    })
    ro.observe(parent)

    // первичный вызов
    const ev = new Event('resize')
    window.dispatchEvent(ev)

    return () => ro.disconnect()
  }, [canvasRef, aspect, maxHeightPx])
}
