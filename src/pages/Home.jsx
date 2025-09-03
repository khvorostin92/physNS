import { Link } from 'react-router-dom'

const DICT = {
  ru:{ title:'Симуляции', pendulum:'Математический маятник', pendulum_desc:'Угол, длина, масса, сопротивление, g', spring:'Пружинный маятник', spring_desc:'Отклонение (см), жёсткость k, масса, сопротивление' },
  en:{ title:'Simulationс', pendulum:'Simple Pendulum', pendulum_desc:'Angle, length, mass, drag, g', spring:'Spring–Mass Oscillator', spring_desc:'Displacement (cm), stiffness k, mass, drag' },
  sr:{ title:'Симулацији', pendulum:'Математичко клатно', pendulum_desc:'Угао, дужина, маса, отпор, g', spring:'Опружни клатно', spring_desc:'Померај (cm), крутост k, маса, отпор' },
}

export default function Home({ lang='ru' }){
  const t = DICT[lang]
  const sims = [
    { title: t.pendulum, desc: t.pendulum_desc, to:'/sim/projectile' },
    { title: t.spring,   desc: t.spring_desc,   to:'/sim/spring' },
  ]
  return (
    <div>
      <h1 style={{ fontSize:28, margin:'10px 0 16px' }}>{t.title}</h1>
      <div className="card-list">
        {sims.map(s=>(
          <Link key={s.to} to={s.to} className="card">
            <div style={{ fontSize:18, marginBottom:6 }}>{s.title}</div>
            <div style={{ color:'var(--text-weak)' }}>{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
