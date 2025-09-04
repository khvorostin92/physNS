import { useEffect, useRef, useState } from 'react'

/**
 * Горизонтальный осциллятор: m * x'' + c * x' + k * x = 0
 * x — смещение в МЕТРАХ (в UI задаём сантиметрами). RK4. Перетаскивание задаёт x (v=0).
 * Фигуры — без контура.
 */
const TXT = {
  ru: {
    title:'Пружинный маятник',
    disp:'Отклонение (см)', k:'Жёсткость k (Н/м)', m:'Масса m (кг)', c:'Сопротивление c (кг/с)',
    start:'Пуск', stop:'Стоп', reset:'Сначала',
    helpTitle:'Теория', qTitle:'Вопросы',
  },
  en: {
    title:'Spring–Mass Oscillator',
    disp:'Displacement (cm)', k:'Stiffness k (N/m)', m:'Mass m (kg)', c:'Air drag c (kg/s)',
    start:'Start', stop:'Stop', reset:'Reset',
    helpTitle:'Theory', qTitle:'Questions',
  },
  sr: {
    title:'Опружно клатно',
    disp:'Померај (cm)', k:'Крутост k (N/m)', m:'Маса m (kg)', c:'Отпор c (kg/s)',
    start:'Почетак', stop:'Стоп', reset:'Почетак',
    helpTitle:'Теорија', qTitle:'Питања',
  },
}

const Term = ({children}) => <span style={{color:'#C00000', fontWeight:700}}>{children}</span>

const HELP = {
  sr: [
    <p key="sr1"><Term>Осцилаторно кретање</Term> је периодично кретање тела око равнотежног положаја.
      <br/><Term>Осцилатор</Term> је тело које може да осцилује.
      <br/><Term>Осцилација</Term> је сегмент осцилаторног кретања који се понавља на исти или врло сличан начин.</p>,
    <p key="sr2"><Term>Елонгација</Term> је било која удаљеност осцилатора од равнотежног положаја.
      <br/><Term>Амплитуда</Term> је највећа елонгација.</p>,
    <p key="sr3"><Term>Период осциловања T</Term> је време за које осцилатор изврши једну осцилацију.
      <br/><Term>Фреквенција f</Term> је број осцилација које осцилатор изврши у јединици времена (СИ: Hz).</p>,
  ],
  ru: [
    <p key="ru1"><Term>Колебательное движение</Term> — это периодическое движение тела около положения равновесия.
      <br/><Term>Осциллятор</Term> — это тело, которое может совершать колебания.
      <br/><Term>Колебание</Term> — это участок колебательного движения, который повторяется одинаковым или очень похожим образом.</p>,
    <p key="ru2"><Term>Элонгация</Term> — любое отклонение осциллятора от положения равновесия.
      <br/><Term>Амплитуда</Term> — это наибольшая элонгация.</p>,
    <p key="ru3"><Term>Период колебаний T</Term> — это время, за которое осциллятор совершает одно колебание.
      <br/><Term>Частота f</Term> — это количество колебаний в единицу времени (СИ: Hz).</p>,
  ],
  en: [
    <p key="en1"><Term>Oscillatory motion</Term> is a periodic motion of a body around its equilibrium position.
      <br/>An <Term>oscillator</Term> is a body that can oscillate.
      <br/>An <Term>oscillation</Term> is a segment of oscillatory motion that repeats in the same or a very similar way.</p>,
    <p key="en2"><Term>Elongation</Term> is any displacement of the oscillator from equilibrium.
      <br/><Term>Amplitude</Term> is the maximum elongation.</p>,
    <p key="en3"><Term>Period T</Term> is the time it takes the oscillator to complete one oscillation.
      <br/><Term>Frequency f</Term> is the number of oscillations per unit time (SI: Hz).</p>,
  ],
}

const QA = {
  ru: [
    'Как измерить период колебаний? Как, зная период колебаний, определить частоту?',
    'Как измерить частоту колебаний? Как, зная частоту колебаний, определить период?',
    'Зависит ли период малых колебаний пружинного маятника от амплитуды?',
    'Зависит ли период малых колебаний пружинного маятника от массы маятника? Как нужно изменить массу маятника, чтобы его период увеличился в 2 раза? А в 3 раза?',
    'Зависит ли период малых колебаний пружинного маятника от жёсткости пружины? Как нужно изменить жёсткость пружины, чтобы период колебаний маятника уменьшился в 2 раза? А в 3 раза?',
    'Предположите формулу, по которой можно рассчитать период малых колебаний пружинного маятника через его параметры.',
  ],
  sr: [
    'Како измерити период осцилација? Како, знајући период, одредити фреквенцију?',
    'Како измерити фреквенцију осцилација? Како, знајући фреквенцију, одредити период?',
    'Да ли период малих осцилација опружног клатна зависи од амплитуде?',
    'Да ли период малих осцилација опружног клатна зависи од масе клатна? Како треба променити масу клатна да би се његов период увећао 2 пута? А 3 пута?',
    'Да ли период малих осцилација опружног клатна зависи од крутости опруге? Како треба променити крутост опруге да би се период клатна смањио 2 пута? А 3 пута?',
    'Претпоставите формулу по којој се може израчунати период малих осцилација опружног клатна преко његових параметара.',
  ],
  en: [
    'How can the period of oscillations be measured? How, knowing the period, can the frequency be determined?',
    'How can the frequency of oscillations be measured? How, knowing the frequency, can the period be determined?',
    'Does the period of small oscillations of a spring pendulum depend on the amplitude?',
    'Does the period of small oscillations of a spring pendulum depend on the mass of the pendulum? How should the mass be changed so that its period increases 2 times? 3 times?',
    'Does the period of small oscillations of a spring pendulum depend on the stiffness of the spring? How should the stiffness be changed so that the period decreases 2 times? 3 times?',
    'Suggest a formula by which the period of small oscillations of a spring pendulum can be calculated using its parameters.',
  ],
}

