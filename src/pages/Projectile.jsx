import { useEffect, useRef, useState } from 'react'

const TXT = {
  ru: {
    title:'Математический маятник',
    angle:'Начальный угол (°)', L:'Длина L (м)', m:'Масса m (кг)', c:'Сопротивление c (кг/с)', g:'g (м/с²)',
    start:'Пуск', stop:'Стоп', reset:'Сначала',
    helpTitle:'Теория', qTitle:'Вопросы'
  },
  en: {
    title:'Simple Pendulum',
    angle:'Initial Angle (°)', L:'Length L (m)', m:'Mass m (kg)', c:'Air drag c (kg/s)', g:'g (m/s²)',
    start:'Start', stop:'Stop', reset:'Reset',
    helpTitle:'Theory', qTitle:'Questions'
  },
  sr: {
    title:'Математичко клатно',
    angle:'Почетни угао (°)', L:'Дужина L (m)', m:'Маса m (kg)', c:'Отпор c (kg/s)', g:'g (m/s²)',
    start:'Почетак', stop:'Стоп', reset:'Почетак',
    helpTitle:'Теорија', qTitle:'Питања'
  },
}

const term = (txt)=><span style={{color:'#C00000',fontWeight:700}}>{txt}</span>
const HELP = {
  sr: [
    <p key="sr1">{term('Осцилаторно кретање')} је периодично кретање тела око равнотежног положаја. {term('Осцилатор')} је тело које може да осцилује. {term('Осцилација')} је сегмент осцилаторног кретања који се понавља на исти или врло сличан начин.</p>,
    <p key="sr2">{term('Елонгација')} је било која удаљеност од равнотежног положаја. {term('Амплитуда')} је највећа елонгација.</p>,
    <p key="sr3">{term('Период осциловања T')} — време једне осцилације. {term('Фреквенција f')} — број осцилација у јединици времена (SI: Hz).</p>,
    <p key="sr4">{term('Математичко клатно')} — тело занемарљивих димензија на лаком и нерастегљивом концу.</p>,
  ],
  ru: [
    <p key="ru1">{term('Колебательное движение')} — периодическое движение около равновесия. {term('Осциллятор')} — тело, способное колебаться. {term('Колебание')} — повторяющийся участок движения.</p>,
    <p key="ru2">{term('Элонгация')} — отклонение от равновесия. {term('Амплитуда')} — максимальная элонгация.</p>,
    <p key="ru3">{term('Период T')} — время одного колебания. {term('Частота f')} — число колебаний в единицу времени (СИ: Hz).</p>,
    <p key="ru4">{term('Математический маятник')} — тело пренебрежимо малых размеров на лёгкой нерастяжимой нити.</p>,
  ],
  en: [
    <p key="en1">{term('Oscillatory motion')} is periodic motion around equilibrium. {term('Oscillator')} can oscillate. {term('Oscillation')} repeats similarly.</p>,
    <p key="en2">{term('Elongation')} is any displacement. {term('Amplitude')} is the maximum elongation.</p>,
    <p key="en3">{term('Period T')} — time for one oscillation. {term('Frequency f')} — oscillations per unit time (SI: Hz).</p>,
    <p key="en4">{term('Simple pendulum')} — negligible body on a light inextensible string.</p>,
  ],
}
const QA = {
  ru: [
'Как измерить период колебаний? Как, зная период колебаний, определить частоту?',
'Как измерить частоту колебаний? Как, зная частоту колебаний, определить период?',
'Зависит ли период малых колебаний математического маятника от амплитуды?',
'Зависит ли период малых колебаний математического маятника от массы маятника?',
'Зависит ли период малых колебаний математического маятника от длины маятника? Как нужно изменить длину маятника, чтобы его период увеличился в 2 раза? А в 3 раза?',
'Зависит ли период малых колебаний математического маятника от ускорения свободного падения? Как нужно изменить ускорение свободного падения, чтобы период уменьшился в 2 раза? А в 3 раза?',
'Предположите формулу, по которой можно рассчитать период малых колебаний математического маятника через его параметры.',
  ],
  sr: [
'Како измерити период осцилација? Како, знајући период, одредити фреквенцију?',
'Како измерити фреквенцију осцилација? Како, знајући фреквенцију, одредити период?',
'Да ли период малих осцилација математичког клатна зависи од амплитуде?',
'Да ли период малих осцилација математичког клатна зависи од масе клатна?',
'Да ли период малих осцилација математичког клатна зависи од дужине клатна? Како треба променити дужину клатна да би се период увећао 2 пута? А 3 пута?',
'Да ли период малих осцилација математичког клатна зависи од убрзања слободног пада? Како треба променити убрзање слободног пада да би се период смањио 2 пута? А 3 пута?',
'Претпоставите формулу по којој се може израчунати период малих осцилација математичког клатна преко његових параметара.',
  ],
  en: [
'How can the period be measured? How, knowing the period, determine the frequency?',
'How can the frequency be measured? How, knowing the frequency, determine the period?',
'Does the period of small oscillations depend on amplitude?',
'Does the period of small oscillations depend on mass?',
'Does the period of small oscillations depend on length? How to change the length to make the period 2× or 3× longer?',
'Does the period of small oscillations depend on gravity g? How to change g so that the period becomes 2× or 3× smaller?',
'Suggest a formula for the period of small oscillations via the pendulum parameters.',
  ],
}

