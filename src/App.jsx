import { useEffect, useRef, useState } from 'react'

import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Map,
  Heart,
  House,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Send,
  SlidersHorizontal,
  X
} from 'lucide-react'

import { profiles } from './data'
import CityMap from './CityMap'
import './styles.css'


const nav = [
  { id: 'discover', Icon: House, label: 'Discover' },
  { id: 'explore', Icon: Map, label: 'Explore' },
  { id: 'likes', Icon: Heart, label: 'Likes' },
  { id: 'messages', Icon: MessageCircle, label: 'Messages' },
]
const validPage = new URLSearchParams(window.location.search).get('page')
const startPage = nav.some(n => n.id === validPage) ? validPage : 'discover'
const SWIPE_LIMIT = 68


// Temporary on-device viewport diagnostics. Remove after the iPhone test.
// function ViewportDebug() {
//   const [metrics, setMetrics] = useState(null)

//   useEffect(() => {
//     let frame = null
//     const measure = () => {
//       if (frame !== null) cancelAnimationFrame(frame)
//       frame = requestAnimationFrame(() => {
//         const root = document.getElementById('root')
//         const shell = document.querySelector('.app-shell')
//         setMetrics({
//           innerHeight: window.innerHeight,
//           screenHeight: window.screen.height,
//           visualViewport: window.visualViewport?.height ?? 'N/A',
//           rootHeight: root?.getBoundingClientRect().height ?? 'N/A',
//           appHeight: shell?.getBoundingClientRect().height ?? 'N/A',
//           standalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
//         })
//       })
//     }
//     measure()
//     window.addEventListener('resize', measure)
//     window.visualViewport?.addEventListener('resize', measure)
//     const delayed = window.setTimeout(measure, 1000)
//     return () => {
//       window.removeEventListener('resize', measure)
//       window.visualViewport?.removeEventListener('resize', measure)
//       window.clearTimeout(delayed)
//       if (frame !== null) cancelAnimationFrame(frame)
//     }
//   }, [])

//   if (!metrics) return null
//   return (
//     <aside aria-label="Temporary viewport diagnostics" style={{
//       position: 'fixed', top: '115px', left: '10px', zIndex: 99999,
//       padding: '10px 12px', background: 'rgba(0,0,0,0.88)',
//       color: '#6eff85', fontFamily: 'monospace', fontSize: '12px',
//       lineHeight: 1.55, borderRadius: '8px', pointerEvents: 'none',
//       textShadow: 'none',
//     }}>
//       <div>innerHeight: {metrics.innerHeight}</div>
//       <div>screenHeight: {metrics.screenHeight}</div>
//       <div>visualViewport: {metrics.visualViewport}</div>
//       <div>rootHeight: {metrics.rootHeight}</div>
//       <div>appHeight: {metrics.appHeight}</div>
//       <div>standalone: {String(metrics.standalone)}</div>
//     </aside>
//   )
// }

