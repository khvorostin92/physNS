import { Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home.jsx'
import Projectile from './pages/Projectile.jsx'
import Spring from './pages/Spring.jsx'

/** Локализация заголовка и, при необходимости, других подписей шапки */
const DICT = {
  ru: { brand: 'Физика в ОШ «Антон Чехов»' },
  en: { brand: 'Physics at “Anton Chekhov” School' },
  // српски (ћирилица)
  sr: { brand: 'Физика у ОШ „Антон Чехов“', springTitle: 'Опружно клатно' },
}

export default function App(){
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ru')
  useEffect(()=>{ localStorage.setItem('lang', lang) }, [lang])

  return (
    <div>
      {/* Фиксированный хедер */}
      <header className="app-header">
        <div className="app-header__inner">
          {/* Бренд — ссылка на главную */}
          <Link to="/" className="app-title">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="4" fill="#C00000"/>
              <ellipse cx="32" cy="32" rx="22" ry="10" fill="none" stroke="#fff" strokeWidth="2"/>
              <ellipse cx="32" cy="32" rx="22" ry="10" fill="none" stroke="#fff" strokeWidth="2" transform="rotate(60 32 32)"/>
              <ellipse cx="32" cy="32" rx="22" ry="10" fill="none" stroke="#fff" strokeWidth="2" transform="rotate(-60 32 32)"/>
            </svg>
            <span>{DICT[lang].brand}</span>
          </Link>

          {/* Переключатель языков — компактная «пилюля» */}
          <div className="lang-toggle" role="group" aria-label="Language">
            {['ru','en','sr'].map(l => (
              <button key={l} className={l===lang?'active':''} onClick={()=>setLang(l)}>
                {l==='ru'?'Рус':l==='en'?'Eng':'Срп'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home lang={lang} />} />
          <Route path="/sim/projectile" element={<Projectile lang={lang} />} />
          <Route path="/sim/spring" element={<Spring lang={lang} />} />
        </Routes>
      </main>
    </div>
  )
}
