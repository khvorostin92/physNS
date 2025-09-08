import { useEffect, useRef, useState } from 'react'

const UI = {
  ru: { title:'Нитяной маятник — энергия', m:'Масса m (кг)', L:'Длина L (м)', c:'Сопротивление c (кг/с)', reset:'Сначала' },
  en: { title:'Simple pendulum — energy bar', m:'Mass m (kg)', L:'Length L (m)', c:'Drag c (kg/s)', reset:'Reset' },
  sr: { title:'Математичко клатно — енергетска трака', m:'Маса m (kg)', L:'Дужина L (m)', c:'Отпор c (kg/s)', reset:'Почетак' },
}

// Цвета полоски слева→направо: U | K | D
const COLORS = { U:'#232A34', K:'#B1261B', D:'#D7DCE4' }

// Настройки холста и графика
const W = 960
const H = 546
const BAR_H = 16
const BAR_UP_OFFSET = 30      // полоска на ~30 px выше точки подвеса
const BASE_PX_PER_M = 120     // желаемый масштаб (уменьшаем при нехватке места)
const MIN_PIVOT_Y = 60        // минимальный отступ сверху до точки подвеса
const BOB_R = 12              // радиус шарика
const CLEAR_GAP = 16          // зазор между шариком и верхом области графика

// График θ(t)
const TSPAN = 60
const PLOT_H = 140
const PLOT_ML = 40
const PLOT_MR = 16
const PLOT_BOTTOM_PAD = 10

