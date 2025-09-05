import { useEffect, useRef, useState } from "react"

/**
 * 🎯 Симуляция броска под углом к горизонту (обновление по ТЗ)
 * — Цвета: земля #D6DCE5, пушка #ADB9CA, колесо #8497B0, ядро #ADB9CA,
 *   след #ADB9CA (растворяется), мишень #C00000/#F2F2F2
 * — Горизонт ~92% H (земля 8%). Колесо стоит на земле; ствол короче ×1.5 и толще ×1.5.
 * — g-подсказка рядом со значением, фиксированные колонки — ничего не наезжает.
 * — Мишени (4 круга) — теперь их ДВЕ; каждая спавнится не ближе к пушке, чем 0.4 * H.
 * — Попадание удаляет снаряд и респавнит только ту мишень, в которую попали.
 */

const TXT = {
  ru: { title: "Бросок под углом", g: "Ускорение g", air: "Сопротивление воздуха", reset: "Сброс", qTitle: "Вопросы" },
  en: { title: "Projectile Motion", g: "Gravity g", air: "Air resistance", reset: "Reset", qTitle: "Questions" },
  sr: { title: "Бацанје под углом", g: "Убрзање g", air: "Отпор ваздуха", reset: "Почетак", qTitle: "Питања" },
}

const UNITS = {
  ru: { g: "м/с²", air: "1/с" },
  en: { g: "m/s²", air: "1/s" },
  sr: { g: "м/с²", air: "1/с" },
}

const QA = {
  ru: [
    "К чему приводит действие других тел (например, Земли или воздуха) на движущееся тело? Как при этом изменяется его скорость?",
    "Как движется тело при отсутствии действия на него со стороны других тел?",
  ],
  sr: [
    "До чега доводи деловање других тела (на пример, Земље или ваздуха) на тело које се креће? Како се при томе мења његова брзина?",
    "Како се креће тело ако на њега не делују друга тела?",
  ],
  en: [
    "What is the effect of other bodies (for example, the Earth or air) on a moving body? How does its speed change in this case?",
    "How does a body move if no other bodies act on it?",
  ],
}

// Тела с g в диапазоне [0..10] (без сравнения по массе)
const PLANETS = [
  { name: "Церера", g: 0.27 },
  { name: "Плутон", g: 0.62 },
  { name: "Эрида", g: 0.82 },
  { name: "Европа", g: 1.31 },
  { name: "Каллисто", g: 1.24 },
  { name: "Ганимед", g: 1.43 },
  { name: "Титан", g: 1.35 },
  { name: "Луна", g: 1.62 },
  { name: "Ио", g: 1.80 },
  { name: "Меркурий", g: 3.70 },
  { name: "Марс", g: 3.71 },
  { name: "Уран", g: 8.69 },
  { name: "Венера", g: 8.87 },
  { name: "Земля", g: 9.8 },
]

