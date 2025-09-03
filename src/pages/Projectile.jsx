import { useEffect, useRef, useState } from 'react'

const TXT = {
  ru: { title:'Математический маятник', angle:'Начальный угол (°)', L:'Длина L (м)', m:'Масса m (кг)', c:'Сопротивление c (кг/с)', g:'g (м/с²)', start:'Пуск', stop:'Стоп', reset:'Сначала' },
  en: { title:'Simple Pendulum', angle:'Initial Angle (°)', L:'Length L (m)', m:'Mass m (kg)', c:'Air drag c (kg/s)', g:'g (m/s²)', start:'Start', stop:'Stop', reset:'Reset' },
  sr: { title:'Математичко клатно', angle:'Почетни угао (°)', L:'Дужина L (m)', m:'Маса m (kg)', c:'Отпор c (kg/s)', g:'g (m/s²)', start:'Почетак', stop:'Стоп', reset:'Почетак' },
}

export default function Pendulum({ lang='ru' }) {
  const t = TXT[lang] || TXT.ru

  // Параметры модели
  const [theta0Deg, setTheta0Deg] = useState(20)
  const [L, setL] = useState(1.0)
  const [m, setM] = useState(1.0)
  const [c, setC] = useState(0.05)
  const [g, setG] = useState(9.8)

  // Состояние и таймер
  const stateRef = useRef({ theta: deg2rad(theta0Deg), omega: 0 })
  const [running, setRunning] = useState(false)
  const stopwatchRef = useRef(0)
  const [swRun, setSwRun] = useState(false)

  const paramsRef = useRef({ L, m, c, g })
  useEffect(()=>{ paramsRef.current = { L, m, c, g } }, [L,m,c,g])

  const runRef = useRef(running); useEffect(()=>{ runRef.current = running },[running])
  const swRef  = useRef(swRun);   useEffect(()=>{ swRef.current  = swRun },[swRun])

  const canvasRef = useRef(null)
  const dragRef = useRef(false)

  // rAF цикл
  useEffect(()=>{
    let raf=0, prev=performance.now()
    const tick=(now)=>{
      const dt=Math.min((now-prev)/1000, 1/15); prev=now
      if(swRef.current) stopwatchRef.current += dt
      if(runRef.current) integrateRK4(stateRef.current, dt, paramsRef.current)
      draw(canvasRef.current, stateRef.current, paramsRef.current, stopwatchRef.current)
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  },[])

  // Управление
  const start = ()=>{ setRunning(true); setSwRun(true) }
  const stopWatchOnly = ()=> setSwRun(false)
  const resetAll = ()=>{
    stateRef.current.theta = deg2rad(theta0Deg)
    stateRef.current.omega = 0
    stopwatchRef.current = 0
    setSwRun(false); setRunning(false)
  }
  const applyTheta0 = (deg)=>{ setTheta0Deg(deg); stateRef.current.theta=deg2rad(deg); stateRef.current.omega=0 }

  // Перетаскивание
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const down=e=>{ dragRef.current=true; cv.setPointerCapture?.(e.pointerId); updateAngleFromPointer(e,cv,stateRef) }
    const move=e=>{ if(!dragRef.current) return; updateAngleFromPointer(e,cv,stateRef) }
    const up  =e=>{ dragRef.current=false; cv.releasePointerCapture?.(e.pointerId) }
    cv.addEventListener('pointerdown',down); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up)
    return()=>{ cv.removeEventListener('pointerdown',down); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up) }
  },[])

  // подпись g (по 1-й десятичной)
  const gBody = bodyNameForG(g)

  return (
    <div>
      <h1 style={{ fontSize:28, margin:'8px 0 12px' }}>{t.title}</h1>

      <div className="panel" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Row label={t.angle} value={theta0Deg} onChange={v=>applyTheta0(v)} min={-80} max={80} step={1}/>
        <Row label={t.L}     value={L}        onChange={setL}     min={0.2} max={2.5}  step={0.01} digits={2}/>
        <Row label={t.m}     value={m}        onChange={setM}     min={0.1} max={5}  step={0.1}  digits={1}/>
        <Row label={t.c}     value={c}        onChange={setC}     min={0}   max={1}  step={0.01} digits={2}/>
        <label className="control-row">
          <span className="label">{t.g}</span>
          <input type="range" min={1} max={40} step={0.1} value={g} onChange={e=>setG(Number(e.target.value))}/>
          <span className="value">{g.toFixed(1)}{gBody?` (${gBody})`:''}</span>
        </label>

        <div style={{ display:'flex', gap:8 }}>
          <button className="primary" onClick={start}>{t.start}</button>
          <button onClick={stopWatchOnly}>{t.stop}</button>
          <button onClick={resetAll}>{t.reset}</button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={960} height={420}
        style={{ width:'100%', marginTop:12, border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'#fff', touchAction:'none' }}
      />
    </div>
  )
}

/* ---------- UI helper ---------- */
function Row({ label, value, onChange, min, max, step=1, digits }) {
  const fmt = typeof value==='number' ? value.toFixed(digits ?? (step<1 ? (String(step).split('.')[1]?.length||1) : 0)) : value
  return (
    <label className="control-row">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
      <span className="value" style={{ fontVariantNumeric:'tabular-nums' }}>{fmt}</span>
    </label>
  )
}