export default function App() {
  const [page, setPage] = useState(startPage)
  const [profileIndex, setProfileIndex] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [photoFlash, setPhotoFlash] = useState(0)
  const [swipeOut, setSwipeOut] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [liked, setLiked] = useState([])
  const [passed, setPassed] = useState([])
  const [mapSelected, setMapSelected] = useState('nellie')
  const [chatText, setChatText] = useState('')
  const [messages, setMessages] = useState([])
  const dragOrigin = useRef(null)
  const suppressClick = useRef(false)
  const blockClick = useRef(false)
  const swipeTimer = useRef(null)
  const holdTimer = useRef(null)
  const profile = profiles[profileIndex]
  const mapProfile = profiles.find(p => p.id === mapSelected) || profiles[0]
  const photo = profile.photos[photoIndex] || profile.photos[0]
  const nextProfile = profile
  const swiping = isDragging

  function reset() {
    clearTimeout(swipeTimer.current)
    setPage('discover'); setProfileIndex(0); setPhotoIndex(0)
    setDragX(0); setIsDragging(false); setSwipeOut(null); setDetailsOpen(false); setControlsOpen(false)
    setLiked([]); setPassed([]); setMapSelected('nellie'); setMessages([]); setChatText('')
  }

  function movePhoto(direction) {
    if (swipeOut) return
    setPhotoIndex(i => Math.max(0, Math.min(profile.photos.length - 1, i + direction)))
    setPhotoFlash(n => n + 1)
  }

  // Single-actor playback: horizontal gestures browse the 5 photos, never another person.
  function changeProfile(direction, decision = null) {
    if (swipeOut) return
    if (decision === 'like') {
      setLiked(old => old.includes(profile.id) ? old.filter(id => id !== profile.id) : [...old, profile.id])
      setIsDragging(false); setDragX(0)
      return
    }
    if (decision === 'pass') {
      setPhotoIndex(0); setPhotoFlash(n => n + 1)
      setIsDragging(false); setDragX(0)
      return
    }
    setIsDragging(false)
    setDragX(0)
    movePhoto(direction === 'left' ? 1 : -1)
  }

  function openProfile(id) {
    const index = profiles.findIndex(p => p.id === id)
    if (index < 0) return
    clearTimeout(swipeTimer.current)
    setProfileIndex(index); setPhotoIndex(0); setSwipeOut(null); setDragX(0)
    setPage('discover'); setDetailsOpen(false)
  }

  function onPointerDown(event) {
    if (swipeOut || event.target.closest('button')) return
    dragOrigin.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false }
    suppressClick.current = false
    setIsDragging(true)
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch (_) {}
  }
  function onPointerMove(event) {
    const start = dragOrigin.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * .75) {
      start.moved = true
      suppressClick.current = true
      setDragX(Math.max(-260, Math.min(260, dx)))
    }
  }
  function onPointerUp(event) {
    const start = dragOrigin.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dragged = start.moved
    dragOrigin.current = null
    setIsDragging(false)
    if (dragged && Math.abs(dx) >= SWIPE_LIMIT) {
      suppressClick.current = true
      changeProfile(dx > 0 ? 'right' : 'left')
    } else {
      setDragX(0)
      if (!dragged) {
        const r = event.currentTarget.getBoundingClientRect()
        movePhoto(event.clientX - r.left < r.width / 2 ? -1 : 1)
      }
    }
  }
  function onPhotoTap(event) {
    // Taps are handled on pointer-up so swipes never trigger a photo advance.
    event.preventDefault()
  }

  useEffect(() => {
    const listener = event => {
      if (event.shiftKey && event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); return }
      if (page !== 'discover' || detailsOpen || controlsOpen) return
      if (event.key === 'ArrowLeft') changeProfile('left')
      if (event.key === 'ArrowRight') changeProfile('right')
      if (event.key === 'ArrowUp') movePhoto(-1)
      if (event.key === 'ArrowDown') movePhoto(1)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [page, profileIndex, photoIndex, swipeOut, detailsOpen, controlsOpen])
  useEffect(() => () => { clearTimeout(swipeTimer.current); clearTimeout(holdTimer.current) }, [])

  const onAvatarDown = () => { holdTimer.current = setTimeout(() => setControlsOpen(true), 700) }
  const onAvatarUp = () => clearTimeout(holdTimer.current)

  const backgroundPhoto = photo

  return <main className={`app-shell page-${page}`}>
    
    <div className="ambient-photo" style={{ backgroundImage: `url("${backgroundPhoto}")` }} />
    <div className="ambient-overlay" />

    <header className="topbar">
      <button className="profile-avatar glass" aria-label="Playback settings (long press)" onPointerDown={onAvatarDown} onPointerUp={onAvatarUp} onPointerLeave={onAvatarUp} onContextMenu={e => { e.preventDefault(); setControlsOpen(true) }}>
        <img
          src={`${import.meta.env.BASE_URL}photos/profile.png`}
          alt="Dora"
          className="dora-avatar"
        />
      </button>
      <div className="header-actions">
        <button className="header-icon glass" onClick={() => setPage('messages')} aria-label="Messages"><MessageCircle size={18} /><i className="unread-dot" /></button>
        <button className="header-icon glass" onClick={() => setControlsOpen(true)} aria-label="More options"><MoreHorizontal size={20} /></button>
      </div>
    </header>

    {page === 'discover' && <section className="discover-screen" aria-label="Discover profiles">

      <div
        className="profile-card"
        style={{ '--drag-x': `${dragX}px`, '--drag-rotate': `${dragX / 23}deg`, backgroundImage: `url("${photo}")`, transition: swiping ? 'none' : undefined }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={() => {dragOrigin.current = null; setIsDragging(false); setDragX(0)}}
        onClick={onPhotoTap}
      >
        <div key={`${profile.id}-${photoIndex}-${photoFlash}`} className="photo-reveal" />
        <div className="card-shade" />
        <div className="photo-bars">{profile.photos.map((_, i) => <span key={i} className={i <= photoIndex ? 'filled' : ''} />)}</div>

        <div className="card-info">
          <div className="person-name"><h1>{profile.name}<span>, {profile.age}</span></h1><span className="tiny-star">✦</span></div>
          <p className="person-location"><MapPin size={13} /> {profile.location}</p>
          <div className="person-tags"><span>{profile.distance}</span><span>{profile.job}</span></div>
          <p className="person-bio">{profile.bio}</p>
          <button className="view-more" onClick={() => setDetailsOpen(true)}>VIEW PROFILE <ArrowUpRight size={15} /></button>
        </div>
      </div>
      <div className="card-actions">
        <button className="action-pass glass" aria-label="Restart Nellie's photos" onClick={() => changeProfile('left', 'pass')}><RotateCcw size={22} strokeWidth={1.8}/></button>
        <button className={`action-like glass ${liked.includes(profile.id) ? 'is-liked' : ''}`} aria-label="Like Nellie" onClick={() => changeProfile('left', 'like')}><Heart size={24} fill={liked.includes(profile.id) ? 'currentColor' : 'none'} strokeWidth={1.5}/></button>
      </div>
    </section>}

    {page === 'explore' && <section className="explore-screen" aria-label="Explore nearby">
      <CityMap profile={profile} onOpenProfile={() => openProfile(profile.id)} />
      <button className="map-profile-preview glass" onClick={() => openProfile(profile.id)}>
        <img src={profile.photos[0]} alt="Nellie" />
        <span className="map-preview-copy"><strong>{profile.name}, {profile.age}</strong><small>{profile.distance} <b>·</b> {profile.job}</small></span>
        <ArrowUpRight size={20}/>
      </button>
    </section>}

    {page === 'likes' && <section className="panel-screen"><div className="panel-heading"><span>YOUR CONNECTIONS</span><h2>Likes</h2></div>
      {liked.length ? <div className="likes-grid">{profiles.filter(p => liked.includes(p.id)).map(p => <button key={p.id} onClick={() => openProfile(p.id)}><img src={p.photos[0]} alt=""/><strong>{p.name}, {p.age}</strong></button>)}</div> : <div className="empty-state"><Heart size={42} strokeWidth={1.2}/><h3>No likes yet</h3><p>When you like someone, they’ll show up here.</p><button onClick={() => setPage('discover')}>Discover people</button></div>}
    </section>}

    {page === 'messages' && <section className="panel-screen messages-screen"><div className="panel-heading"><span>YOUR CONVERSATIONS</span><h2>Messages</h2></div>
      <div className="thread-person"><img src={profiles[0].photos[0]} alt=""/><div><strong>Nellie</strong><span>Online now</span></div><i /></div>
      <div className="chat-log"><div className="bubble incoming">Hey ✨</div><div className="bubble incoming">What's your idea of a perfect evening?</div>{messages.map((text, i) => <div className="bubble outgoing" key={i}>{text}</div>)}</div>
      <form className="chat-input glass" onSubmit={e => {e.preventDefault(); if (chatText.trim()) {setMessages(m => [...m, chatText.trim()]); setChatText('')}}}><input aria-label="Message" placeholder="Message..." value={chatText} onChange={e => setChatText(e.target.value)}/><button type="submit" aria-label="Send"><Send size={18}/></button></form>
    </section>}

    <nav className="bottom-nav glass" aria-label="Main navigation">{nav.map(({id, Icon, label}) => <button key={id} className={page === id ? 'active' : ''} onClick={() => {setPage(id); setDetailsOpen(false)}} aria-label={label}><Icon size={22} strokeWidth={page === id ? 2.6 : 1.8} fill={id === 'likes' && page === id ? 'currentColor' : 'none'}/></button>)}</nav>

    {detailsOpen && <div className="modal-backdrop" onClick={() => setDetailsOpen(false)}><section className="detail-sheet" onClick={e => e.stopPropagation()}><button className="sheet-close" onClick={() => setDetailsOpen(false)} aria-label="Close"><X size={21}/></button><p className="sheet-kicker">ABOUT ME</p><h2>{profile.name}, {profile.age}</h2><p className="sheet-location"><MapPin size={16}/> {profile.location} · {profile.distance}</p><p className="sheet-bio">“{profile.bio}”</p><div className="interest-list">{profile.interests.map(t => <span key={t}>{t}</span>)}</div><button className="sheet-action" onClick={() => {setDetailsOpen(false); changeProfile('left', 'like')}}><Heart size={18}/> Like {profile.name}</button></section></div>}

    {controlsOpen && <div className="modal-backdrop" onClick={() => setControlsOpen(false)}><section className="detail-sheet control-sheet" onClick={e => e.stopPropagation()}><button className="sheet-close" onClick={() => setControlsOpen(false)} aria-label="Close"><X size={21}/></button><p className="sheet-kicker">CREW ONLY</p><h2>Playback controls</h2><p>Reset before each take. Shift + R also resets the app.</p><button className="sheet-action" onClick={reset}><RotateCcw size={18}/> Reset to Nellie / Photo 1</button><button className="secondary-action" onClick={() => {setControlsOpen(false); setPage('explore'); setMapSelected('nellie')}}><Compass size={18}/> Open Explore map</button></section></div>}
  </main>
}