export default function PendulumEnergy({ lang='ru' }) {
  const t = UI[lang] || UI.ru

  // Параметры
  const g = 9.8
  const [m, setM] = useState(1.0)
  const [L, setL] = useState(1.0)     // до 4.0 м — на слайдере
  const [c, setC] = useState(0.05)
  const paramsRef = useRef({ m, L, c, g })
  useEffect(()=>{ paramsRef.current = { m, L, c, g } }, [m,L,c])

  // Состояние маятника
  const stateRef = useRef({ theta: 0, omega: 0 }) // равновесие при загрузке/сбросе
  const draggingRef = useRef(false)

  // Потери энергии
  const dissRef = useRef(0)

  // График θ(t)
  const pointsRef = useRef([]) // [{t, th}]
  const tRef      = useRef(0)

  const canvasRef = useRef(null)

  // rAF
  useEffect(()=>{
    let raf=0, prev=performance.now()
    const tick=(now)=>{
      const dt = Math.min((now - prev)/1000, 1/20); prev = now

      if (!draggingRef.current) {
        integrateRK4(stateRef.current, dt, paramsRef.current, dissRef)
        // копим θ(t) от 0 до 60 с после отпускания/сброса
        tRef.current += dt
        if (tRef.current <= TSPAN + 1e-9) pointsRef.current.push({ t: tRef.current, th: stateRef.current.theta })
        if (pointsRef.current.length > 4000) {
          pointsRef.current = pointsRef.current.filter(p => p.t <= TSPAN + 1e-9)
        }
      }

      draw(canvasRef.current, stateRef.current, paramsRef.current, dissRef.current, {
        // геометрия графика
        plotX: PLOT_ML,
        plotW: W - PLOT_ML - PLOT_MR,
        plotH: PLOT_H,
        plotY: H - PLOT_H - PLOT_BOTTOM_PAD,
        tGraph: tRef.current,
        points: pointsRef.current,
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  }, [])

  // Захват/перетаскивание: обнуляем потери и график при начале drag
  useEffect(()=>{
    const cv = canvasRef.current; if (!cv) return
    const down = (e)=>{
      draggingRef.current = true
      cv.setPointerCapture?.(e.pointerId)
      dissRef.current = 0
      pointsRef.current = []
      tRef.current = 0
      // угол от указателя
      updateAngleFromPointer(e, cv, stateRef, dynamicPivotAndScale(paramsRef.current.L))
    }
    const move = (e)=>{ if (draggingRef.current) updateAngleFromPointer(e, cv, stateRef, dynamicPivotAndScale(paramsRef.current.L)) }
    const up   = (e)=>{ if (!draggingRef.current) return; draggingRef.current=false; cv.releasePointerCapture?.(e.pointerId) }
    cv.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return ()=>{ cv.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])

  // Слайдеры: обнуляем потери и график
  const onSetM = (v)=>{ setM(v); resetD() }
  const onSetL = (v)=>{ setL(v); resetD() }
  const onSetC = (v)=>{ setC(v); resetD() }
  const resetD = ()=>{
    dissRef.current = 0
    pointsRef.current = []
    tRef.current = 0
  }

  // Сброс
  const reset = ()=>{
    stateRef.current.theta = 0
    stateRef.current.omega = 0
    dissRef.current = 0
    pointsRef.current = []
    tRef.current = 0
  }

  return (
    <div className="container">
      <h1 className="page-title">{t.title}</h1>

      <div className="panel" style={{ display:'grid', gap:12 }}>
        <Row label={t.m} value={m} min={0.1} max={5}   step={0.1}  digits={1} onChange={onSetM}/>
        <Row label={t.L} value={L} min={0.2} max={4.0} step={0.01} digits={2} onChange={onSetL}/>
        <Row label={t.c} value={c} min={0}   max={1}   step={0.01} digits={2} onChange={onSetC}/>
        <div><button onClick={reset}>{t.reset}</button></div>
      </div>

      <canvas ref={canvasRef} className="canvas-frame" width={W} height={H} />
    </div>
  )
}

/* ---------- UI helpers ---------- */
function Row({ label, value, onChange, min, max, step=1, digits }) {
  const fmt = typeof value==='number'
    ? value.toFixed(digits ?? (String(step).includes('.') ? String(step).split('.')[1].length : 0))
    : value
  return (
    <label className="control-row">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
      <span className="value" style={{ fontVariantNumeric:'tabular-nums' }}>{fmt}</span>
    </label>
  )
}

/* ---------- ФИЗИКА ---------- */
function integrateRK4(state, dt, { m, L, c, g }, dissRef){
  let left = dt
  const hMax = 1/240
  while (left > 0) {
    const h = Math.min(hMax, left)
    rk4Step(state, h, { m, L, c, g })
    const v_t = L * state.omega
    dissRef.current += c * v_t * v_t * h
    left -= h
  }
}
function rk4Step(state, h, { m, L, c, g }){
  const f = ([th, om]) => [ om, - (g/L) * Math.sin(th) - (c/(m*L)) * om ]
  const y = [state.theta, state.omega]
  const k1 = f(y)
  const k2 = f([ y[0] + 0.5*h*k1[0], y[1] + 0.5*h*k1[1] ])
  const k3 = f([ y[0] + 0.5*h*k2[0], y[1] + 0.5*h*k2[1] ])
  const k4 = f([ y[0] + h*k3[0],     y[1] + h*k3[1]     ])
  state.theta += (h/6)*(k1[0] + 2*k2[0] + 2*k3[0] + k4[0])
  state.omega += (h/6)*(k1[1] + 2*k2[1] + 2*k3[1] + k4[1])
}

/* ---------- РЕНДЕР ---------- */
function draw(canvas, state, { m, L, c, g }, D, geom){
  if(!canvas) return
  const ctx = canvas.getContext('2d')
  const { plotX, plotY, plotW, plotH, tGraph, points } = geom

  ctx.clearRect(0,0,W,H)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0,0,W,H)

  // === ДИН. ГЕОМЕТРИЯ БЕЗ ПЕРЕСЕЧЕНИЙ ===
  // У нас есть:
  //  - верх: точка подвеса на MIN_PIVOT_Y и полоска над ней,
  //  - низ: область графика от plotY до plotY+plotH,
  // Хотим вписать длину L так, чтобы bobY + BOB_R <= plotY - CLEAR_GAP.
  // Для этого уменьшаем pxPerM при необходимости.
  const available = (plotY - CLEAR_GAP - BOB_R) - MIN_PIVOT_Y
  const pxPerM = Math.max(10, Math.min(BASE_PX_PER_M, available / Math.max(L, 0.2)))
  const pivotX = Math.round(W / 2)
  const pivotY = MIN_PIVOT_Y

  // Энергии
  const th = state.theta
  const omega = state.omega
  const v = L * omega
  const K = 0.5 * m * v * v
  const U = m * g * L * (1 - Math.cos(th))
  const total = Math.max(1e-12, U + K + D)

  // Полоска (U | K | D), центр по ширине
  const barW = Math.min(520, Math.floor(W*0.8))
  const barX = Math.round(pivotX - barW/2)
  const barY = Math.max(8, pivotY - BAR_UP_OFFSET)
  const wU = (U/total) * barW
  const wK = (K/total) * barW
  const wD = barW - (wU + wK)

  ctx.fillStyle = '#F6F8FB'
  ctx.fillRect(barX, barY, barW, BAR_H)

  let cx = barX
  ctx.fillStyle = COLORS.U; ctx.fillRect(cx, barY, wU, BAR_H); cx += wU
  ctx.fillStyle = COLORS.K; ctx.fillRect(cx, barY, wK, BAR_H); cx += wK
  ctx.fillStyle = COLORS.D; ctx.fillRect(cx, barY, wD, BAR_H)

  // Маятник
  const bobX = pivotX + pxPerM * L * Math.sin(th)
  const bobY = pivotY + pxPerM * L * Math.cos(th)

  ctx.fillStyle = '#333F50'
  ctx.fillRect(pivotX-3, pivotY-3, 6, 6)

  ctx.strokeStyle = '#8497B0'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY); ctx.stroke()

  ctx.fillStyle = '#44546A'
  ctx.beginPath(); ctx.arc(bobX, bobY, BOB_R, 0, Math.PI*2); ctx.fill()

  // График θ(t)
  drawThetaPlot(ctx, { plotX, plotY, plotW, plotH, tGraph, points })
}

/* ---------- график θ(t) ---------- */
function drawThetaPlot(ctx, { plotX, plotY, plotW, plotH, tGraph, points }){
  // рамка
  ctx.strokeStyle = '#E5E8EF'
  ctx.lineWidth = 1
  ctx.strokeRect(plotX, plotY, plotW, plotH)

  // нулевая линия
  const midY = plotY + Math.round(plotH/2)
  ctx.strokeStyle = '#ADB9CA'
  ctx.setLineDash([4,3])
  ctx.beginPath(); ctx.moveTo(plotX, midY); ctx.lineTo(plotX+plotW, midY); ctx.stroke()
  ctx.setLineDash([])

  // вертикальная сетка по 10 c
  ctx.strokeStyle = '#EEF1F6'
  ctx.lineWidth = 1
  ctx.setLineDash([4,3])
  for(let s=0; s<=TSPAN; s+=10){
    const tx = plotX + (s / TSPAN) * plotW
    ctx.beginPath(); ctx.moveTo(tx, plotY); ctx.lineTo(tx, plotY+plotH); ctx.stroke()
  }
  ctx.setLineDash([])

  const tMax = Math.min(tGraph, TSPAN)
  const HALF_RANGE_TH = Math.PI/2
  const yScale = (plotH * 0.45) / HALF_RANGE_TH

  ctx.beginPath()
  let moved=false
  for (let i=0; i<points.length; i++){
    const p = points[i]
    if (p.t < 0 || p.t > tMax) continue
    const tx = plotX + (p.t / TSPAN) * plotW
    const ty = midY - p.th * yScale
    if (!moved){ ctx.moveTo(tx, ty); moved=true } else { ctx.lineTo(tx, ty) }
  }
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 2
  ctx.stroke()
}

/* ---------- указатель → угол ---------- */
function updateAngleFromPointer(e, canvas, stateRef, { pivotX, pivotY }){
  const r = canvas.getBoundingClientRect()
  const x = e.clientX - r.left
  const y = e.clientY - r.top
  const dx = x - pivotX
  const dy = y - pivotY
  let theta = Math.atan2(dx, dy)
  const clamp = 170 * Math.PI/180
  if (theta > clamp) theta = clamp
  if (theta < -clamp) theta = -clamp
  stateRef.current.theta = theta
  stateRef.current.omega = 0
}

/* ---------- утилита: текущая геометрия подвеса для обработки мыши ---------- */
function dynamicPivotAndScale(L){
  // вспомогательная функция для корректного пересчёта угла при drag
  const plotY = H - PLOT_H - PLOT_BOTTOM_PAD
  const available = (plotY - CLEAR_GAP - BOB_R) - MIN_PIVOT_Y
  const pxPerM = Math.max(10, Math.min(BASE_PX_PER_M, available / Math.max(L,0.2)))
  return { pivotX: Math.round(W/2), pivotY: MIN_PIVOT_Y, pxPerM }
}
