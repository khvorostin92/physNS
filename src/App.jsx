import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import Home from './pages/Home'
import Projectile from './pages/Projectile'
import Spring from './pages/Spring'

const TITLE = {
  ru: 'Физика в ОШ «Антон Чехов»',
  en: 'Physics at “Anton Chekhov” School',
  sr: 'Физика у ОШ „Антон Чехов“',
}

export default function App(){
  const [lang, setLang] = useState('ru')

  return (
    <HashRouter>
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="app-title" title="На главную">
            {/* Иконка «атом», завязанная на currentColor и не плывёт */}
            <svg className="logo" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="2.2" fill="currentColor"/>
              <g fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
                <ellipse cx="12" cy="12" rx="9" ry="5.6" />
                <ellipse cx="12" cy="12" rx="9" ry="5.6" transform="rotate(60 12 12)"/>
                <ellipse cx="12" cy="12" rx="9" ry="5.6" transform="rotate(-60 12 12)"/>
              </g>
            </svg>
            <span>{TITLE[lang] || TITLE.ru}</span>
          </Link>

          <div className="lang-toggle" role="tablist" aria-label="Выбор языка">
            {['ru','sr','en'].map(code=>(
              <button
                key={code}
                role="tab"
                className={code===lang?'active':''}
                onClick={()=>setLang(code)}
                aria-selected={code===lang}
                title={code.toUpperCase()}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home lang={lang} />} />
          <Route path="/sim/projectile" element={<Projectile lang={lang} />} />
          <Route path="/sim/spring" element={<Spring lang={lang} />} />
          {/* новые симуляции добавляй по образцу ↑ */}
        </Routes>
      </main>
    </HashRouter>
  )
}