export default function ProjectileSim({ lang = "ru" }) {
  const t = TXT[lang] || TXT.ru
  const units = UNITS[lang] || UNITS.ru

  const [g, setG] = useState(9.8)
  const [air, setAir] = useState(0.05)
  const [shots, setShots] = useState([])

  const canvasRef = useRef(null)
  const gunRef = useRef({ x: 120, y: 360, angle: -Math.PI/4 })
  const mouseRef = useRef({ x: 0, y: 0, down: false })

  // ⬇️ Был один targetRef, теперь массив из двух мишеней
  const targetsRef = useRef([]) // [{x,y,r}, {x,y,r}]

  // Параметры ядра/мишени (увеличены в 1.5×)
  const BALL_R = 9
  const TARGET_R = BALL_R * 2 // диаметр = 2× диаметр ядра

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const move = (e) => { const r = cv.getBoundingClientRect(); mouseRef.current.x = e.clientX - r.left; mouseRef.current.y = e.clientY - r.top }
    const down = (e) => { if (e.button === 0) mouseRef.current.down = true }
    const up = () => { mouseRef.current.down = false }
    cv.addEventListener('mousemove', move); cv.addEventListener('mousedown', down); window.addEventListener('mouseup', up)
    return () => { cv.removeEventListener('mousemove', move); cv.removeEventListener('mousedown', down); window.removeEventListener('mouseup', up) }
  }, [])

  // Спавним ДВЕ мишени после монтирования с ограничением дистанции от пушки
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const W = cv.width, H = cv.height
    const horizonY = Math.round(H * 0.92)
    const gun = gunRef.current
    const minDist = 0.4 * H
    targetsRef.current = [
      spawnTargetAwayFromGun(W, H, horizonY, TARGET_R, gun, minDist),
      spawnTargetAwayFromGun(W, H, horizonY, TARGET_R, gun, minDist),
    ]
  }, [])

  useEffect(() => {
    let raf = 0, prev = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - prev) / 1000, 1/30); prev = now
      const cv = canvasRef.current; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height

      // Горизонт ~ 92% высоты (земля = 8%)
      const horizonY = Math.round(H * 0.92)

      // фон: верх — небо (белый), низ — земля (#D6DCE5)
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,W,horizonY)
      ctx.fillStyle = '#D6DCE5'; ctx.fillRect(0,horizonY,W,H - horizonY)

      // геометрия пушки
      const wheelR = 24
      const gun = gunRef.current
      gun.y = horizonY - wheelR // колесо опирается на землю

      // наведение на курсор
      const dx = mouseRef.current.x - gun.x
      const dy = mouseRef.current.y - gun.y
      gun.angle = Math.atan2(dy, dx)

      // выстрел (усиленная скорость, мгновенное появление из дула)
      if (mouseRef.current.down) {
        const dist = Math.hypot(dx, dy)
        const v0 = Math.min(dist / 6, 800)
        const vx = v0 * Math.cos(gun.angle)
        const vy = v0 * Math.sin(gun.angle)
        const muzzle = barrelMuzzle(gun.x, gun.y, gun.angle)
        const shot = { x: muzzle.x, y: muzzle.y, vx, vy, path: [[muzzle.x, muzzle.y]] }
        shots.push(shot); setShots([...shots]); mouseRef.current.down = false
      }

      // интеграция и столкновения/попадания
      for (let s of shots) {
        integrateRK4(s, dt, g, air)
        s.path.push([s.x, s.y])
        // отскок от земли
        if (s.y > horizonY - BALL_R && s.vy > 0) {
          s.y = horizonY - BALL_R
          const e = Math.sqrt(0.9) // потеря 10% энергии
          s.vy = -s.vy * e
          s.vx = s.vx * e
        }
        // попадание в любую из мишеней
        for (let i = 0; i < targetsRef.current.length; i++) {
          const tgt = targetsRef.current[i]
          if (!tgt) continue
          const d = Math.hypot(s.x - tgt.x, s.y - tgt.y)
          if (d <= tgt.r) {
            s.hit = true
            // респавним ТОЛЬКО эту мишень, соблюдая ограничение по расстоянию от пушки
            targetsRef.current[i] = spawnTargetAwayFromGun(
              W, H, horizonY, TARGET_R, gunRef.current, 0.4 * H
            )
            break
          }
        }
        // детекция «остановился»
        const speed = Math.hypot(s.vx, s.vy)
        const nearGround = s.y >= horizonY - BALL_R - 1.5
        if (speed < 12 && nearGround) { s.restTime = (s.restTime || 0) + dt } else { s.restTime = 0 }
      }

      // удаление остановившихся/ушедших/попавших и ограничение длины следа
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]
        const offscreen = s.x < -10 || s.x > W + 10
        const stopped = (s.restTime || 0) > 0.35
        if (s.hit || offscreen || stopped) shots.splice(i, 1)
        if (s.path.length > 300) s.path.splice(0, s.path.length - 300)
      }

      // поддерживаем РОВНО две мишени
      const minDist = 0.4 * H
      while (targetsRef.current.length < 2) {
        targetsRef.current.push(
          spawnTargetAwayFromGun(W, H, horizonY, TARGET_R, gunRef.current, minDist)
        )
      }

      // отрисовка мишеней
      for (const tgt of targetsRef.current) drawTarget(ctx, tgt)

      // траектории (растворяются, цвет #ADB9CA) и снаряды
      for (let s of shots) {
        const n = s.path.length
        for (let i = 1; i < n; i++) {
          const [x1, y1] = s.path[i - 1]
          const [x2, y2] = s.path[i]
          const a = (i / n) * 0.5 // прозрачность 0..0.5
          ctx.strokeStyle = `rgba(173,185,202,${a.toFixed(3)})` // #ADB9CA
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        }
        // ядро
        ctx.fillStyle = '#ADB9CA'
        ctx.beginPath(); ctx.arc(s.x, s.y, BALL_R, 0, Math.PI*2); ctx.fill()
      }

      // ствол — короче ×1.5 и толще ×1.5, сужающийся и со скруглением
      drawBarrel(ctx, gun.x, gun.y, gun.angle)
      // колесо поверх ствола
      ctx.fillStyle = '#8497B0'; ctx.beginPath(); ctx.arc(gun.x, gun.y, 24, 0, Math.PI*2); ctx.fill()

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shots, g, air])

  // подпись планеты рядом с ползунком g (фиксированные колонки, эллипсис)
  const planet = pickPlanet(g)
  const planetHint = planet ? `≈ ${planet.name}` : ""

  return (
    <div className="container">
      <h1 className="page-title">{t.title}</h1>
      <div className="panel" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Row label={t.g} unit={units.g} value={g} onChange={setG} min={0} max={10} step={0.1} digits={1} hint={planetHint} />
        <Row label={t.air} unit={units.air} value={air} onChange={setAir} min={0} max={1} step={0.01} digits={2} />
        <button onClick={() => setShots([])}>{t.reset}</button>
      </div>

      <canvas ref={canvasRef} className="canvas-frame" width={960} height={480} />

      <details className="panel" style={{ marginTop: 12 }}>
        <summary style={{ cursor:'pointer', fontWeight:700 }}>{t.qTitle}</summary>
        <div style={{ padding:'8px 4px 6px' }}>
          <ol style={{ paddingLeft:'1.2em', margin:'6px 0', display:'grid', gap:6 }}>
            {(QA[lang] || QA.ru).map((q,i) => (<li key={i}>{q}</li>))}
          </ol>
        </div>
      </details>
    </div>
  )
}

