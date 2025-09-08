import { Link } from 'react-router-dom'
import { useMemo, useRef, useState, useEffect } from 'react'

/** Локализация UI */
const UI = {
  ru: { catalog:'Каталог симуляций', filters:'Фильтры', classes:'Классы', topics:'Темы', search:'Поиск', reset:'Сбросить' },
  en: { catalog:'Simulations Catalog', filters:'Filters', classes:'Classes', topics:'Topics', search:'Search', reset:'Reset' },
  sr: { catalog:'Каталог симулација', filters:'Филтери', classes:'Разреди', topics:'Теме', search:'Претрага', reset:'Ресетуј' },
}

const CLASSES = ['6','7','8']

/** Ключи тем (стабильные ключи для фильтрации) */
const TOPIC_KEYS = [
  'kinematics','dynamics','conservation','statics',
  'osc_waves','molecular','thermo','electrostatics',
  'dc','magnetic','em_induction','em_osc',
  'em_waves_optics','sr_basics'
]

/** Локализация названий тем */
const TOPIC_LABELS = {
  ru: {
    kinematics:'кинематика', dynamics:'динамика', conservation:'законы сохранения', statics:'статика',
    osc_waves:'механические колебания и волны',
    molecular:'молекулярная физика', thermo:'термодинамика',
    electrostatics:'электростатика', dc:'законы постоянного тока', magnetic:'магнитное поле',
    em_induction:'электромагнитная индукция и электромагнитные колебания',
    em_osc:'электромагнитные колебания',
    em_waves_optics:'электромагнитные волны и оптика',
    sr_basics:'основы СТО',
  },
  en: {
    kinematics:'Kinematics', dynamics:'Dynamics', conservation:'Conservation laws', statics:'Statics',
    osc_waves:'Mechanical oscillations & waves',
    molecular:'Molecular physics', thermo:'Thermodynamics',
    electrostatics:'Electrostatics', dc:'DC circuits', magnetic:'Magnetic field',
    em_induction:'EM induction & oscillations',
    em_osc:'Electromagnetic oscillations',
    em_waves_optics:'EM waves & optics',
    sr_basics:'Basics of SR',
  },
  sr: {
    kinematics:'Кинематика', dynamics:'Динамика', conservation:'Закони одржања', statics:'Статика',
    osc_waves:'Механичке осцилације и таласи',
    molecular:'Молекуларна физика', thermo:'Термодинамика',
    electrostatics:'Електростатика', dc:'Закони једносмерне струје', magnetic:'Магнетно поље',
    em_induction:'ЕМ индукција и осцилације',
    em_osc:'Електромагнетне осцилације',
    em_waves_optics:'ЕМ таласи и оптика',
    sr_basics:'Основе СТО',
  },
}

/** Безопасный helper для ассетов (учитывает BASE_URL, не использует new URL) */
function asset(rel) {
  const base = (import.meta.env.BASE_URL && import.meta.env.BASE_URL.length) ? import.meta.env.BASE_URL : '/'
  const needsSlash = !base.endsWith('/')
  return (needsSlash ? base + '/' : base) + rel.replace(/^\/+/, '')
}

/** Каталог симуляций */
const SIMS = [
  {
  id: 'cannon',
  titles: { ru:'Бросок под углом', en:'Projectile motion', sr:'Бацање под углом' },
  to: '/sim/cannon',
  img: asset('thumbs/cannon.png'),
  classes: ['6','7'],
  topics: ['kinematics','dynamics']
  },
  {
  id: 'car',
  titles: { ru:'Авто на дороге', en:'Car on the Road', sr:'Ауто на путу' },
  to: '/sim/car',
  img: asset('thumbs/car.png'),
  classes: ['7'],
  topics: ['kinematics','dynamics']
  },
  {
    id: 'projectile',
    titles: { ru:'Математический маятник', en:'Simple Pendulum', sr:'Математичко клатно' },
    to: '/sim/projectile',
    img: asset('thumbs/pendulum.png'),
    classes: ['7','8'],
    topics: ['osc_waves'],
  },
  {
    id: 'spring',
    titles: { ru:'Пружинный маятник', en:'Spring–Mass Oscillator', sr:'Опружно клатно' },
    to: '/sim/spring',
    img: asset('thumbs/spring.png'),
    classes: ['7','8'],
    topics: ['osc_waves'],
  },
  {
  id: 'pendulum-energy',
  titles: { ru:'Маятник — энергия', en:'Pendulum — energy', sr:'Клатно — енергија' },
  to: '/sim/pendulum-energy',
  img: asset('thumbs/pendulum-energy.png'),
  classes: ['7','8'],
  topics: ['osc_waves','conservation'],
  },
  {
  id: 'spring-energy',
  titles: { ru:'Пружинный маятник — энергия', en:'Spring — energy', sr:'Опружно клатно — енергија'},
  to: '/sim/spring-energy',
  img: asset('thumbs/spring-energy.png'),
  classes: ['7','8'],
  topics: ['osc_waves','conservation'],
  }



  // добавляй новые по образцу ↑
]

