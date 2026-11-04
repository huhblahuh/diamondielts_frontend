import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import siteLogo from '../../assets/site-logo.webp';
import { diamondsModeForRoute } from './studentLayoutPolicy';
import { DRAW, GROUPS, PHASES, THEMES } from './themeArtwork';

const PORTAL = 'https://diamonds-ielts.netlify.app/';
const DiamondLayoutContext = createContext({ openThemePicker: () => {} });
const phaseKeys = ['far', 'mid', 'near', 'g1', 'g2', 'g3', 'w2', 'snow', 'cloud', 'sand', 'sand2'];
const prefixClasses = (html) => html.replace(/class="([^"]*)"/g, (_, classes) =>
  `class="${classes.trim().split(/\s+/).map((name) => `dk-${name}`).join(' ')}"`);

function stored(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

function save(storage, key, value) {
  try { storage.setItem(key, value); } catch { /* Storage may be disabled. */ }
}

function initialTheme() {
  const query = new URLSearchParams(window.location.search).get('theme');
  if (query && DRAW[query]) {
    save(sessionStorage, 'dk_theme', query);
    return query;
  }
  const saved = stored(localStorage, 'dk_theme');
  if (saved && DRAW[saved]) {
    save(sessionStorage, 'dk_theme', saved);
    return saved;
  }
  const session = stored(sessionStorage, 'dk_theme');
  if (session && DRAW[session]) return session;
  const last = stored(localStorage, 'dk_last_theme');
  const pool = THEMES.map(({ key }) => key).filter((key) => key !== last);
  const selected = pool[Math.floor(Math.random() * pool.length)];
  save(localStorage, 'dk_last_theme', selected);
  save(sessionStorage, 'dk_theme', selected);
  return selected;
}

function currentPhase() {
  const hourOverride = new URLSearchParams(window.location.search).get('dkt');
  const now = new Date();
  const hour = hourOverride !== null && !Number.isNaN(Number.parseFloat(hourOverride))
    ? Number.parseFloat(hourOverride)
    : now.getHours() + now.getMinutes() / 60;
  return [...PHASES].reverse().find((phase) => hour >= phase.from) || PHASES[0];
}

function phaseStyle(phase) {
  return Object.fromEntries([
    ...phaseKeys.map((key) => [`--${key}`, phase[key]]),
    ['--birdc', phase.bird], ['--win', phase.win], ['--stars', phase.stars],
  ]);
}

function Sky({ phase, theme, stars }) {
  const art = useMemo(() => prefixClasses(DRAW[theme]()), [theme]);
  const palette = phaseStyle(phase);
  const sky = `linear-gradient(180deg, ${phase.sky[0]} 0%, ${phase.sky[1]} 55%, ${phase.sky[2]} 100%)`;
  return <>
    <div className="dk-scene" aria-hidden="true" style={palette}>
      <div className="dk-sky dk-sky-a" style={{ background: sky }} />
      <div className="dk-sky dk-sky-b" />
      <div className="dk-stars">{stars.map((star, index) => <i key={index} className="dk-star" style={star} />)}</div>
      <div className="dk-orb dk-sun" style={phase.sun ? { left: `${phase.sun[0]}%`, top: `${phase.sun[1]}%` } : { opacity: 0, pointerEvents: 'none' }} />
      <div className="dk-orb dk-moon" style={phase.moon ? { left: `${phase.moon[0]}%`, top: `${phase.moon[1]}%` } : { opacity: 0, pointerEvents: 'none' }} />
      <div className="dk-clouds">{[9, 19, 30, 14].map((top, index) =>
        <svg key={top} className="dk-cloud" viewBox="-10 -30 220 100" style={{ top: `${top}%`, width: [170, 120, 210, 90][index], animationDuration: `${[95, 120, 140, 110][index]}s`, animationDelay: `${[-20, -70, -40, -100][index]}s` }}>
          <path d="M40 60h120a22 22 0 0 0 0-44 30 30 0 0 0-56-10 26 26 0 0 0-44 18 20 20 0 0 0-20 36z" />
        </svg>)}</div>
      <svg className="dk-land" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: art }} />
      <div className="dk-shade" />
    </div>
    <div className="dk-band" aria-hidden="true" style={{ ...palette, background: sky }}>
      <svg className="dk-land dk-still" viewBox="0 430 1600 420" preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: art }} />
    </div>
  </>;
}