function Row({ label, unit, value, onChange, min, max, step, digits, hint }) {
  const fmt = value.toFixed(digits ?? 1)
  return (
    <label className="control-row" style={{
      display:'grid',
      gridTemplateColumns:'minmax(140px,auto) 1fr 110px 160px',
      alignItems:'center', gap:8
    }}>
      <span className="label">{label}</span>
      <input style={{ width:'100%' }} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      <span className="value" style={{ width:110, fontVariantNumeric:'tabular-nums', textAlign:'right', whiteSpace:'nowrap' }}>{fmt} {unit}</span>
      <span style={{ width:160, opacity:0.9, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{hint || ''}</span>
    </label>
  )
}

function integrateRK4(s, dt, g, air) { let left = dt, hMax = 1/240; while (left > 0) { const h = Math.min(hMax, left); rk4Step(s, h, g, air); left -= h } }
function rk4Step(s, h, g, air) {
  const f = ({ x, y, vx, vy }) => ({ dx: vx, dy: vy, dvx: -air*vx, dvy: g - air*vy })
  const k1 = f(s)
  const k2 = f({ x: s.x + 0.5*h*k1.dx, y: s.y + 0.5*h*k1.dy, vx: s.vx + 0.5*h*k1.dvx, vy: s.vy + 0.5*h*k1.dvy })
  const k3 = f({ x: s.x + 0.5*h*k2.dx, y: s.y + 0.5*h*k2.dy, vx: s.vx + 0.5*h*k2.dvx, vy: s.vy + 0.5*h*k2.dvy })
  const k4 = f({ x: s.x + h*k3.dx, y: s.y + h*k3.dy, vx: s.vx + h*k3.dvx, vy: s.vy + h*k3.dvy })
  s.x += (h/6)*(k1.dx + 2*k2.dx + 2*k3.dx + k4.dx)
  s.y += (h/6)*(k1.dy + 2*k2.dy + 2*k3.dy + k4.dy)
  s.vx += (h/6)*(k1.dvx + 2*k2.dvx + 2*k3.dvx + k4.dvx)
  s.vy += (h/6)*(k1.dvy + 2*k2.dvy + 2*k3.dvy + k4.dvy)
}

function pickPlanet(g) { const round1 = (v)=>Math.round(v*10)/10; const target = round1(g); return PLANETS.find(p => round1(p.g) === target) || null }

// Ствол — короче ×1.5 и толще ×1.5, сужающийся и со скруглением у казённой части
function drawBarrel(ctx, x, y, angle){
  const L0 = 95, tBack0 = 26, tFront0 = 18
  const L = Math.round(L0 / 1.5)          // короче в 1.5 раза
  const tBack = Math.round(tBack0 * 1.5)   // толще в 1.5 раза
  const tFront = Math.round(tFront0 * 1.5)
  const backR = tBack/2
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  ctx.fillStyle = '#ADB9CA'
  ctx.beginPath()
  ctx.moveTo(0, -tBack/2)
  ctx.lineTo(L, -tFront/2)
  ctx.lineTo(L,  tFront/2)
  ctx.lineTo(0,  tBack/2)
  ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, backR, Math.PI/2, -Math.PI/2, true); ctx.fill()
  ctx.restore()
}

// Точка у дула для спауна ядра
function barrelMuzzle(x, y, angle){
  const L0 = 95; const L = Math.round(L0 / 1.5)
  return { x: x + Math.cos(angle)*L, y: y + Math.sin(angle)*L }
}

// Мишень: бордовый/светло-серый концентрические круги
function drawTarget(ctx, tgt){
  if (!tgt) return; const { x, y, r } = tgt
  const colors = ['#C00000', '#F2F2F2', '#C00000', '#F2F2F2']
  for (let i=0;i<4;i++){
    ctx.fillStyle = colors[i]
    ctx.beginPath(); ctx.arc(x, y, r*(1 - i*0.25), 0, Math.PI*2); ctx.fill()
  }
}

// Новый спавн: в любом месте выше земли, но НЕ ближе к пушке, чем minDist
function spawnTargetAwayFromGun(W, H, horizonY, r, gun, minDist){
  const margin = 20
  const xMin = margin + r, xMax = W - margin - r
  const yMin = margin + r, yMax = horizonY - margin - r

  for (let tries = 0; tries < 100; tries++){
    const x = rand(xMin, xMax)
    const y = rand(yMin, yMax)
    const d = Math.hypot(x - gun.x, y - gun.y)
    if (d >= minDist) return { x, y, r }
  }
  // запасной вариант — точка на границе допустимой области по направлению от пушки
  const ang = Math.random() * Math.PI * 2
  const x = clamp(gun.x + Math.cos(ang) * minDist, xMin, xMax)
  const y = clamp(gun.y + Math.sin(ang) * minDist, yMin, yMax)
  return { x, y, r }
}

// (Старая функция спавна сохранена на случай использования в будущем)
function spawnTarget(W, horizonY, r){
  const margin = 20
  const xMin = Math.max(W*0.55, margin + r), xMax = W - margin - r
  const yMin = margin + r, yMax = horizonY - margin - r
  return { x: rand(xMin, xMax), y: rand(yMin, yMax), r }
}

function rand(a,b){ return a + Math.random()*(b-a) }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)) }