export default function Home({ lang='ru' }){
  const t = UI[lang] || UI.ru
  const topicsDict = TOPIC_LABELS[lang] || TOPIC_LABELS.ru

  // состояние фильтров
  const [cls, setCls] = useState(new Set())
  const [tps, setTps] = useState(new Set())
  const [q, setQ]     = useState('')

  // шторка фильтров
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const drawerRef = useRef(null)

  // закрытие шторки по клику вне
  useEffect(()=>{
    const onDocClick = (e)=>{
      if(!open) return
      const w = wrapRef.current, d = drawerRef.current
      if(!w || !d) return
      if(d.contains(e.target)) return
      if(!w.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return ()=>document.removeEventListener('click', onDocClick)
  }, [open])

  const toggleSet = (set, value) => {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  }

  const filtered = useMemo(()=>{
    return SIMS.filter(s=>{
      const title = s.titles[lang] || s.titles.ru
      const okClass = cls.size===0 || s.classes.some(c=>cls.has(c))
      const okTopic = tps.size===0 || s.topics.some(tp=>tps.has(tp))
      const okText  = q.trim()==='' || title.toLowerCase().includes(q.trim().toLowerCase())
      return okClass && okTopic && okText
    })
  }, [cls, tps, q, lang])

  const resetAll = ()=>{ setCls(new Set()); setTps(new Set()); setQ('') }

  return (
    <div className="container catalog-wrap" ref={wrapRef}>
      <div className="catalog-topbar">
        <h1 className="page-title" style={{marginTop:8, marginBottom:0}}>{t.catalog}</h1>

        {/* Компактный поиск + кнопка шторки справа */}
        <div className="catalog-actions">
          <input
            className="search-input search-input--compact"
            placeholder={t.search}
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <button className="filter-toggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
            {t.filters}
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{marginLeft:6}}>
              <path d="M3 5h18M6 12h12m-7 7h2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ШТОРКА ФИЛЬТРОВ */}
      <div ref={drawerRef} className={`filters-drawer ${open ? 'open' : ''}`}>
        <div className="filters-drawer__header">
          <strong>{t.filters}</strong>
          <button className="drawer-close" onClick={()=>setOpen(false)} aria-label="Закрыть">×</button>
        </div>

        <div className="filters-drawer__section">
          <div className="filters-label">{t.classes}</div>
          <div className="checkbox-list">
            {CLASSES.map(c=>(
              <label key={c} className="checkbox-item">
                <input type="checkbox" checked={cls.has(c)} onChange={()=>setCls(toggleSet(cls,c))}/>
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filters-drawer__section">
          <div className="filters-label">{t.topics}</div>
          <div className="checkbox-list checkbox-list--scroll">
            {TOPIC_KEYS.map(key=>(
              <label key={key} className="checkbox-item" title={topicsDict[key]}>
                <input type="checkbox" checked={tps.has(key)} onChange={()=>setTps(toggleSet(tps, key))}/>
                <span>{topicsDict[key]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filters-drawer__footer">
          <button onClick={resetAll}>{t.reset}</button>
        </div>
      </div>

      {/* Сетка каталога */}
      <div className="catalog-grid">
        {filtered.map(s=>{
          const title = s.titles[lang] || s.titles.ru
          return (
            <Link key={s.id} to={s.to} className="sim-card" title={title}>
              <div className="thumb"><img src={s.img} alt={title}/></div>
              <h3 className="sim-title">{title}</h3>
            </Link>
          )
        })}
        {filtered.length===0 && (
          <div className="catalog-empty panel">Ничего не найдено. Попробуйте изменить фильтры.</div>
        )}
      </div>
    </div>
  )
}
