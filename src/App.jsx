import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import Home from './pages/Home'
import Cannon from './pages/Cannon'
import CarMotion from './pages/CarMotion.jsx'
import Tribometer from './pages/Tribometer.jsx'
import Projectile from './pages/Projectile'
import Spring from './pages/Spring'
import PendulumEnergy from './pages/PendulumEnergy.jsx'
import SpringEnergy from './pages/SpringEnergy.jsx'



const TITLE = {
  ru: 'Физика в ОШ «Антон Чехов»',
  en: 'Physics at “Anton Chekhov” School',
  sr: 'Физика у ОШ „Антон Чехов“',
}

/* Монохромные SVG-иконки (цвет берут из currentColor) */
function IconTelegram(props){
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false" {...props}>
      <path fill="currentColor" d="M9.8 16.7 9.94 13.4l6.6-5.96c.29-.26-.06-.38-.45-.17l-8.17 4.67-3.52-1.1c-.76-.24-.77-.76.17-1.13l13.78-5.32c.63-.23 1.18.15.98 1.04l-2.35 11.08c-.16.75-.6.94-1.22.6l-3.38-2.5-1.63 1.56c-.18.18-.33.33-.66.33Z"/>
    </svg>
  )
}
function IconYouTube(props){
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false" {...props}>
      <path fill="currentColor" d="M23 7.5s-.2-1.6-.8-2.3c-.8-.8-1.7-.8-2.1-.9C17.2 4 12 4 12 4s-5.2 0-8.1.3c-.4.1-1.3.1-2.1.9C1.2 5.9 1 7.5 1 7.5S.8 9.4.8 11.2v1.6C.8 14.6 1 16.5 1 16.5s.2 1.6.8 2.3c.8.8 1.8.8 2.3.9 1.7.2 7.9.3 7.9.3s5.2 0 8.1-.3c.4-.1 1.3-.1 2.1-.9.6-.7.8-2.3.8-2.3s.2-1.9.2-3.7v-1.6c0-1.8-.2-3.7-.2-3.7ZM9.8 14.9V7.9l6.4 3.5-6.4 3.5Z"/>
    </svg>
  )
}
function IconTikTok(props){
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false" {...props}>
      <path fill="currentColor" d="M16.7 3.1c.6 1.4 1.7 2.5 3.1 3.1.7.3 1.4.5 2.2.5v3.3c-1.8-.1-3.5-.7-5-1.7v6.4c0 1.1-.2 2.1-.8 3.1-.5.9-1.3 1.7-2.2 2.2-1 .5-2 .8-3.1.8s-2.1-.3-3.1-.8c-.9-.5-1.7-1.3-2.2-2.2-.5-1-.8-2-.8-3.1s.3-2.1.8-3.1c.6-.9 1.3-1.7 2.2-2.2 1-.5 2-.8 3.1-.8.4 0 .8 0 1.2.1v3.4c-.4-.2-.8-.2-1.2-.2-.6 0-1.3.2-1.8.5-.5.3-1 .8-1.3 1.3-.3.5-.5 1.1-.5 1.8s.2 1.3.5 1.8c.3.5.8 1 1.3 1.3.5.3 1.1.5 1.8.5s1.3-.2 1.8-.5c.5-.3 1-.8 1.3-1.3.3-.5.5-1.1.5-1.8V2h3.3c.1.4.2.7.4 1.1Z"/>
    </svg>
  )
}

/** Минималистичный подвал — один на все страницы */
function Footer(){
  return (
    <footer className="app-footer">
      <div>Учитель физики в Сербии — Хворостин Александр</div>
      <div className="app-footer__links">
        <a href="https://t.me/tutor924" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
          <IconTelegram />
        </a>
        <a href="https://www.youtube.com/@PhysNS" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
          <IconYouTube />
        </a>
        <a href="https://www.tiktok.com/@physns" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
          <IconTikTok />
        </a>
      </div>
    </footer>
  )
}

export default function App(){
  const [lang, setLang] = useState('ru')

  return (
    <HashRouter>
      {/* Оболочка с «липким» футером */}
      <div className="app-shell">
        <header className="app-header">
          <div className="container app-header__inner">
            <Link to="/" className="app-title" title="На главную">
              {/* Иконка «атом» */}
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
            <Route path="/sim/cannon" element={<Cannon lang={lang} />} />
            <Route path="/" element={<Home lang={lang} />} />
            <Route path="/sim/car" element={<CarMotion lang={lang} />} />
            <Route path="/sim/projectile" element={<Projectile lang={lang} />} />
            <Route path="/sim/spring" element={<Spring lang={lang} />} />
            <Route path="/sim/pendulum-energy" element={<PendulumEnergy lang={lang} />} />
            <Route path="/sim/spring-energy" element={<SpringEnergy lang={lang} />} />
            <Route path="/sim/tribometer" element={<Tribometer lang={lang} />} /> {/* ← НОВОЕ */}

                        {/* новые симуляции добавляй по образцу ↑ */}
          </Routes>
        </main>

        <Footer />
      </div>
    </HashRouter>
  )
}
