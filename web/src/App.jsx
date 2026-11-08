import { useEffect, useMemo, useRef, useState } from 'react'

const COPY = {
  en: {
    tagline: 'Ideas found in motion.', capture: 'Capture', journal: 'Journal',
    eyebrow: 'A quiet companion for wandering minds', heroA: 'Walk it out.', heroB: 'Write it down.',
    sub: 'Catch the thoughts that only arrive when you move — then decide which ones deserve a next step.',
    record: 'Record this moment', typing: 'or type a quick note', recent: 'From your recent walks', emptyRecent: 'Your next idea is waiting outside.',
    close: 'Close', voice: 'Voice', text: 'Text', voiceTitle: 'Speak while it’s alive.', voiceHint: 'Take your time. A little wind is okay.',
    start: 'Start recording', stop: 'Stop & transcribe', listening: 'Listening', transcribing: 'Turning voice into words…',
    noteTitle: 'What crossed your mind?', placeholder: 'I keep thinking about…', sourceVoice: 'Transcribed with', editHint: 'Read it back. You can edit anything.',
    addContext: 'Add a little context', mood: 'Mood', scene: 'Moment', location: 'Place (optional)', locationPh: 'Riverside, 7th Ave…',
    save: 'Keep this thought', saving: 'Finding its shape…', reset: 'Capture another', saved: 'Thought tucked away.', viewJournal: 'Open journal',
    verdictTitle: 'A gentle read', action: 'Worth acting on', hold: 'Let it simmer', emotion: 'A feeling to hold', override: 'Your call',
    overrideHint: 'The app offers a read. You always decide.', ai: 'AI read', local: 'Local read', yours: 'Your decision',
    journalTitle: 'Your field notes', journalSub: 'A living record of what surfaced while you were moving.',
    search: 'Search your thoughts…', all: 'All notes', selected: 'selected', export: 'Export Markdown', noIdeas: 'No thoughts here yet.',
    noMatch: 'Nothing matches this view.', select: 'Select note', today: 'Today', yesterday: 'Yesterday', error: 'Something went quiet. Please try again.',
    modern: 'Modern', vintage: 'Notebook', theme: 'Change theme', language: '切换中文',
    moods: ['Clear', 'Curious', 'Restless', 'Hopeful'], contexts: ['Walk', 'Commute', 'Spark'],
  },
  zh: {
    tagline: '在行走中，遇见想法。', capture: '捕捉', journal: '日记',
    eyebrow: '给游走思绪的一位安静搭子', heroA: '走出去。', heroB: '记下来。',
    sub: '接住那些只在移动时出现的念头，再看看，哪一个值得迈出下一步。',
    record: '记录此刻想法', typing: '或写一条快记', recent: '最近散步拾得', emptyRecent: '下一个想法，正在门外等你。',
    close: '关闭', voice: '语音', text: '文字', voiceTitle: '趁它鲜活，说出来。', voiceHint: '慢慢说。一点风声，也没关系。',
    start: '开始录音', stop: '停止并转写', listening: '正在聆听', transcribing: '正在把声音变成文字…',
    noteTitle: '刚才什么掠过脑海？', placeholder: '我一直在想……', sourceVoice: '转写引擎', editHint: '读一遍。任何文字都可以修改。',
    addContext: '添一点当时的背景', mood: '心情', scene: '场景', location: '地点（可选）', locationPh: '河边，第七大道……',
    save: '收好这个想法', saving: '正在看清它的形状……', reset: '再记一个', saved: '想法已经收好。', viewJournal: '打开日记',
    verdictTitle: '温柔判断', action: '值得行动', hold: '先搁置', emotion: '只是情绪', override: '由你决定',
    overrideHint: 'App 只提供一个看法，最终决定永远属于你。', ai: 'AI 判断', local: '本地判断', yours: '你的决定',
    journalTitle: '你的散步札记', journalSub: '一本持续生长的日记，记下那些在移动中浮现的东西。',
    search: '搜索想法……', all: '全部', selected: '条已选', export: '导出 Markdown', noIdeas: '这里还没有想法。',
    noMatch: '没有符合当前条件的想法。', select: '选择这条', today: '今天', yesterday: '昨天', error: '刚刚走神了，请再试一次。',
    modern: '现代', vintage: '日记本', theme: '切换主题', language: 'Switch to English',
    moods: ['清醒', '好奇', '不安', '期待'], contexts: ['散步', '通勤', '灵感瞬间'],
  },
}

const VERDICTS = ['action', 'hold', 'emotion']