export default function Spring({ lang='ru' }){
  const t = TXT[lang] || TXT.ru

  // параметры
  const [dispCm, setDispCm] = useState(10)
  const [k, setK] = useState(50)
  const [m, setM] = useState(1.0)
  const [c, setC] = useState(0.05)

  // состояние в метрах
  const stateRef = useRef({ x: dispCm/100, v: 0 })

  // запуск/секундомер
  const [running, setRunning] = useState(false)
  const [swRun, setSwRun] = useState(false)
  const swRef = useRef(0)

  const paramsRef = useRef({ k, m, c })
  useEffect(() => { paramsRef.current = { k, m, c } }, [k,m,c])
  const runRef   = useRef(running); useEffect(()=>{ runRef.current=running }, [running])
  const swRunRef = useRef(swRun);   useEffect(()=>{ swRunRef.current=swRun }, [swRun])

  const canvasRef = useRef(null)
  const dragRef = useRef(false)

  // rAF
  useEffect(() => {
    let raf=0, prev=performance.now()
    const tick = (now)=>{
      const dt=Math.min((now-prev)/1000, 1/15); prev=now
      if(swRunRef.current) swRef.current += dt
      if(runRef.current) integrateRK4(stateRef.current, dt, paramsRef.current)
      draw(canvasRef.current, stateRef.current, swRef.current)
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  }, [])

  // кнопки
  const start = ()=>{ setRunning(true); setSwRun(true) }
  const stopWatchOnly = ()=> setSwRun(false)
  const resetAll = ()=>{
    stateRef.current.x = clampByHalfRange(dispCm/100)
    stateRef.current.v = 0
    swRef.current = 0
    setRunning(false); setSwRun(false)
  }
  const applyDispCm = (cm)=>{
    setDispCm(cm)
    stateRef.current.x = clampByHalfRange(cm/100)
    stateRef.current.v = 0
  }

  // перетаскивание
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const down=e=>{ dragRef.current=true; cv.setPointerCapture?.(e.pointerId); setXFromPointer(e,cv,stateRef) }
    const move=e=>{ if(!dragRef.current) return; setXFromPointer(e,cv,stateRef) }
    const up  =e=>{ dragRef.current=false; cv.releasePointerCapture?.(e.pointerId) }
    cv.addEventListener('pointerdown',down); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up)
    return()=>{ cv.removeEventListener('pointerdown',down); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up) }
  },[])

  return (
    <div>
      <div className="container">
        <h1 className="page-title">{t.title}</h1>

        <div className="panel" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Row label={t.disp} value={dispCm} onChange={applyDispCm} min={-50} max={50} step={1} digits={0}/>
          <Row label={t.k}    value={k}      onChange={setK}       min={5}   max={200} step={1} digits={0}/>
          <Row label={t.m}    value={m}      onChange={setM}       min={0.1} max={5}   step={0.1} digits={1}/>
          <Row label={t.c}    value={c}      onChange={setC}       min={0}   max={2}   step={0.01} digits={2}/>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="primary" onClick={start}>{t.start}</button>
            <button onClick={stopWatchOnly}>{t.stop}</button>
            <button onClick={resetAll}>{t.reset}</button>
          </div>
        </div>

        <canvas ref={canvasRef} className="canvas-frame" width={960} height={420} />

        <div style={{ marginTop:16, display:'grid', gap:12 }}>
          <details className="panel">
            <summary style={{cursor:'pointer', fontWeight:700, color:'var(--text)'}}>{TXT[lang]?.helpTitle || TXT.ru.helpTitle}</summary>
            <div style={{ padding:'8px 4px 4px' }}>
              {(HELP[lang] || HELP.ru).map((el, i)=>(
                <div key={i} style={{ margin:'8px 0' }}>{el}</div>
              ))}
            </div>
          </details>

          <div className="panel">
            <div style={{ fontSize:18, marginBottom:8 }}>{TXT[lang]?.qTitle || TXT.ru.qTitle}</div>
            <ol style={{ paddingLeft:'1.2em', margin:'6px 0', display:'grid', gap:6 }}>
              {(QA[lang] || QA.ru).map((q,i)=>(
                <li key={i} style={{ color:'var(--text)' }}>{q}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
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

/* ---------- Физика ---------- */
function integrateRK4(state, dt, params){ let left=dt, hMax=1/240; while(left>0){ const h=Math.min(hMax,left); rk4Step(state,h,params); left-=h } }
function rk4Step(state,h,{k,m,c}){
  const f=([x,v])=>[ v, -(k/m)*x - (c/m)*v ]
  const y=[state.x,state.v]
  const k1=f(y)
  const k2=f([y[0]+0.5*h*k1[0], y[1]+0.5*h*k1[1]])
  const k3=f([y[0]+0.5*h*k2[0], y[1]+0.5*h*k2[1]])
  const k4=f([y[0]+h*k3[0],     y[1]+h*k3[1]])
  state.x += (h/6)*(k1[0]+2*k2[0]+2*k3[0]+k4[0])
  state.v += (h/6)*(k1[1]+2*k2[1]+2*k3[1]+k4[1])
}

/* ---------- Геометрия и отрисовка ---------- */
function draw(canvas, state, tSec){
  if(!canvas) return; const ctx=canvas.getContext('2d')
  const W = canvas.width, H = canvas.height

  ctx.clearRect(0,0,W,H); ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,H)

  // центр по высоте
  const railY     = Math.round(H/2)
  const anchorX   = 140
  const stopHalfW = 10
  const baseOffset= 300
  const pxPerM    = 220
  const massR     = 18

  const stopInnerX = anchorX + stopHalfW
  const eqX = stopInnerX + (baseOffset - stopHalfW)

  const xPx = state.x * pxPerM
  const massX = eqX + xPx
  const massY = railY

  // Левый упор
  ctx.fillStyle='#333F50'
  ctx.fillRect(anchorX - stopHalfW, railY - 30, stopHalfW*2, 60)

  // Метка равновесия
  ctx.strokeStyle = '#C00000'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4])
  ctx.beginPath(); ctx.moveTo(eqX, railY - 36); ctx.lineTo(eqX, railY + 36); ctx.stroke(); ctx.setLineDash([])

  // Пружина (фикс. число витков), до кромки груза
  const springEnd = massX - massR
  drawSpringFixed(ctx, stopInnerX, railY, springEnd, railY, 12, 10)

  // Масса
  ctx.fillStyle = '#3B82F6'
  ctx.beginPath(); ctx.arc(massX, massY, massR, 0, Math.PI*2); ctx.fill()

  // Секундомер — по центру правой трети
  const swCX = Math.round((5*W)/6)
  const swCY = Math.round(H/2)
  const swR  = 90
  drawStopwatchDonut(ctx, swCX, swCY, swR, tSec)
  const mnt=Math.floor(tSec/60), scc=Math.floor(tSec%60), tenths=Math.floor((tSec%1)*10)
  const pad2=n=>String(n).padStart(2,'0')
  ctx.fillStyle='#222A35'; ctx.font='14px Cambria, Georgia, serif'
  ctx.fillText(`${pad2(mnt)}:${pad2(scc)}.${tenths}`, swCX - 30, swCY + swR + 22)
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

function drawStopwatchDonut(ctx,cx,cy,R,tSec){
  ctx.save(); ctx.translate(cx,cy)
  const outer=R, inner=R-14
  ctx.fillStyle='#F2F2F2'
  ctx.beginPath(); ctx.arc(0,0,outer,0,Math.PI*2); ctx.moveTo(inner,0); ctx.arc(0,0,inner,0,Math.PI*2,true); ctx.fill('evenodd')

  ctx.strokeStyle='#ADB9CA'; ctx.lineWidth=2
  for(let i=0;i<60;i++){
    const a=(i/60)*Math.PI*2, r1=R-(i%5===0?12:6), r2=R-4
    ctx.beginPath(); ctx.moveTo(r1*Math.cos(a), r1*Math.sin(a)); ctx.lineTo(r2*Math.cos(a), r2*Math.sin(a)); ctx.stroke()
  }

  const a=((tSec%60)/60)*Math.PI*2 - Math.PI/2
  ctx.strokeStyle='#C00000'; ctx.lineWidth=3
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo((R-18)*Math.cos(a),(R-18)*Math.sin(a)); ctx.stroke()

  ctx.fillStyle='#C00000'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill()
  ctx.restore()
}

/* ----- Ограничение диапазона и указатель ----- */
function halfRangeM(){
  const { stopHalfW, baseOffset, pxPerM } = { stopHalfW:10, baseOffset:300, pxPerM:220 }
  const pixels = (baseOffset - stopHalfW) * 0.5
  return pixels / pxPerM
}
function clampByHalfRange(xm){
  const hr = halfRangeM()
  return Math.max(-hr, Math.min(hr, xm))
}
function setXFromPointer(e, canvas, stateRef){
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left

  const anchorX   = 140
  const stopHalfW = 10
  const baseOffset= 300
  const pxPerM    = 220

  const stopInnerX = anchorX + stopHalfW
  const eqX = stopInnerX + (baseOffset - stopHalfW)

  const targetXPx = x - eqX
  const xm = targetXPx / pxPerM
  stateRef.current.x = clampByHalfRange(xm)
  stateRef.current.v = 0
}