export default function Pendulum({ lang='ru' }) {
  const t = TXT[lang] || TXT.ru

  // параметры
  const [theta0Deg, setTheta0Deg] = useState(20)
  const [L, setL] = useState(1.0)
  const [m, setM] = useState(1.0)
  const [c, setC] = useState(0.05)
  const [g, setG] = useState(9.8)

  // состояние и таймер
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

  // rAF
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

  // кнопки
  const start = ()=>{ setRunning(true); setSwRun(true) }
  const stopWatchOnly = ()=> setSwRun(false)
  const resetAll = ()=>{
    stateRef.current.theta = deg2rad(theta0Deg)
    stateRef.current.omega = 0
    stopwatchRef.current = 0
    setSwRun(false); setRunning(false)
  }
  const applyTheta0 = (deg)=>{ setTheta0Deg(deg); stateRef.current.theta=deg2rad(deg); stateRef.current.omega=0 }

  // перетаскивание
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const down=e=>{ dragRef.current=true; cv.setPointerCapture?.(e.pointerId); updateAngleFromPointer(e,cv,stateRef) }
    const move=e=>{ if(!dragRef.current) return; updateAngleFromPointer(e,cv,stateRef) }
    const up  =e=>{ dragRef.current=false; cv.releasePointerCapture?.(e.pointerId) }
    cv.addEventListener('pointerdown',down); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up)
    return()=>{ cv.removeEventListener('pointerdown',down); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up) }
  },[])

  const gBody = bodyNameForG(g)

  return (
    <div>
      <div className="container">
        <h1 className="page-title">{t.title}</h1>

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

        <canvas ref={canvasRef} className="canvas-frame" width={960} height={420} />

        <div style={{ marginTop:16, display:'grid', gap:12 }}>
          <details className="panel">
            <summary style={{cursor:'pointer', fontWeight:700, color:'var(--text)'}}>{t.helpTitle}</summary>
            <div style={{ padding:'8px 4px 4px' }}>
              {(HELP[lang] || HELP.ru).map((el, i)=>(
                <div key={i} style={{ margin:'8px 0' }}>{el}</div>
              ))}
            </div>
          </details>

          <div className="panel">
            <div style={{ fontSize:18, marginBottom:8 }}>{t.qTitle}</div>
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

/* ---------- helpers ---------- */
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

/* ---------- физика ---------- */
function integrateRK4(state, dt, params){ let left=dt, hMax=1/240; while(left>0){ const h=Math.min(hMax,left); rk4Step(state,h,params); left-=h } }
function rk4Step(state,h,{L,m,c,g}){
  const f=([th,om])=>[ om, -(g/L)*Math.sin(th) - (c/m)*om ]
  const y=[state.theta,state.omega]
  const k1=f(y)
  const k2=f([y[0]+0.5*h*k1[0], y[1]+0.5*h*k1[1]])
  const k3=f([y[0]+0.5*h*k2[0], y[1]+0.5*h+k2[1]*0.5*h])
  const k4=f([y[0]+h*k3[0],     y[1]+h*k3[1]])
  state.theta += (h/6)*(k1[0]+2*k2[0]+2*k3[0]+k4[0])
  state.omega += (h/6)*(k1[1]+2*k2[1]+2*k3[1]+k4[1])
}

/* ---------- рендер ---------- */
function draw(canvas, state, { L }, tSec){
  if(!canvas) return
  const ctx=canvas.getContext('2d')
  const W=canvas.width, H=canvas.height

  ctx.clearRect(0,0,W,H)
  ctx.fillStyle='#FFFFFF'
  ctx.fillRect(0,0,W,H)

  const pivotX = Math.round(W / 3)
  const pivotY = 20
  const pxPerM = 140

  const th = state.theta
  const bobX = pivotX + pxPerM * L * Math.sin(th)
  const bobY = pivotY + pxPerM * L * Math.cos(th)

  ctx.fillStyle='#333F50'
  ctx.fillRect(pivotX-3, pivotY-3, 6, 6)

  ctx.strokeStyle='#8497B0'; ctx.lineWidth=2
  ctx.beginPath(); ctx.moveTo(pivotX,pivotY); ctx.lineTo(bobX,bobY); ctx.stroke()

  const r = 12
  ctx.fillStyle='#44546A'
  ctx.beginPath(); ctx.arc(bobX,bobY,r,0,Math.PI*2); ctx.fill()

  const swCX = Math.round((5*W)/6)
  const swCY = Math.round(H/2)
  const swR  = 90
  drawStopwatchDonut(ctx, swCX, swCY, swR, tSec)

  const m=Math.floor(tSec/60), s=Math.floor(tSec%60), tenths=Math.floor((tSec%1)*10)
  const pad2=n=>String(n).padStart(2,'0')
  ctx.fillStyle='#222A35'; ctx.font='14px Cambria, Georgia, serif'
  ctx.fillText(`${pad2(m)}:${pad2(s)}.${tenths}`, swCX - 30, swCY + swR + 22)
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

/* ---------- утилиты ---------- */
function deg2rad(d){ return d*Math.PI/180 }
function updateAngleFromPointer(e,canvas,stateRef){
  const r=canvas.getBoundingClientRect()
  const x=e.clientX-r.left, y=e.clientY-r.top
  const W = canvas.width
  const pivotX = Math.round(W / 3)
  const pivotY = 20
  const dx=x-pivotX, dy=y-pivotY
  let theta=Math.atan2(dx,dy)
  const clamp=170*Math.PI/180
  if(theta>clamp) theta=clamp
  if(theta<-clamp) theta=-clamp
  stateRef.current.theta=theta
  stateRef.current.omega=0
}
function bodyNameForG(g){
  const round1=x=>Math.round(x*10)/10, v=round1(g)
  const tbl=[ {name:'Луна',g:1.6},{name:'Меркурий',g:3.7},{name:'Марс',g:3.7},{name:'Венера',g:8.9},{name:'Уран',g:8.7},{name:'Земля',g:9.8},{name:'Сатурн',g:10.4},{name:'Нептун',g:11.2},{name:'Юпитер',g:24.8},{name:'Плутон',g:0.6} ]
  const hit=tbl.find(e=>round1(e.g)===v); return hit?hit.name:''
}