function Icon({ name, size = 20 }) {
  const paths = {
    walk: <><path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m9 22 2.4-6 2.6 2v4M6 12l3-3 3 1 2 4 4 1M11 10l-1 5-4 3"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    mic: <><rect width="8" height="13" x="8" y="2" rx="4"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/></>,
    pen: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    spark: <path d="m12 3-1.2 5.1L7 11l3.8 2.9L12 19l1.2-5.1L17 11l-3.8-2.9Z"/>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const api = {
  async list(verdict = '', search = '') {
    const params = new URLSearchParams()
    if (verdict) params.set('verdict', verdict)
    if (search) params.set('search', search)
    const res = await fetch(`/api/ideas?${params}`)
    if (!res.ok) throw new Error('Could not load ideas')
    return res.json()
  },
  async create(payload) {
    const res = await fetch('/api/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) throw new Error((await res.json()).detail || 'Could not save idea')
    return res.json()
  },
  async updateVerdict(id, verdict) {
    const res = await fetch(`/api/ideas/${id}/verdict`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verdict }) })
    if (!res.ok) throw new Error('Could not update verdict')
    return res.json()
  },
  async transcribe(blob, language) {
    const form = new FormData()
    form.append('audio', blob, 'walk-note.webm')
    form.append('language', language)
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    if (!res.ok) throw new Error((await res.json()).detail || 'Could not transcribe')
    return res.json()
  },
}

function VerdictPill({ verdict, t, compact = false }) {
  return <span className={`verdict-pill ${verdict} ${compact ? 'compact' : ''}`}><span className="pill-mark">{verdict === 'action' ? '↗' : verdict === 'hold' ? '◌' : '≈'}</span>{t[verdict]}</span>
}

function Header({ page, setPage, lang, setLang, theme, setTheme, t }) {
  return <header className="topbar">
    <button className="brand" onClick={() => setPage('capture')} aria-label="WanderNote home">
      <span className="brand-mark"><span></span><span></span><span></span></span>
      <span><b>WanderNote</b><small>{t.tagline}</small></span>
    </button>
    <nav className="desktop-nav" aria-label="Primary">
      <button className={page === 'capture' ? 'active' : ''} onClick={() => setPage('capture')}>{t.capture}</button>
      <button className={page === 'journal' ? 'active' : ''} onClick={() => setPage('journal')}>{t.journal}</button>
    </nav>
    <div className="top-actions">
      <button className="text-action" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>{lang === 'en' ? '中' : 'EN'}</button>
      <button className="theme-toggle" onClick={() => setTheme(theme === 'modern' ? 'vintage' : 'modern')} aria-label={t.theme} title={t.theme}>
        <span className={theme === 'vintage' ? 'on' : ''}></span><Icon name="book" size={16}/>
      </button>
    </div>
  </header>
}

function CapturePage({ t, lang, onSaved, latest, openComposer }) {
  return <main className="capture-page">
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><Icon name="walk" size={17}/>{t.eyebrow}</p>
        <h1><span>{t.heroA}</span><em>{t.heroB}</em></h1>
        <p className="hero-sub">{t.sub}</p>
        <div className="capture-actions">
          <button className="record-button" onClick={() => openComposer('voice')}><span className="record-core"><Icon name="mic" size={25}/></span><span>{t.record}<small>{t.typing}</small></span><Icon name="arrow" size={21}/></button>
          <button className="quick-type" onClick={() => openComposer('text')}><Icon name="pen" size={18}/>{t.typing}</button>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="sun"></div><div className="hill hill-back"></div><div className="hill hill-front"></div>
        <svg className="trail" viewBox="0 0 500 450"><path d="M440 420C350 366 363 311 287 281c-65-25-18-94-89-122-55-22-39-84-74-129"/><path className="trail-dash" d="M440 420C350 366 363 311 287 281c-65-25-18-94-89-122-55-22-39-84-74-129"/></svg>
        <div className="walker"><span className="head"></span><span className="body"></span><span className="leg one"></span><span className="leg two"></span></div>
        <p>01<br/><span>notice</span></p><p>02<br/><span>name it</span></p><p>03<br/><span>choose</span></p>
      </div>
    </section>
    <section className="recent-strip">
      <div className="section-label"><span>{t.recent}</span><span className="rule"></span></div>
      {latest ? <article className="latest-card">
        <div className="quote-mark">“</div>
        <div className="latest-content"><p>{latest.content}</p><VerdictPill verdict={latest.verdict} t={t} compact/></div>
        <time>{formatRelative(latest.created_at, lang, t)}</time>
      </article> : <p className="empty-poem">{t.emptyRecent}</p>}
    </section>
    <p className="motto">Move through the world · Meet what moves through you</p>
  </main>
}

