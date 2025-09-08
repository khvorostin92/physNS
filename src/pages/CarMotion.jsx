import { useEffect, useRef, useState } from 'react'

const TXT = {
  ru: {
    title: 'Авто на дороге',
    gas: 'Газ (%)', mass: 'Масса m (кг)', drag: 'Аэродин. коэф. k (кг/м)', friction: 'Коэф. трения μ',
    start: 'Старт', reset: 'Сброс',
    helpTitle: 'Теория'
  },
  sr: {
    title: 'Ауто на путу',
    gas: 'Гас (%)', mass: 'Маса m (kg)', drag: 'Аеродин. коеф. k (kg/m)', friction: 'Коеф. трења μ',
    start: 'Старт', reset: 'Ресет',
    helpTitle: 'Теорија'
  },
  en: {
    title: 'Car on the Road',
    gas: 'Throttle (%)', mass: 'Mass m (kg)', drag: 'Aerodyn. coeff k (kg/m)', friction: 'Friction coeff μ',
    start: 'Start', reset: 'Reset',
    helpTitle: 'Theory'
  }
}

const COLORS = ['#C00000', '#1B7FBD', '#2E7D32', '#8E44AD']

export default function CarMotion({ lang='ru' }) {
  const t = TXT[lang] || TXT.ru

  // Параметры
  const [gas, setGas]   = useState(60)     // 0..120% (после 90% начинается буксование)
  const [mass, setMass] = useState(1200)   // кг
  const [cAir, setCAir] = useState(0.0)    // k (кг/м) ~ 0.3..0.6 типично
  const [mu, setMu]     = useState(0.8)    // коэффициент сцепления
  const g = 9.8

  // Состояние динамики
  const [running, setRunning] = useState(false)
  const xRef = useRef(0)   // координата (м)
  const vRef = useRef(0)   // скорость (м/с)
  const tRef = useRef(0)   // время (с)

  // Стрелки (чекпоинты): 0..180 м, фиксируют время и скорость при проезде
  const [points, setPoints] = useState([
    { id: 1, x: 40,  hitTime: null, hitSpeed: null, color: COLORS[0] },
    { id: 2, x: 80,  hitTime: null, hitSpeed: null, color: COLORS[1] },
    { id: 3, x: 120, hitTime: null, hitSpeed: null, color: COLORS[2] },
    { id: 4, x: 160, hitTime: null, hitSpeed: null, color: COLORS[3] },
  ])
  const pointsRef = useRef(points)
  useEffect(() => { pointsRef.current = points }, [points])

  // Текущие параметры в ref (чтобы rAF не зависел от state)
  const paramsRef = useRef({ gas, mass, cAir, mu })
  useEffect(() => { paramsRef.current = { gas, mass, cAir, mu } }, [gas, mass, cAir, mu])

  const dragState = useRef({ draggingId: null })
  const canvasRef = useRef(null)

  // PNG машины
  const carImgRef = useRef(null)
  useEffect(() => {
    const img = new Image()
    // Положите картинку в public/img/car.png
    img.src = `${import.meta.env.BASE_URL}img/car.png`
    img.onload = () => { carImgRef.current = img; draw() }
    img.onerror = () => { carImgRef.current = null }
  }, [])

  // Главный цикл (rAF)
  useEffect(() => {
    let raf = 0, prev = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - prev) / 1000, 1/20); prev = now
      if (running) integrate(dt)
      draw()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  function integrate(dt) {
    const { gas: gasVal, mass: mVal, cAir: kVal, mu: muVal } = paramsRef.current
    const throttle = Math.max(0, Math.min(120, gasVal)) / 100
    const Fmax = muVal * mVal * g
    const Freq = (throttle / 0.9) * Fmax    // при ~90% начинается срыв
    const Fdrive = Math.min(Freq, Fmax)

    const v = vRef.current
    const Fdrag = kVal * v * Math.abs(v)    // квадратичное сопротивление: k·v|v|
    const a = (Fdrive - Fdrag) / Math.max(1, mVal)

    vRef.current = v + a * dt
    xRef.current += vRef.current * dt
    tRef.current += dt

    // фиксируем время и скорость прохождения чекпоинтов
    setPoints(prev => {
      let changed = false
      const next = prev.map(p => {
        if (p.hitTime == null && xRef.current >= p.x) {
          changed = true
          return { ...p, hitTime: tRef.current, hitSpeed: vRef.current }
        }
        return p
      })
      return changed ? next : prev
    })
  }

  // Перевёрнутая стрелка (приподнята над дорогой)
  function drawArrowTop(ctx, x, y, color) {
    ctx.save(); ctx.translate(x, y)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, 10)
    ctx.lineTo(10, -14)
    ctx.lineTo(4, -14)
    ctx.lineTo(4, -30)
    ctx.lineTo(-4, -30)
    ctx.lineTo(-4, -14)
    ctx.lineTo(-10, -14)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const W = cv.width, H = cv.height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, W, H)

    const maxDist = 180
    const startXpx = 60
    const scale = (W - startXpx * 2) / maxDist
    const roadY = H - 50

    // дорога
    ctx.fillStyle = '#D6DCE5'; ctx.fillRect(0, roadY, W, 40)
    ctx.strokeStyle = '#ADB9CA'; ctx.setLineDash([12, 10])
    ctx.beginPath(); ctx.moveTo(0, roadY + 20); ctx.lineTo(W, roadY + 20); ctx.stroke(); ctx.setLineDash([])

    // стартовая метка
    ctx.fillStyle = '#8AA1B4'; ctx.fillRect(startXpx - 2, roadY - 30, 4, 30)

    // стрелки
    const arr = pointsRef.current.map(p => ({ ...p, xpx: startXpx + p.x * scale }))
    arr.forEach(p => drawArrowTop(ctx, p.xpx, roadY - 70, p.color))

    // авто
    const carX = startXpx + xRef.current * scale
    drawCar(ctx, carX, roadY)

    // секундомер мм:cc.д
    const m = Math.floor(tRef.current / 60)
    const s = Math.floor(tRef.current % 60)
    const d = Math.floor((tRef.current % 1) * 10)
    const pad = n => String(n).padStart(2, '0')
    ctx.fillStyle = '#222A35'; ctx.font = '16px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${pad(m)}:${pad(s)}.${d}`, 16, 24)

    // правый верх — боксы (координата, время, скорость)
    drawInfoBoxes(ctx, W, arr)
  }

  function drawCar(ctx, x, y) {
    const img = carImgRef?.current
    if (img && img.complete) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const scale = 1.0               // фиксированный масштаб PNG
      const w = img.width * scale
      const h = img.height * scale
      const offsetY = 40              // опустить ближе к дороге
      ctx.drawImage(img, x - w / 2, y - h + offsetY, w, h)
    } else {
      // резервный примитив
      ctx.fillStyle = '#44546A'
      ctx.fillRect(x - 60, y - 10, 120, 10)
      ctx.fillStyle = '#232A34'
      ctx.beginPath(); ctx.arc(x - 34, y, 12, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 34, y, 12, 0, Math.PI * 2); ctx.fill()
    }
  }

  function drawInfoBoxes(ctx, W, arr) {
    const boxW = 110, boxH = 56, gap = 8
    const totalW = arr.length * boxW + (arr.length - 1) * gap
    let x = Math.max(16, W - totalW - 16)
    const y = 8

    ctx.save()
    ctx.font = '12px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const p of arr) {
      const timeStr  = p.hitTime  == null ? '—' : `${p.hitTime.toFixed(2)} с`
      const distStr  = `${p.x.toFixed(1)} м`
      const speedStr = p.hitSpeed == null ? '—' : `${p.hitSpeed.toFixed(1)} м/с`
      ctx.strokeStyle = p.color
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, boxW, boxH)
      ctx.fillStyle = '#222A35'
      const cy = y + boxH / 2
      ctx.fillText(distStr,  x + boxW / 2, cy - 14) // координата
      ctx.fillText(timeStr,  x + boxW / 2, cy)      // время
      ctx.fillText(speedStr, x + boxW / 2, cy + 14) // скорость
      x += boxW + gap
    }
    ctx.restore()
  }

  // Перетаскивание стрелок
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return

    const onDown = e => {
      const { id } = pickArrow(e, cv); if (!id) return
      dragState.current.draggingId = id
      cv.setPointerCapture?.(e.pointerId)
    }
    const onMove = e => {
      const st = dragState.current; if (!st.draggingId) return
      const { xMeters } = pointerToMeters(e, cv)
      setPoints(prev => prev.map(p =>
        p.id === st.draggingId ? { ...p, x: clamp(xMeters, 0, 180) } : p
      ))
    }
    const onUp = e => { dragState.current.draggingId = null; cv.releasePointerCapture?.(e.pointerId) }

    cv.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      cv.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  function pickArrow(e, cv) {
    const { xpx, ypx } = pointerToPx(e, cv)
    const roadY = cv.height - 50
    const maxDist = 180
    const startXpx = 60
    const scale = (cv.width - startXpx * 2) / maxDist
    for (const p of pointsRef.current) {
      const ax = startXpx + p.x * scale, ay = roadY - 70
      if (Math.abs(xpx - ax) < 18 && Math.abs(ypx - ay) < 18) return { id: p.id }
    }
    return { id: null }
  }

  function pointerToPx(e, cv) {
    const r = cv.getBoundingClientRect()
    return { xpx: e.clientX - r.left, ypx: e.clientY - r.top }
  }

  function pointerToMeters(e, cv) {
    const { xpx } = pointerToPx(e, cv)
    const startXpx = 60, maxDist = 180
    const scale = (cv.width - startXpx * 2) / maxDist
    return { xMeters: (xpx - startXpx) / scale }
  }

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)) }

  function onStart() {
    setPoints(ps => ps.map(p => ({ ...p, hitTime: null, hitSpeed: null })))
    xRef.current = 0; vRef.current = 0; tRef.current = 0
    setRunning(true)
  }

  function onReset() {
    setRunning(false)
    xRef.current = 0; vRef.current = 0; tRef.current = 0
    setPoints(ps => ps.map(p => ({ ...p, hitTime: null, hitSpeed: null })))
  }

  return (
    <div>
      <div className="container">
        <h1 className="page-title">{t.title}</h1>
        <div className="panel" style={{ display: 'grid', gap: 12 }}>
          <ControlRow label={t.gas} value={gas} onChange={setGas} min={0} max={120} step={1} suffix="%" />
          <ControlRow label={t.mass} value={mass} onChange={setMass} min={600} max={3000} step={10} digits={0} suffix=" кг" />
          <ControlRow label={t.drag} value={cAir} onChange={setCAir} min={0} max={2} step={0.05} digits={2} />
          <ControlRow label={t.friction} value={mu} onChange={setMu} min={0} max={1} step={0.05} digits={2} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={onStart}>{t.start}</button>
            <button onClick={onReset}>{t.reset}</button>
          </div>
        </div>
        <canvas ref={canvasRef} className="canvas-frame" width={960} height={300} />
        <details className="panel" style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text)' }}>{t.helpTitle}</summary>
          <div style={{ padding: '8px 4px 4px', color: 'var(--text)' }}>
            <p><b>Модель:</b> m·dv/dt = F<sub>тяга</sub> − k·v|v|, где F<sub>тяга</sub> ≤ μ·m·g,
              а k = ½·ρ·C<sub>d</sub>·A — аэродинамический коэффициент (кг/м). Типично k≈0.3…0.6 для легкового авто.</p>
          </div>
        </details>
      </div>
    </div>
  )
}

function ControlRow({ label, value, onChange, min, max, step = 1, digits, suffix = '' }) {
  const fmt = typeof value === 'number'
    ? value.toFixed(digits ?? (String(step).includes('.') ? (String(step).split('.')[1]?.length || 1) : 0))
    : value
  return (
    <label className="control-row">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      <span className="value" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt}{suffix}</span>
    </label>
  )
}
