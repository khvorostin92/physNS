import { useEffect, useRef, useState } from 'react'

/**
 * Пружинный маятник с вязким сопротивлением и сухим трением.
 * m*x'' + c*x' + k*x + μ*m*g*sign(x') = 0
 * Интегратор: RK4. Учёт «прилипания» (статическое трение).
 * Снизу — график x(t) с постоянным масштабом: 0–60 c после отпускания.
 * Требования геометрии:
 *  - середина НЕрастянутой пружины смещена влево от центра холста на четверть её длины;
 *  - свободное место над энергополоской уменьшено вдвое (холст «обрезан» сверху).
 */
const TXT = {
  ru: {
    title:'Пружинный маятник — энергия',
    m:'Масса m (кг)', k:'Жёсткость k (Н/м)',
    c:'Сопротивление c (кг/с)', mu:'Коэф. сухого трения μ (безр.)',
    reset:'Сначала',
  },
  en: {
    title:'Spring–Mass — energy',
    m:'Mass m (kg)', k:'Stiffness k (N/m)',
    c:'Air drag c (kg/s)', mu:'Dry friction μ (—)',
    reset:'Reset',
  },
  sr: {
    title:'Опружно клатно — енергија',
    m:'Маса m (kg)', k:'Крутост k (N/m)',
    c:'Отпор c (kg/s)', mu:'Коеф. сувог трења μ',
    reset:'Почетак',
  },
}