function Composer({ initialMode, t, lang, onClose, onSaved }) {
  const [mode, setMode] = useState(initialMode)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [context, setContext] = useState(lang === 'zh' ? '散步' : 'Walk')
  const [location, setLocation] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [sttProvider, setSttProvider] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const recorder = useRef(null)
  const stream = useRef(null)
  const chunks = useRef([])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setElapsed(x => x + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(() => () => stream.current?.getTracks().forEach(track => track.stop()), [])

  async function startRecording() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Audio recording is not supported in this browser.')
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
      recorder.current = new MediaRecorder(stream.current, preferred ? { mimeType: preferred } : undefined)
      chunks.current = []
      recorder.current.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      recorder.current.start(250)
      setElapsed(0); setRecording(true)
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'Microphone permission was not granted.' : e.message)
    }
  }

  function stopRecording() {
    if (!recorder.current || recorder.current.state === 'inactive') return
    recorder.current.onstop = async () => {
      stream.current?.getTracks().forEach(track => track.stop())
      setRecording(false); setTranscribing(true); setError('')
      try {
        const result = await api.transcribe(new Blob(chunks.current, { type: recorder.current.mimeType || 'audio/webm' }), lang === 'zh' ? 'zh' : 'en')
        setContent(result.text); setSttProvider(result.provider)
      } catch (e) { setError(e.message) }
      finally { setTranscribing(false) }
    }
    recorder.current.stop()
  }

  async function save() {
    if (content.trim().length < 2) return
    setSaving(true); setError('')
    try {
      const result = await api.create({ content: content.trim(), source: mode === 'voice' ? 'voice' : 'text', mood, context, location })
      setSaved(result); onSaved(result)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function override(verdict) {
    if (!saved || verdict === saved.verdict) return
    try {
      const updated = await api.updateVerdict(saved.id, verdict)
      setSaved(updated); onSaved(updated)
    } catch (e) { setError(e.message) }
  }

  const reset = () => { setSaved(null); setContent(''); setMood(''); setLocation(''); setSttProvider(''); setError('') }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.record}>
    <div className="composer">
      <div className="composer-top"><div className="mode-switch"><button className={mode === 'voice' ? 'active' : ''} onClick={() => !recording && setMode('voice')}><Icon name="mic" size={17}/>{t.voice}</button><button className={mode === 'text' ? 'active' : ''} onClick={() => !recording && setMode('text')}><Icon name="pen" size={17}/>{t.text}</button></div><button className="icon-button" onClick={() => onClose(false)} aria-label={t.close}><Icon name="close"/></button></div>
      {saved ? <SavedState saved={saved} t={t} onOverride={override} onReset={reset} onClose={() => onClose(true)}/> : <>
        <div className="composer-scroll">
          {mode === 'voice' && !content && <section className="voice-stage">
            <div className={`voice-orb ${recording ? 'recording' : ''} ${transcribing ? 'thinking' : ''}`}>
              <span></span><span></span><span></span><span></span><Icon name="mic" size={32}/>
            </div>
            <h2>{transcribing ? t.transcribing : recording ? t.listening : t.voiceTitle}</h2>
            <p>{recording ? formatTimer(elapsed) : t.voiceHint}</p>
            {!transcribing && <button className={`voice-control ${recording ? 'stop' : ''}`} onClick={recording ? stopRecording : startRecording}>{recording ? <span className="stop-square"/> : <span className="red-dot"/>}{recording ? t.stop : t.start}</button>}
          </section>}
          {(mode === 'text' || content) && <section className="note-stage">
            <div className="note-heading"><div><p className="step-number">01 / IDEA</p><h2>{t.noteTitle}</h2></div>{sttProvider && <span className="stt-source">{t.sourceVoice}: {sttProvider}</span>}</div>
            <textarea autoFocus={mode === 'text'} value={content} onChange={e => setContent(e.target.value)} placeholder={t.placeholder} maxLength={8000}/>
            {sttProvider && <p className="edit-hint"><Icon name="pen" size={14}/>{t.editHint}</p>}
          </section>}
          <section className="context-stage">
            <p className="step-number">02 / CONTEXT</p><h3>{t.addContext}</h3>
            <label>{t.mood}</label><div className="chip-row">{t.moods.map(item => <button key={item} className={mood === item ? 'selected' : ''} onClick={() => setMood(mood === item ? '' : item)}>{item}</button>)}</div>
            <label>{t.scene}</label><div className="chip-row">{t.contexts.map(item => <button key={item} className={context === item ? 'selected' : ''} onClick={() => setContext(item)}>{item}</button>)}</div>
            <label className="location-input"><Icon name="pin" size={17}/><input value={location} onChange={e => setLocation(e.target.value)} placeholder={t.locationPh} maxLength={120}/></label>
          </section>
          {error && <p className="error-banner">{error}</p>}
        </div>
        <div className="composer-footer"><span>{content.length ? `${content.length} / 8000` : ''}</span><button className="save-button" disabled={content.trim().length < 2 || saving || transcribing || recording} onClick={save}>{saving ? t.saving : t.save}<Icon name="arrow" size={19}/></button></div>
      </>}
    </div>
  </div>
}

