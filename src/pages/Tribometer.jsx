import { useEffect, useRef, useState } from 'react'

/* ===== визуальные/геометрические константы ===== */
const ROOF_LOAD_GAP = 4;   // отступ между рядами грузиков
const GATE_LIFT = 100;     // высота подъёма «головки» стрелки над дорогой
const STOP_X = 2.32;       // координата остановки симуляции (как в твоём файле)
const MAX_GATE = 2.3;      // максимум для стрелок (как в твоём файле)

/** Локализация */
const TXT = {
  ru: {
    title: 'Второй закон Ньютона',
    M: 'Масса тележки M (кг)',
    m: 'Масса грузика m (кг)',
    c: 'Сопр. воздуха c (Н·с/м)',
    start: 'Старт',
    reset: 'Сбросить',
    unit: 'м', // подпись единицы у стрелок
  },
  en: {
    title: "Newton's 2nd law",
    M: 'Cart mass M (kg)',
    m: 'Hanging mass m (kg)',
    c: 'Air drag c (N·s/m)',
    start: 'Start',
    reset: 'Reset',
    unit: 'm',
  },
  sr: {
    title: 'Њутнов други закон',
    M: 'Маса колицa M (kg)',
    m: 'Маса тегa m (kg)',
    c: 'Отпор ваздуха c (N·s/m)',
    start: 'Почетак',
    reset: 'Ресет',
    unit: 'm',
  },
}

export default function Tribometer({ lang='ru' }){
  const t = TXT[lang] || TXT.ru

  // Параметры модели (оставляю как было в присланном файле)
  const L = 2.49
  const [M, setM] = useState(1.5)
  const [m, setm] = useState(0.2)
  const [c, setC] = useState(0.05)
  const g = 9.8

  // Состояние
  const stateRef = useRef({ x: 0, v: 0 })
  const [running, setRunning] = useState(false)
  const runRef = useRef(running); useEffect(()=>{ runRef.current = running }, [running])

  // Секундомер (цифровой сверху)
  const [sw, setSw] = useState(0)
  const swRef = useRef(0);  useEffect(()=>{ swRef.current = sw }, [sw])
  const [swRun, setSwRun] = useState(false)
  const swRunRef = useRef(false); useEffect(()=>{ swRunRef.current = swRun }, [swRun])

  // Ворота
  const [gateA, setGateA] = useState(0.000001) // оставляю твое текущее минимальное значение
  const [gateB, setGateB] = useState(1.6)

  // Холст / dnd
  const canvasRef = useRef(null)
  const dragRef = useRef({ which: null })

  // Главный цикл
  useEffect(()=>{
    let raf=0, prev=performance.now()
    const tick=(now)=>{
      const dt = Math.min((now - prev)/1000, 1/15); prev = now
      if(runRef.current){
        const { x: xPrev } = stateRef.current
        integrateRK4_fixed(stateRef.current, dt, { M, m, c, g })
        // Границы по треку
        if(stateRef.current.x < 0){ stateRef.current.x = 0; stateRef.current.v = 0 }
        if(stateRef.current.x >= STOP_X){ stateRef.current.x = STOP_X; stateRef.current.v = 0; setRunning(false) }
        handleGates(xPrev, stateRef.current.x) // переключение секундомера по пересечению любой стрелки
      }
      if(swRunRef.current) setSw(swRef.current + dt)
      draw(canvasRef.current, stateRef.current, { L, M, m, c, g }, { gateA, gateB }, { sw: swRef.current, unit: t.unit })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  }, [L, M, m, c, gateA, gateB, t.unit])

  // ЛОГИКА ВОРОТ/ТАЙМЕРА
  function handleGates(x0, x1){
    const crossed = (gate)=> (x0 - gate) * (x1 - gate) <= 0 && x0 !== x1
    const passedA = crossed(gateA)
    const passedB = crossed(gateB)
    if(!(passedA || passedB)) return

    if(swRunRef.current){
      setSwRun(false); swRunRef.current = false
    } else {
      setSw(0); swRef.current = 0
      setSwRun(true); swRunRef.current = true
    }
  }

  // Кнопки
  const start = ()=>{
    setRunning(true)
    // Исключение: тележка на старте и хотя бы одна стрелка на 0.00 — часы запускаем сразу
    const atStart = Math.abs(stateRef.current.x) < 1e-9
    const gateAtZero = Math.abs(gateA) < 1e-9 || Math.abs(gateB) < 1e-9
    if(atStart && gateAtZero){
      setSw(0); swRef.current = 0
      setSwRun(true); swRunRef.current = true
    }
  }
  const reset = ()=>{
    stateRef.current.x = 0; stateRef.current.v = 0
    setRunning(false); setSw(0); setSwRun(false)
  }

  // Перетаскивание ворот (кламп до MAX_GATE; минимум > 0)
  useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return
    const onDown = (e)=>{
      const r=cv.getBoundingClientRect()
      const x=e.clientX-r.left, y=e.clientY-r.top
      const hit = hitGateAt(x,y, cv, { L, gateA, gateB })
      if(hit){ dragRef.current.which = hit; cv.setPointerCapture?.(e.pointerId) }
    }
    const onMove = (e)=>{
      const which = dragRef.current.which; if(!which) return
      const r=cv.getBoundingClientRect()
      const x=e.clientX - r.left
      const xm = Math.max(0.000001, Math.min(MAX_GATE, pxToMeters(x, cv, L)))
      if(which==='A') setGateA(xm); else setGateB(xm)
    }
    const onUp = (e)=>{ dragRef.current.which = null; canvasRef.current?.releasePointerCapture?.(e.pointerId) }
    cv.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return ()=>{
      cv.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [L, gateA, gateB])

  return (
    <div className="container">
      <h1 className="page-title">{t.title}</h1>

      <div className="panel" style={{ display:'grid', gap:12 }}>
        <Row label={t.M} value={M} onChange={setM} min={0.5} max={5.0} step={0.1} digits={1}/>
        <Row label={t.m} value={m} onChange={setm} min={0.05} max={2.0} step={0.05} digits={2}/>
        <Row label={t.c} value={c} onChange={setC} min={0.0} max={0.6} step={0.01} digits={2}/>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="primary" onClick={start}>{t.start}</button>
          <button onClick={reset}>{t.reset}</button>
        </div>
      </div>

      <canvas ref={canvasRef} className="canvas-frame" width={960} height={588} />
      {/* Блок с теорией полностью удалён */}
    </div>
  )
}

/* ---------- UI ---------- */
function Row({ label, value, onChange, min, max, step=1, digits=0 }) {
  const fmt = typeof value==='number' ? value.toFixed(digits) : value
  return (
    <label className="control-row">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
      <span className="value" style={{ fontVariantNumeric:'tabular-nums' }}>{fmt}</span>
    </label>
  )
}

/* ---------- ФИЗИКА (RK4, шаг 0.01с) ---------- */
function accel(v, { M, m, c, g }){ return (m*g - 2*c*v) / (M + m) }
function deriv([x, v], params){ return [ v, accel(v, params) ] }
function rk4Step(state, h, params){
  const y1 = [state.x, state.v]
  const k1 = deriv(y1, params)
  const y2 = [ y1[0] + 0.5*h*k1[0], y1[1] + 0.5*h*k1[1] ]
  const k2 = deriv(y2, params)
  const y3 = [ y1[0] + 0.5*h*k2[0], y1[1] + 0.5*h*k2[1] ]
  const k3 = deriv(y3, params)
  const y4 = [ y1[0] + h*k3[0],     y1[1] + h*k3[1] ]
  const k4 = deriv(y4, params)
  state.x += (h/6) * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0])
  state.v += (h/6) * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1])
}
function integrateRK4_fixed(state, dt, params){
  let left = dt
  const h = 0.01
  while(left > 0){
    rk4Step(state, Math.min(h, left), params)
    left -= h
  }
}