/* ---------- ФИЗИКА ---------- */
function integrateRK4(state, dt, params){ let left=dt, hMax=1/240; while(left>0){ const h=Math.min(hMax,left); rk4Step(state,h,params); left-=h } }
function rk4Step(state,h,{L,m,c,g}){
  const f=([th,om])=>[ om, -(g/L)*Math.sin(th) - (c/m)*om ]
  const y=[state.theta,state.omega]
  const k1=f(y)
  const k2=f([y[0]+0.5*h*k1[0], y[1]+0.5*h*k1[1]])
  const k3=f([y[0]+0.5*h*k2[0], y[1]+0.5*h*k2[1]])
  const k4=f([y[0]+h*k3[0],     y[1]+h*k3[1]])
  state.theta += (h/6)*(k1[0]+2*k2[0]+2*k3[0]+k4[0])
  state.omega += (h/6)*(k1[1]+2*k2[1]+2*k3[1]+k4[1])
}

/* ---------- РЕНДЕР (без контуров у фигур) ---------- */
function draw(canvas, state, { L }, tSec){
  if(!canvas) return; const ctx=canvas.getContext('2d'); const W=canvas.width, H=canvas.height
  // фон
  ctx.clearRect(0,0,W,H); ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,H)

  // геометрия
  const {pivotX,pivotY,pxPerM}=layout(); const th=state.theta
  const bobX=pivotX+pxPerM*L*Math.sin(th), bobY=pivotY+pxPerM*L*Math.cos(th)

  // подвес (малый квадрат — можно оставить без контура: просто fillRect)
  ctx.fillStyle='#333F50'; ctx.fillRect(pivotX-3,pivotY-3,6,6)

  // нить — это линия (не «фигура»), оставляем
  ctx.strokeStyle='#8497B0'; ctx.lineWidth=2
  ctx.beginPath(); ctx.moveTo(pivotX,pivotY); ctx.lineTo(bobX,bobY); ctx.stroke()

  // грузик — КРУГ БЕЗ КОНТУРА
  const r=6
  ctx.fillStyle='#44546A'  // спокойный синий
  ctx.beginPath(); ctx.arc(bobX,bobY,r,0,Math.PI*2); ctx.fill()

  // секундомер: «пончиковое» кольцо — только заливкой, без stroke
  drawStopwatchDonut(ctx, W-200, 190, 90, tSec)
  // цифровое время
  const m=Math.floor(tSec/60), s=Math.floor(tSec%60), tenths=Math.floor((tSec%1)*10)
  const pad2=n=>String(n).padStart(2,'0')
  ctx.fillStyle='#222A35'; ctx.font='14px Cambria, Georgia, serif'
  ctx.fillText(`${pad2(m)}:${pad2(s)}.${tenths}`, W-230, 190+90+22)
}

function layout(){ return { pivotX:220, pivotY:60, pxPerM:140 } }

/* пончиковый секундомер (без stroke у окружностей) + стрелка и засечки линиями */
function drawStopwatchDonut(ctx,cx,cy,R,tSec){
  ctx.save(); ctx.translate(cx,cy)
  // внешнее кольцо (donut)
  const outer=R, inner=R-14
  ctx.fillStyle='#F2F2F2'
  ctx.beginPath(); ctx.arc(0,0,outer,0,Math.PI*2); ctx.moveTo(inner,0); ctx.arc(0,0,inner,0,Math.PI*2,true); ctx.fill('evenodd')

  // засечки — линии
  ctx.strokeStyle='#ADB9CA'; ctx.lineWidth=2
  for(let i=0;i<60;i++){
    const a=(i/60)*Math.PI*2, r1=R- (i%5===0?12:6), r2=R-4
    ctx.beginPath(); ctx.moveTo(r1*Math.cos(a), r1*Math.sin(a)); ctx.lineTo(r2*Math.cos(a), r2*Math.sin(a)); ctx.stroke()
  }

  // стрелка
  const a=((tSec%60)/60)*Math.PI*2 - Math.PI/2
  ctx.strokeStyle='#C00000'; ctx.lineWidth=3
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo((R-18)*Math.cos(a),(R-18)*Math.sin(a)); ctx.stroke()

  // центр — маленький заполненный круг, БЕЗ контура
  ctx.fillStyle='#C00000'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill()
  ctx.restore()
}

/* ---------- Утилиты ---------- */
function deg2rad(d){ return d*Math.PI/180 }
function updateAngleFromPointer(e,canvas,stateRef){
  const r=canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top
  const {pivotX,pivotY}=layout(); const dx=x-pivotX, dy=y-pivotY
  let theta=Math.atan2(dx,dy); const clamp=170*Math.PI/180
  if(theta>clamp) theta=clamp; if(theta<-clamp) theta=-clamp
  stateRef.current.theta=theta; stateRef.current.omega=0
}
function bodyNameForG(g){
  const round1=x=>Math.round(x*10)/10, v=round1(g)
  const tbl=[ {name:'Луна',g:1.6},{name:'Меркурий',g:3.7},{name:'Марс',g:3.7},{name:'Венера',g:8.9},{name:'Уран',g:8.7},{name:'Земля',g:9.8},{name:'Сатурн',g:10.4},{name:'Нептун',g:11.2},{name:'Юпитер',g:24.8},{name:'Плутон',g:0.6} ]
  const hit=tbl.find(e=>round1(e.g)===v); return hit?hit.name:''
}