export default function SpringEnergy({ lang='ru' }){
  const t = TXT[lang] || TXT.ru

  // === БАЗОВЫЕ РАЗМЕРЫ (до обрезки) ===
  const W = 960
  const H_BASE = 420

  // Параметры верхней сцены
  const pxPerM     = 220
  const massR      = 18
  const baseOffset = 300
  const stopHalfW  = 10

  // Геометрия до обрезки (чтобы найти исходный верхний отступ полоски)
  const railY0 = Math.round(H_BASE/2)
  const barY0  = Math.max(12, railY0 - 120) // где бы оказалась полоска без обрезки

  // Сколько "срезаем" сверху: половина исходного свободного места
  const TOP_CROP = Math.floor(barY0/2)

  // Итоговые параметры холста и вертикальный сдвиг сцены вверх
  const H      = H_BASE - TOP_CROP
  const yShift = -TOP_CROP

  // Рабочая геометрия с учётом обрезки
  const railY  = railY0 + yShift

  /**
   * Середина НЕрастянутой пружины смещена влево от центра холста на L0/4.
   * L0 — длина пружины (до кромки шарика) при x=0.
   */
  const midCenter  = Math.round(W/2)
  const L0         = (baseOffset - stopHalfW) - massR
  const midDesired = midCenter - L0/4
  const stopInnerX = midDesired - L0/2
  const anchorX    = stopInnerX - stopHalfW
  const eqX        = stopInnerX + L0 + massR

  // Геометрия графика (внизу, отталкиваемся от НОВОЙ высоты H)
  const PLOT_H   = 120
  const PLOT_TOP = H - PLOT_H - 10
  const PLOT_ML  = 40
  const PLOT_MR  = 16
  const plotX    = PLOT_ML
  const plotY    = PLOT_TOP
  const plotW    = W - PLOT_ML - PLOT_MR
  const plotH    = PLOT_H

  // Постоянный масштаб времени: 60 секунд после отпускания
  const TSPAN = 60

  // Параметры системы
  const g = 9.8
  const [m,  setM ] = useState(1.0)
  const [k,  setK ] = useState(50)
  const [c,  setC ] = useState(0.05)
  const [mu, setMu] = useState(0.10)

  // Состояние (в метрах и м/с)
  const stateRef  = useRef({ x: 0, v: 0 })
  const paramsRef = useRef({ m, k, c, mu, g })
  useEffect(()=>{ paramsRef.current={ m, k, c, mu, g } }, [m,k,c,mu])

  // Потери энергии
  const dissRef = useRef(0)

  // График
  const pointsRef   = useRef([])  // [{t, x}] — 0..60 c
  const tRef        = useRef(0)   // время графика
  const draggingRef = useRef(false)

  const canvasRef = useRef(null)

  // rAF
  useEffect(()=>{
    let raf=0, prev=performance.now()
    const tick=(now)=>{
      const dt=Math.min((now-prev)/1000, 1/20); prev=now

      if(!draggingRef.current){
        integrateRK4_withDryFriction(stateRef.current, dt, paramsRef.current, dissRef)
        // накопление графика в пределах 0..60 c
        tRef.current += dt
        if (tRef.current <= TSPAN + 1e-9){
          pointsRef.current.push({ t: tRef.current, x: stateRef.current.x })
        }
        if (pointsRef.current.length > 4000){
          pointsRef.current = pointsRef.current.filter(p => p.t <= TSPAN + 1e-9)
        }
      }

      draw(canvasRef.current, stateRef.current, paramsRef.current, dissRef.current, {
        // верхняя сцена
        W,H,railY,pxPerM,massR,eqX,stopInnerX,anchorX,stopHalfW,
        // график
        plotX, plotY, plotW, plotH, TSPAN, tGraph: tRef.current, points: pointsRef.current,
      })
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  }, [])

  // Перетаскивание: захватываем ИМЕННО за шарик; при захвате — чистим график/время
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return

    const hitMass = (e)=>{
      const r = cv.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const massX = eqX + stateRef.current.x*pxPerM
      const dx = mx - massX
      const dy = my - railY
      return (dx*dx + dy*dy) <= (massR+8)*(massR+8)
    }

    const down = (e)=>{
      if(!hitMass(e)) return
      draggingRef.current = true
      cv.setPointerCapture?.(e.pointerId)
      dissRef.current = 0
      // график начнётся с 0 ПОСЛЕ отпускания
      pointsRef.current = []
      tRef.current = 0
      // выставляем x по указателю
      setXFromPointer(e, cv, stateRef, {eqX, pxPerM})
    }

    const move = (e)=>{
      if(!draggingRef.current) return
      setXFromPointer(e, cv, stateRef, {eqX, pxPerM})
    }

    const up = (e)=>{
      if(!draggingRef.current) return
      draggingRef.current = false
      cv.releasePointerCapture?.(e.pointerId)
      // после отпускания начнётся накопление x(t) от t=0 до t=60
    }

    cv.addEventListener('pointerdown',down)
    window.addEventListener('pointermove',move)
    window.addEventListener('pointerup',up)
    return ()=>{ cv.removeEventListener('pointerdown',down); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up) }
  }, [eqX, railY])

  const reset = ()=>{
    stateRef.current.x = 0
    stateRef.current.v = 0
    dissRef.current = 0
    pointsRef.current = []
    tRef.current = 0
  }

  return (
    <div className="container">
      <h1 className="page-title">{t.title}</h1>

      <div className="panel" style={{ display:'grid', gap:12 }}>
        <Row label={t.m}  value={m}  onChange={v=>{ setM(v);  dissRef.current=0 }}  min={0.1} max={5}   step={0.1} digits={1}/>
        <Row label={t.k}  value={k}  onChange={v=>{ setK(v);  dissRef.current=0 }}  min={5}   max={200} step={1}   digits={0}/>
        <Row label={t.c}  value={c}  onChange={v=>{ setC(v);  dissRef.current=0 }}  min={0}   max={2}   step={0.01} digits={2}/>
        <Row label={t.mu} value={mu} onChange={v=>{ setMu(v); dissRef.current=0 }} min={0}   max={1}   step={0.01} digits={2}/>
        <div><button onClick={reset}>{t.reset}</button></div>
      </div>

      <canvas ref={canvasRef} className="canvas-frame" width={W} height={H}/>
    </div>
  )
}

/* ---------- UI helper ---------- */
function Row({ label, value, onChange, min, max, step=1, digits }){
  const fmt = typeof value==='number'
    ? value.toFixed(digits ?? (step<1 ? (String(step).split('.')[1]?.length||1) : 0))
    : value
  return (
    <label className="control-row">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={e=>onChange(Number(e.target.value))}/>
      <span className="value" style={{ fontVariantNumeric:'tabular-nums' }}>{fmt}</span>
    </label>
  )
}