/* ---------- РЕНДЕР ---------- */
function draw(canvas, state, params, gates, stopwatch){
  if(!canvas) return
  const ctx = canvas.getContext('2d')
  const W=canvas.width, H=canvas.height

  // фон
  ctx.clearRect(0,0,W,H)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0,0,W,H)

  // секундомер ss.dd (сверху по центру)
  const sTot = stopwatch.sw
  const ss = Math.floor(sTot % 60), dd = Math.floor((sTot % 1) * 100)
  const pad2 = n => String(n).padStart(2,'0')
  ctx.fillStyle = '#222A35'
  ctx.font = '20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`${pad2(ss)}.${pad2(dd)}`, W/2, 26)

  // геометрия сцены
  const trackY = 200
  const leftPad = 50, rightPad = 90
  const trackX0 = leftPad, trackX1 = W - rightPad
  const pxPerM = (trackX1 - trackX0) / params.L

  // дорога
  ctx.strokeStyle = '#ADB9CA'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(trackX0, trackY); ctx.lineTo(trackX1, trackY); ctx.stroke()

  // тележка и колёса (нижний край колеса касается дороги)
  const cartW = 66, cartH = 30, wheelR = 8
  const cartX = trackX0 + state.x*pxPerM - cartW/2
  const cartY = (trackY - wheelR) - cartH
  ctx.fillStyle = '#44546A'
  roundRect(ctx, cartX, cartY, cartW, cartH, 6); ctx.fill()
  ctx.fillStyle = '#232A34'
  ctx.beginPath(); ctx.arc(cartX + cartW*0.28, trackY - wheelR, wheelR, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(cartX + cartW*0.72, trackY - wheelR, wheelR, 0, Math.PI*2); ctx.fill()

  // грузы на крыше: первый ряд чуть выше крыши тележки (eps ~2 px)
  const blocks = Math.max(0, Math.round((params.M - 1.0)/0.5))
  if (blocks > 0) {
    const bw=16, bh=10, gap=ROOF_LOAD_GAP
    const eps = 2
    const firstRowBy = cartY - eps - bh
    const maxPerRow = Math.max(1, Math.floor((cartW + gap) / (bw + gap)))
    const rows = Math.ceil(blocks / maxPerRow)
    for(let i=0;i<blocks;i++){
      const row = Math.floor(i / maxPerRow)
      const col = i % maxPerRow
      const countThisRow = (row === rows-1 && blocks % maxPerRow !== 0) ? (blocks % maxPerRow) : maxPerRow
      const totalW = countThisRow*bw + (countThisRow-1)*gap
      const startX = cartX + (cartW - totalW)/2
      const bx = startX + col*(bw+gap)
      const by = firstRowBy - row*(bh+gap)
      ctx.fillStyle = '#6A7A90'
      roundRect(ctx, bx, by, bw, bh, 2); ctx.fill()
    }
  }

  // шкив — чтобы левая ветвь нити была горизонтальной
  const pulleyR = 16
  const pulleyTopY = cartY + 6
  const pulleyX = trackX1
  const pulleyY = pulleyTopY + pulleyR
  ctx.fillStyle = '#E5E9F0'
  ctx.beginPath(); ctx.arc(pulleyX, pulleyY, pulleyR, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#8497B0'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(pulleyX, pulleyY, pulleyR, 0, Math.PI*2); ctx.stroke()

  // НИТЬ: слева горизонтально — от правого края тележки
  const ropeStartX = cartX + cartW
  const ropeStartY = pulleyTopY
  const pulleyRightX = pulleyX + pulleyR
  const pulleyRightY = pulleyY
  ctx.strokeStyle='#333F50'; ctx.lineWidth=2
  ctx.beginPath(); ctx.moveTo(ropeStartX, ropeStartY); ctx.lineTo(pulleyX, pulleyTopY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pulleyRightX, pulleyRightY); ctx.lineTo(pulleyRightX, pulleyRightY + 6); ctx.stroke()

  // подвес — «кирпичики», опускается пропорционально x
  const unit = 0.2
  const nH = Math.max(1, Math.round(params.m / unit))
  const hgGap = 4, hgW = 22, hgH = 14
  const hangerHeadY = pulleyRightY + 6
  const stackTopY = hangerHeadY + 10 + state.x*pxPerM
  for(let i=0;i<nH;i++){
    const y = stackTopY + i*(hgH + hgGap)
    ctx.fillStyle='#B1261B'
    roundRect(ctx, pulleyRightX - hgW/2, y, hgW, hgH, 4); ctx.fill()
  }
  ctx.beginPath(); ctx.moveTo(pulleyRightX, hangerHeadY); ctx.lineTo(pulleyRightX, stackTopY); ctx.stroke()

  // стрелки — без A/B, только координата (единица зависит от языка)
  drawGateArrow(ctx, metersToPx(gates.gateA, canvas, params.L), trackY, gates.gateA, stopwatch.unit)
  drawGateArrow(ctx, metersToPx(gates.gateB, canvas, params.L), trackY, gates.gateB, stopwatch.unit)

  // шкала
  ctx.fillStyle = '#5b6b7a'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'
  for(let xm=0; xm<=params.L+1e-9; xm+=0.5){
    const x = metersToPx(xm, canvas, params.L)
    ctx.fillRect(x, trackY+1, 1, 6)
    ctx.fillText(xm.toFixed(1), x-6, trackY+18)
  }
}

/* ---- стрелки ---- */
function drawGateArrow(ctx, x, trackY, xMeters, unit){
  const color = '#C00000'
  ctx.save(); ctx.translate(x, trackY - GATE_LIFT)
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
  ctx.fillStyle = color
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(`${xMeters.toFixed(2)} ${unit}`, 0, -38)
  ctx.restore()
}

function hitGateAt(pxX, pxY, canvas, { L, gateA, gateB }){
  const trackY = 200
  const ax = metersToPx(gateA, canvas, L)
  const bx = metersToPx(gateB, canvas, L)
  const headY = trackY - GATE_LIFT - 14
  const near = (px, py, gx)=> (Math.abs(px-gx) < 18 && Math.abs(py - headY) < 18)
  if(near(pxX, pxY, ax)) return 'A'
  if(near(pxX, pxY, bx)) return 'B'
  return null
}

/* ---- утилиты ---- */
function metersToPx(xm, canvas, L){ const x0=50, x1=canvas.width-90; return x0 + xm*((x1-x0)/L) }
function pxToMeters(px, canvas, L){ const x0=50, x1=canvas.width-90; return (px - x0)/((x1-x0)/L) }
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath()
  ctx.moveTo(x+r, y)
  ctx.arcTo(x+w, y,   x+w, y+h, r)
  ctx.arcTo(x+w, y+h, x,   y+h, r)
  ctx.arcTo(x,   y+h, x,   y,   r)
  ctx.arcTo(x,   y,   x+w, y,   r)
  ctx.closePath()
}