function SavedState({ saved, t, onOverride, onReset, onClose }) {
  return <div className="saved-state">
    <div className="saved-check"><Icon name="check" size={30}/></div><p className="step-number">{t.saved}</p>
    <h2>{t.verdictTitle}</h2><VerdictPill verdict={saved.verdict} t={t}/>
    <blockquote>“{saved.content}”</blockquote>
    <div className="reason-box"><span><Icon name="spark" size={16}/>{saved.verdict_source === 'deepseek' ? t.ai : saved.verdict_source === 'user' ? t.yours : t.local}</span><p>{saved.verdict_reason}</p></div>
    <div className="override-box"><div><b>{t.override}</b><small>{t.overrideHint}</small></div><div className="verdict-choices">{VERDICTS.map(v => <button key={v} className={saved.verdict === v ? `selected ${v}` : ''} onClick={() => onOverride(v)}>{v === 'action' ? '↗' : v === 'hold' ? '◌' : '≈'}<span>{t[v]}</span></button>)}</div></div>
    <div className="saved-actions"><button onClick={onReset}>{t.reset}</button><button className="primary" onClick={onClose}>{t.viewJournal}<Icon name="arrow" size={18}/></button></div>
  </div>
}

function JournalPage({ t, lang, refreshKey, onIdeaChanged }) {
  const [ideas, setIdeas] = useState([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      api.list(filter, search).then(setIdeas).catch(e => setError(e.message)).finally(() => setLoading(false))
    }, search ? 220 : 0)
    return () => clearTimeout(timer)
  }, [filter, search, refreshKey])

  useEffect(() => setSelected(new Set()), [filter, search])

  const grouped = useMemo(() => ideas.reduce((acc, idea) => {
    const day = idea.created_at.slice(0, 10); (acc[day] ||= []).push(idea); return acc
  }, {}), [ideas])

  async function changeVerdict(idea, verdict) {
    try {
      const updated = await api.updateVerdict(idea.id, verdict)
      setIdeas(items => items.map(x => x.id === idea.id ? updated : x)); onIdeaChanged(updated)
    } catch (e) { setError(e.message) }
  }

  function toggle(id) { setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next }) }

  function exportMarkdown() {
    const chosen = ideas.filter(x => selected.has(x.id))
    if (!chosen.length) return
    const lines = ['# WanderNote — Idea Journal', '', `_Exported ${new Date().toLocaleString()}_`, '']
    chosen.forEach(item => {
      lines.push(`## ${new Date(item.created_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}`, '', item.content, '', `- **Verdict:** ${t[item.verdict]}`, `- **Reason:** ${item.verdict_reason}`)
      if (item.mood) lines.push(`- **${t.mood}:** ${item.mood}`)
      if (item.context) lines.push(`- **${t.scene}:** ${item.context}`)
      if (item.location) lines.push(`- **${t.location}:** ${item.location}`)
      lines.push('', '---', '')
    })
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `wandernote-${new Date().toISOString().slice(0, 10)}.md`; anchor.click(); URL.revokeObjectURL(url)
  }

  return <main className="journal-page">
    <header className="journal-header"><div><p className="eyebrow"><Icon name="book" size={17}/>{t.journal}</p><h1>{t.journalTitle}</h1><p>{t.journalSub}</p></div><div className="journal-count"><b>{String(ideas.length).padStart(2, '0')}</b><span>FIELD<br/>NOTES</span></div></header>
    <section className="journal-tools">
      <label className="search-box"><Icon name="search" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}/>{search && <button onClick={() => setSearch('')}><Icon name="close" size={15}/></button>}</label>
      <div className="filters"><button className={!filter ? 'active' : ''} onClick={() => setFilter('')}>{t.all}</button>{VERDICTS.map(v => <button key={v} className={filter === v ? `active ${v}` : ''} onClick={() => setFilter(v)}>{t[v]}</button>)}</div>
    </section>
    {error && <p className="error-banner">{error}</p>}
    <section className={`timeline ${loading ? 'loading' : ''}`}>
      {!loading && !ideas.length && <div className="empty-state"><span>·</span><Icon name="walk" size={42}/><h2>{search || filter ? t.noMatch : t.noIdeas}</h2></div>}
      {Object.entries(grouped).map(([day, dayIdeas]) => <div className="day-group" key={day}>
        <div className="day-marker"><span></span><h2>{formatDay(day, lang, t)}</h2><small>{new Date(`${day}T12:00:00`).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric' })}</small></div>
        <div className="day-ideas">{dayIdeas.map(idea => <article className={`idea-card ${selected.has(idea.id) ? 'selected-card' : ''}`} key={idea.id}>
          <button className={`select-box ${selected.has(idea.id) ? 'checked' : ''}`} onClick={() => toggle(idea.id)} aria-label={t.select}>{selected.has(idea.id) && <Icon name="check" size={14}/>}</button>
          <div className="idea-meta"><time>{new Date(idea.created_at).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</time><VerdictPill verdict={idea.verdict} t={t} compact/></div>
          <p className="idea-text">{idea.content}</p>
          <p className="idea-reason"><Icon name="spark" size={15}/>{idea.verdict_reason}</p>
          <div className="idea-bottom"><div className="idea-tags">{idea.context && <span>{idea.context}</span>}{idea.mood && <span>{idea.mood}</span>}{idea.location && <span><Icon name="pin" size={12}/>{idea.location}</span>}</div><select aria-label={t.override} value={idea.verdict} onChange={e => changeVerdict(idea, e.target.value)}><option value="action">{t.action}</option><option value="hold">{t.hold}</option><option value="emotion">{t.emotion}</option></select></div>
        </article>)}</div>
      </div>)}
    </section>
    {selected.size > 0 && <div className="export-bar"><span><b>{selected.size}</b> {t.selected}</span><button onClick={() => setSelected(new Set())}>{t.close}</button><button className="export-button" onClick={exportMarkdown}><Icon name="download" size={18}/>{t.export}</button></div>}
  </main>
}

function formatTimer(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
function formatRelative(iso, lang, t) {
  const date = new Date(iso); const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return lang === 'zh' ? '刚刚' : 'just now'
  if (mins < 60) return lang === 'zh' ? `${mins} 分钟前` : `${mins}m ago`
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
}
function formatDay(day, lang, t) {
  const now = new Date(); const target = new Date(`${day}T12:00:00`); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const diff = Math.round((today - target) / 86400000)
  if (diff === 0) return t.today
  if (diff === 1) return t.yesterday
  return target.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long' })
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('wandernote-lang') || 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('wandernote-theme') || 'modern')
  const [page, setPage] = useState('capture')
  const [composer, setComposer] = useState(null)
  const [latest, setLatest] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const t = COPY[lang]

  useEffect(() => { localStorage.setItem('wandernote-lang', lang); document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en' }, [lang])
  useEffect(() => { localStorage.setItem('wandernote-theme', theme) }, [theme])
  useEffect(() => { api.list().then(items => setLatest(items[0] || null)).catch(() => {}) }, [])
  function saved(idea) { setLatest(idea); setRefreshKey(x => x + 1) }
  function closeComposer() { setComposer(null) }

  return <div className={`app theme-${theme}`}>
    <Header page={page} setPage={setPage} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} t={t}/>
    {page === 'capture' ? <CapturePage t={t} lang={lang} latest={latest} onSaved={saved} openComposer={setComposer}/> : <JournalPage t={t} lang={lang} refreshKey={refreshKey} onIdeaChanged={saved}/>} 
    <nav className="mobile-nav"><button className={page === 'capture' ? 'active' : ''} onClick={() => setPage('capture')}><Icon name="walk" size={21}/>{t.capture}</button><button className="nav-capture" onClick={() => setComposer('voice')}><Icon name="mic" size={23}/></button><button className={page === 'journal' ? 'active' : ''} onClick={() => setPage('journal')}><Icon name="book" size={20}/>{t.journal}</button></nav>
    {composer && <Composer key={`${composer}-${lang}`} initialMode={composer} t={t} lang={lang} onClose={(goToJournal) => { closeComposer(); if (goToJournal) setPage('journal') }} onSaved={saved}/>} 
  </div>
}