/* ---------- ФИЗИКА: RK4 + сухое трение ---------- */
function integrateRK4_withDryFriction(state, dt, p, dissRef){
  let left=dt, hMax=1/240
  while(left>0){
    const h=Math.min(hMax,left)
    rk4StepDry(state, h, p)

    // «прилипание»: если v≈0 и |Fspring| ≤ μ m g — держим покой
    const Fspring = -p.k * state.x
    if (Math.abs(state.v) < 1e-4 && Math.abs(Fspring) <= p.mu * p.m * p.g){
      state.v = 0
    }
    // Потери: вязкость (c v^2) + сухое трение (μ m g |v|)
    dissRef.current += (p.c * state.v * state.v + p.mu * p.m * p.g * Math.abs(state.v)) * h
    left-=h
  }
}

function rk4StepDry(state, h, {m,k,c,mu,g}){
  const accel = (x,v)=>{
    const Fspring = -k*x
    // статическое трение (залипание)
    if (Math.abs(v) < 1e-4 && Math.abs(Fspring) <= mu*m*g) return 0
    const sgn = v>0 ? 1 : v<0 ? -1 : 0
    const Fvisc = -c*v
    const Fdry  = -mu*m*g*sgn
    return (Fspring + Fvisc + Fdry) / m
  }
  const f=([x,v])=>[ v, accel(x,v) ]

  const y=[state.x, state.v]
  const k1=f(y)
  const k2=f([y[0]+0.5*h*k1[0], y[1]+0.5*h*k1[1]])
  const k3=f([y[0]+0.5*h*k2[0], y[1]+0.5*h*k2[1]])
  const k4=f([y[0]+h*k3[0],     y[1]+h*k3[1]])
  state.x += (h/6)*(k1[0]+2*k2[0]+2*k3[0]+k4[0])
  state.v += (h/6)*(k1[1]+2*k2[1]+2*k3[1]+k4[1])

  // подавление дрожи возле нуля
  if (Math.abs(state.v) < 1e-5 && Math.abs(-k*state.x) <= mu*m*g){
    state.v = 0
  }
}

/* ---------- ОТРИСОВКА ---------- */
function draw(canvas, state, {m,k,g}, D, geo){
  if(!canvas) return
  const ctx=canvas.getContext('2d')
  const {
    W,H,railY,pxPerM,massR,eqX,stopInnerX,anchorX,stopHalfW,
    plotX, plotY, plotW, plotH, TSPAN, tGraph, points
  } = geo

  ctx.clearRect(0,0,W,H)
  ctx.fillStyle='#FFFFFF'
  ctx.fillRect(0,0,W,H)

  // === Верх: маятник + энергетическая полоска ===
  const x=state.x, v=state.v
  const U=0.5*k*x*x
  const K=0.5*m*v*v
  const total = Math.max(1e-12, U+K+D)

  // Полоска (U | K | D) — центр относительно текущей ширины; отступ считается от railY,
  // но railY уже с учётом обрезки -> итоговый верхний зазор = половина исходного
  const barW = Math.min(520, Math.floor(W*0.8))
  const barH = 16
  const barX = Math.round((W - barW)/2)
  const barY = Math.max(12, railY - 120)

  const wU=(U/total)*barW, wK=(K/total)*barW, wD=barW-(wU+wK)
  ctx.fillStyle='#F6F8FB'; ctx.fillRect(barX, barY, barW, barH)
  let cx=barX
  ctx.fillStyle='#232A34'; ctx.fillRect(cx,barY,wU,barH); cx+=wU
  ctx.fillStyle='#B1261B'; ctx.fillRect(cx,barY,wK,barH); cx+=wK
  ctx.fillStyle='#D7DCE4'; ctx.fillRect(cx,barY,wD,barH)

  // Левый упор
  ctx.fillStyle='#333F50'
  ctx.fillRect(anchorX - stopHalfW, railY - 30, stopHalfW*2, 60)

  // Пунктирная метка равновесия
  ctx.strokeStyle = '#C00000'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4])
  ctx.beginPath(); ctx.moveTo(eqX, railY - 36); ctx.lineTo(eqX, railY + 36); ctx.stroke(); ctx.setLineDash([])

  // Пружина до кромки груза
  const massX = eqX + x*pxPerM
  const springEnd = massX - massR
  drawSpringFixed(ctx, stopInnerX, railY, springEnd, railY, 12, 10)

  // Груз
  ctx.fillStyle = '#3B82F6'
  ctx.beginPath(); ctx.arc(massX, railY, massR, 0, Math.PI*2); ctx.fill()

  // === Низ: график x(t) с постоянным масштабом ===
  drawPlot(ctx, {plotX,plotY,plotW,plotH, TSPAN, tGraph, points})
}