export function useDiamondLayout() {
  return useContext(DiamondLayoutContext);
}

export default function DiamondsLayout({ children }) {
  const { pathname } = useLocation();
  const [theme, setTheme] = useState(initialTheme);
  const [phase, setPhase] = useState(currentPhase);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(() => stored(localStorage, 'dk_theme') || 'random');
  const stars = useMemo(() => Array.from({ length: 90 }, () => {
    const size = 1 + Math.random() * 2.2;
    return { left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: size, height: size, animationDelay: `${-Math.random() * 4}s` };
  }), []);
  const requestedMode = diamondsModeForRoute(pathname);
  const isAuth = pathname === '/login' || pathname === '/forgot-password';
  const mode = requestedMode;
  const role = pathname.startsWith('/student') ? 'student' : isAuth ? 'auth' : 'staff';
  const portalLink = new URL(PORTAL);
  portalLink.searchParams.set('theme', theme);
  portalLink.searchParams.set('plain', '0');

  useLayoutEffect(() => {
    document.body.classList.add('dk');
    document.body.classList.toggle('dk-mode-scene', mode === 'scene');
    document.body.classList.toggle('dk-mode-plain', mode === 'plain');
    document.body.classList.remove('dk-plain-pref');
    document.body.dataset.dkRole = role;
  }, [mode, role]);

  useEffect(() => {
    const timer = window.setInterval(() => setPhase(currentPhase()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setPickerOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pickerOpen]);

  const chooseTheme = (key) => {
    save(localStorage, 'dk_theme', key);
    setSelectedTheme(key);
    const next = key === 'random'
      ? THEMES.map(({ key: item }) => item).filter((item) => item !== theme)[Math.floor(Math.random() * (THEMES.length - 1))]
      : key;
    save(sessionStorage, 'dk_theme', next);
    setTheme(next);
    setPickerOpen(false);
  };

  return <DiamondLayoutContext.Provider value={{ openThemePicker: () => setPickerOpen(true) }}>
    <Sky phase={phase} theme={theme} stars={stars} />
    <div className="dk-top">
      <div className="dk-top-l">{isAuth && <a className="dk-pill dk-portal" href={portalLink.href}>← <span>Cổng bài tập</span></a>}</div>
      <div className="dk-logo"><img src={siteLogo} alt="" /><span className="dk-wm"><b>Diamonds</b> <i>IELTS</i></span><span className="dk-app">Speaking</span></div>
      <div className="dk-top-r"><span className="dk-top-slot" id="dk-top-r" /><button className="dk-pill dk-themebtn" type="button" aria-label="Đổi chủ đề" onClick={() => setPickerOpen(true)}>▧</button></div>
    </div>
    {children}
    {pickerOpen && <div className="dk-sheet" onClick={(event) => { if (event.target === event.currentTarget) setPickerOpen(false); }}>
      <div className="dk-panel" role="dialog" aria-modal="true" aria-label="Chủ đề">
        <h2>Chủ đề</h2>
        <div className="dk-tiles" style={phaseStyle(PHASES[1])}>
          <div className="dk-grid">
            <button type="button" className={`dk-tile ${selectedTheme === 'random' ? 'dk-on' : ''}`} onClick={() => chooseTheme('random')}><span className="dk-th" style={{ background: 'linear-gradient(135deg,#2c7ad4,#b05a8e 50%,#ffc94d)' }} /><span>Ngẫu nhiên</span></button>
          </div>
          {GROUPS.map((group) => <div key={group.name}><h3>{group.name}</h3><div className="dk-grid">{group.items.map(([key, name]) =>
            <button type="button" key={key} className={`dk-tile ${selectedTheme === key ? 'dk-on' : ''}`} onClick={() => chooseTheme(key)}>
              <span className="dk-th" style={{ background: `linear-gradient(180deg,${PHASES[1].sky[0]},${PHASES[1].sky[1]} 60%,${PHASES[1].sky[2]})` }}><svg viewBox="250 220 1100 680" preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: prefixClasses(DRAW[key]()) }} /></span><span>{name}</span>
            </button>)}</div></div>)}
        </div>
      </div>
    </div>}
  </DiamondLayoutContext.Provider>;
}