function drawSpringFixed(ctx, x1, y1, x2, y2, coils = 12, amp = 10){
  const L = Math.max(20, x2 - x1)
  let straight = Math.min(32, L/4)
  const usable = Math.max(0, L - straight*2)
  const halfWaves = Math.max(2, coils * 2)
  const step = usable / halfWaves

  let x = x1
  ctx.strokeStyle = '#8497B0'
  ctx.lineWidth = Math.max(1, ctx.lineWidth)
  ctx.beginPath()
  ctx.moveTo(x, y1)
  x += straight
  ctx.lineTo(x, y1)

  for (let i = 0; i < halfWaves; i++) {
    const dir = i % 2 === 0 ? -1 : 1
    const nx = x + step
    const ny = y1 + dir * amp
    ctx.lineTo(nx, ny)
  x = nx
  }

  ctx.lineTo(x + straight, y1)
  ctx.stroke()
}

/* ---------- указатель/захват ---------- */
function setXFromPointer(e, canvas, stateRef, {eqX, pxPerM}){
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const targetXPx = x - eqX
  const xm = targetXPx / pxPerM
  stateRef.current.x = clampByHalfRange(xm)
  stateRef.current.v = 0
}
function halfRangeM(){
  // как в Spring.jsx: половина базового смещения
  const stopHalfW=10, baseOffset=300, pxPerM=220
  const pixels = (baseOffset - stopHalfW) * 0.5
  return pixels / pxPerM
}
function clampByHalfRange(xm){
  const hr=halfRangeM()
  return Math.max(-hr, Math.min(hr, xm))
}

/* ---------- рисование графика (постоянный масштаб) ---------- */
function drawPlot(ctx, {plotX,plotY,plotW,plotH, TSPAN, tGraph, points}){
  // рамка
  ctx.strokeStyle = '#E5E8EF'
  ctx.lineWidth = 1
  ctx.strokeRect(plotX, plotY, plotW, plotH)

  // горизонтальная ось x=0 (пунктир), без подписей
  const midY = plotY + Math.round(plotH/2)
  ctx.strokeStyle = '#ADB9CA'
  ctx.setLineDash([4,3])
  ctx.beginPath()
  ctx.moveTo(plotX, midY); ctx.lineTo(plotX+plotW, midY)
  ctx.stroke()
  ctx.setLineDash([])

  // вертикальная сетка по 10 секунд, без подписей
  ctx.strokeStyle = '#EEF1F6'
  ctx.lineWidth = 1
  ctx.setLineDash([4,3])
  for(let s=0; s<=TSPAN; s+=10){
    const tx = plotX + (s / TSPAN) * plotW
    ctx.beginPath(); ctx.moveTo(tx, plotY); ctx.lineTo(tx, plotY+plotH); ctx.stroke()
  }
  ctx.setLineDash([])

  // постоянный масштаб времени — 0..TSPAN
  const span = TSPAN
  const tMaxDraw = Math.min(tGraph, TSPAN)

  // постоянный масштаб по отклонению: ±halfRange
  const hr = halfRangeM()
  const yScale = (plotH*0.45) / hr

  // кривая x(t)
  ctx.beginPath()
  let moved=false
  for (let i=0; i<points.length; i++){
    const p = points[i]
    if (p.t < 0 || p.t > tMaxDraw) continue
    const tx = plotX + (p.t / span) * plotW
    const ty = midY - p.x * yScale
    if(!moved){ ctx.moveTo(tx, ty); moved=true } else { ctx.lineTo(tx, ty) }
  }
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 2
  ctx.stroke()
}
