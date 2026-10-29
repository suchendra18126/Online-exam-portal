const { useState, useEffect, useRef, useCallback } = React;
const API = '';  // same origin

/* ============================================================
   API HELPERS
   ============================================================ */
async function apiCall(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

/* ============================================================
   EXAM STATUS HELPER
   ============================================================ */
function getExamStatus(exam) {
  const now = new Date();
  const start = exam.scheduled_start ? new Date(exam.scheduled_start) : null;
  const end   = exam.scheduled_end   ? new Date(exam.scheduled_end)   : null;
  if (start && now < start) return 'upcoming';
  if (end && now > end) return 'ended';
  return 'active';
}

function formatDT(isoStr) {
  if (!isoStr) return 'N/A';
  return new Date(isoStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ============================================================
   AUTH CONTEXT (page-level state)
   ============================================================ */
function OnlineExamApp() {
  const [token, setToken]   = useState(() => localStorage.getItem('exam_token') || '');
  const [user, setUser]     = useState(null);
  const [page, setPage]     = useState('auth');          // 'auth' | 'dashboard' | 'admin'
  const [subPage, setSubPage] = useState('');            // for nested views
  const [authMode, setAuthMode] = useState('login');     // 'login' | 'register'
  const [pageHistory, setPageHistory] = useState([]);

  const navigate = useCallback((to, sub = '') => {
    setPageHistory(h => [...h, { page, subPage }]);
    setPage(to);
    setSubPage(sub);
    window.scrollTo(0, 0);
  }, [page, subPage]);

  const goBack = useCallback(() => {
    const hist = [...pageHistory];
    const prev = hist.pop();
    setPageHistory(hist);
    if (prev) { setPage(prev.page); setSubPage(prev.subPage); }
    else       { setPage(user?.role === 'admin' ? 'admin' : 'dashboard'); setSubPage(''); }
    window.scrollTo(0, 0);
  }, [pageHistory, user]);

  // Restore session on mount
  useEffect(() => {
    if (!token) { setPage('auth'); return; }
    apiCall('/api/auth/me', 'GET', null, token)
      .then(u => {
        setUser(u);
        setPage(u.role === 'admin' ? 'admin' : 'dashboard');
      })
      .catch(() => { logout(); });
  }, []);

  const login = (tok, u) => {
    localStorage.setItem('exam_token', tok);
    setToken(tok);
    setUser(u);
    setPageHistory([]);
    setPage(u.role === 'admin' ? 'admin' : 'dashboard');
  };

  const logout = () => {
    localStorage.removeItem('exam_token');
    setToken('');
    setUser(null);
    setPage('auth');
    setPageHistory([]);
  };

  if (page === 'auth') return <AuthPage onLogin={login} />;

  return (
    <div>
      <AppHeader user={user} onLogout={logout}
        onBrand={() => { setPage(user?.role === 'admin' ? 'admin' : 'dashboard'); setSubPage(''); setPageHistory([]); }} />

      {page === 'dashboard' && (
        <StudentDashboard token={token} user={user} navigate={navigate} goBack={goBack} pageHistory={pageHistory} />
      )}
      {page === 'admin' && (
        <AdminDashboard token={token} user={user} navigate={navigate} goBack={goBack} subPage={subPage} pageHistory={pageHistory} />
      )}
      {page === 'exam-runner' && (
        <ExamRunner token={token} user={user} examId={subPage} onDone={() => navigate('dashboard')} goBack={goBack} />
      )}
    </div>
  );
}

/* ============================================================
   HEADER
   ============================================================ */
function AppHeader({ user, onLogout, onBrand }) {
  return (
    <header className="app-header">
      <div className="brand" onClick={onBrand}>
        <div className="brand-icon"><i className="fa-solid fa-graduation-cap"></i></div>
        <span>EXAM<span style={{color:'#6366f1'}}>NEXUS</span></span>
      </div>
      <div className="header-right">
        {user && (
          <div className="user-pill">
            <img src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`} alt="" />
            <span className="user-pill-name">{user.name}</span>
            <span className={`role-badge ${user.role}`}>{user.role}</span>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </header>
  );
}

/* ============================================================
   AUTH PAGE
   ============================================================ */
function AuthPage({ onLogin }) {
  const [mode, setMode]   = useState('login');
  const [role, setRole]   = useState('student');   // for login context
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      let data;
      if (mode === 'register') {
        data = await apiCall('/api/auth/register', 'POST', { name, email, password: pass, role: 'student' });
      } else {
        data = await apiCall('/api/auth/login', 'POST', { email, password: pass });
      }
      onLogin(data.access_token, data.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const handleDemo = async (r) => {
    setErr(''); setLoading(true);
    try {
      const data = await apiCall('/api/auth/demo-login', 'POST', { role: r });
      onLogin(data.access_token, data.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-icon"><i className="fa-solid fa-graduation-cap"></i></div>
          <h1>EXAM<span style={{color:'#6366f1'}}>NEXUS</span></h1>
          <p>Online Examination & Assessment Platform</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode==='login'?'active':''}`}    onClick={()=>setMode('login')}>    Sign In </button>
          <button className={`auth-tab ${mode==='register'?'active':''}`} onClick={()=>setMode('register')}> Register</button>
        </div>

        {err && <div className="alert error"><i className="fa-solid fa-circle-exclamation"></i> {err}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" required placeholder="Your full name"
                value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" required placeholder="your@email.com"
              value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required placeholder="••••••••"
              value={pass} onChange={e=>setPass(e.target.value)} />
          </div>

          {mode === 'login' && (
            <div className="alert info" style={{fontSize:'.8rem', marginBottom:'1rem'}}>
              <i className="fa-solid fa-circle-info"></i>&nbsp;
              Admin: <strong>admin@exam.com</strong> / admin123 &nbsp;|&nbsp;
              Student: <strong>student@exam.com</strong> / password123
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Please wait…</> :
              mode === 'login' ? <><i className="fa-solid fa-right-to-bracket"></i> Sign In</> :
                                 <><i className="fa-solid fa-user-plus"></i> Create Account</>}
          </button>
        </form>

        <div className="auth-divider">or quick demo access</div>

        <div className="demo-btns">
          <button className="demo-btn student" onClick={()=>handleDemo('student')} disabled={loading}>
            <i className="fa-solid fa-user-graduate"></i> Demo Student
          </button>
          <button className="demo-btn admin" onClick={()=>handleDemo('admin')} disabled={loading}>
            <i className="fa-solid fa-user-shield"></i> Demo Admin
          </button>
        </div>

        <div className="auth-switch">
          {mode === 'login' ?
            <>Don't have an account? <a onClick={()=>setMode('register')}>Register here</a></> :
            <>Already have an account? <a onClick={()=>setMode('login')}>Sign in</a></>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STUDENT DASHBOARD
   ============================================================ */
function StudentDashboard({ token, user, navigate, goBack, pageHistory }) {
  const [exams, setExams]             = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeSubject, setActiveSubject] = useState('All');
  const [cert, setCert]               = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      apiCall('/api/exams', 'GET', null, token),
      apiCall('/api/submissions/my', 'GET', null, token)
    ]).then(([e, s]) => {
      setExams(e);
      setSubmissions(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const subjects = ['All', ...new Set(exams.map(e => e.subject))];
  const filtered = activeSubject === 'All' ? exams : exams.filter(e => e.subject === activeSubject);

  const passCount = submissions.filter(s => s.passed).length;
  const avgPct = submissions.length ?
    Math.round(submissions.reduce((a, s) => a + s.percentage, 0) / submissions.length) : 0;

  if (loading) return <div className="main" style={{textAlign:'center', paddingTop:'4rem', color:'var(--text-muted)'}}>
    <i className="fa-solid fa-spinner fa-spin fa-2x"></i><p style={{marginTop:'1rem'}}>Loading dashboard…</p>
  </div>;

  return (
    <div className="main">
      {pageHistory.length > 0 && (
        <button className="back-btn" onClick={goBack}>
          <i className="fa-solid fa-arrow-left"></i> Back
        </button>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="glass stat-card">
          <div className="stat-icon indigo"><i className="fa-solid fa-book-open"></i></div>
          <div><div className="stat-val">{exams.length}</div><div className="stat-lbl">Available Exams</div></div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon emerald"><i className="fa-solid fa-circle-check"></i></div>
          <div><div className="stat-val">{submissions.length}</div><div className="stat-lbl">Exams Taken</div></div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon amber"><i className="fa-solid fa-chart-line"></i></div>
          <div><div className="stat-val">{avgPct}%</div><div className="stat-lbl">Average Score</div></div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon rose"><i className="fa-solid fa-award"></i></div>
          <div><div className="stat-val">{passCount}</div><div className="stat-lbl">Certificates Earned</div></div>
        </div>
      </div>

      {/* Exam Listing */}
      <div className="section-hdr">
        <div>
          <h2>Available Examinations</h2>
          <p>Select an assessment to begin your proctored online examination</p>
        </div>
      </div>

      <div className="pill-tabs">
        {subjects.map(s => (
          <button key={s} className={`pill ${activeSubject===s?'active':''}`} onClick={()=>setActiveSubject(s)}>{s}</button>
        ))}
      </div>

      <div className="exams-grid">
        {filtered.map(exam => {
          const status = getExamStatus(exam);
          return (
            <div key={exam.id} className="glass exam-card">
              <div>
                <span className="exam-tag">{exam.subject} · {exam.code}</span>
                <h3 className="exam-title">{exam.title}</h3>
                <p className="exam-desc">{exam.description}</p>

                {(exam.scheduled_start || exam.scheduled_end) && (
                  <div className={`exam-schedule ${status}`}>
                    <i className={`fa-solid fa-${status==='active'?'circle-play':status==='upcoming'?'clock':'circle-stop'}`}></i>
                    {status === 'upcoming' && <> Starts: {formatDT(exam.scheduled_start)}</>}
                    {status === 'active'   && <> Open until: {exam.scheduled_end ? formatDT(exam.scheduled_end) : 'No end limit'}</>}
                    {status === 'ended'    && <> Ended: {formatDT(exam.scheduled_end)}</>}
                  </div>
                )}
              </div>

              <div>
                <div className="exam-meta">
                  <span><i className="fa-regular fa-clock"></i> {exam.duration_minutes} min</span>
                  <span><i className="fa-solid fa-list-check"></i> {exam.question_count} Qs</span>
                  <span><i className="fa-solid fa-bullseye"></i> {exam.pass_percentage}% pass</span>
                  <span><i className="fa-solid fa-star"></i> {exam.total_marks} marks</span>
                </div>

                <button
                  className={`btn btn-primary btn-full ${status!=='active'?'':''}` }
                  disabled={status !== 'active'}
                  onClick={() => navigate('exam-runner', exam.id)}
                >
                  {status === 'upcoming' ? <><i className="fa-solid fa-clock"></i> Not Started Yet</> :
                   status === 'ended'    ? <><i className="fa-solid fa-ban"></i> Exam Ended</> :
                                           <><i className="fa-solid fa-play"></i> Start Exam</>}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{gridColumn:'1/-1', textAlign:'center', color:'var(--text-muted)', padding:'3rem'}}>
            <i className="fa-solid fa-inbox fa-2x"></i><p style={{marginTop:'1rem'}}>No exams available in this category.</p>
          </div>
        )}
      </div>

      {/* My Results */}
      {submissions.length > 0 && (
        <div className="glass" style={{padding:'1.75rem', marginTop:'1rem'}}>
          <h3 style={{marginBottom:'1.25rem'}}>My Exam History</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Exam</th><th>Score</th><th>Percentage</th><th>Status</th><th>Time Taken</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td style={{fontWeight:600}}>{sub.exam_title}</td>
                    <td>{sub.score} / {sub.total_marks}</td>
                    <td>{sub.percentage}%</td>
                    <td><span className={`badge ${sub.passed?'pass':'fail'}`}>{sub.passed?'PASSED':'FAILED'}</span></td>
                    <td>{formatTime(sub.time_taken_seconds)}</td>
                    <td>
                      {sub.passed && (
                        <button className="btn btn-ghost btn-sm" onClick={()=>setCert(sub)}>
                          <i className="fa-solid fa-award"></i> Certificate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cert && <CertificateModal sub={cert} user={user} onClose={()=>setCert(null)} />}
    </div>
  );
}

/* ============================================================
   EXAM RUNNER (students only)
   ============================================================ */
function ExamRunner({ token, user, examId, onDone, goBack }) {
  const [exam, setExam]     = useState(null);
  const [qIdx, setQIdx]     = useState(0);
  const [answers, setAnswers]   = useState({});
  const [flagged, setFlagged]   = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [result, setResult]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]           = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    apiCall(`/api/exams/${examId}`, 'GET', null, token).then(e => {
      setExam(e);
      setTimeLeft(e.duration_minutes * 60);
    }).catch(e => setErr(e.message));
  }, [examId]);

  // Timer
  useEffect(() => {
    if (!exam || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitExam(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [exam, result]);

  // Anti-cheat
  useEffect(() => {
    const handler = () => { if (!result && document.hidden) { setWarnings(w => w+1); } };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [result]);

  const submitExam = async (auto = false) => {
    if (submitting || !exam) return;
    if (!auto && !window.confirm('Are you sure you want to submit the exam?')) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    const totalSpent = exam.duration_minutes * 60 - timeLeft;
    const answersList = (exam.questions || []).map(q => ({
      question_id: q.id,
      selected_option: answers[q.id] !== undefined ? answers[q.id] : null
    }));
    try {
      const r = await apiCall('/api/submissions', 'POST', {
        exam_id: exam.id, answers: answersList,
        time_taken_seconds: totalSpent, anti_cheat_warnings: warnings
      }, token);
      setResult(r);
    } catch (e) { setErr(e.message); setSubmitting(false); }
  };

  if (err) return (
    <div className="runner-overlay" style={{alignItems:'center',justifyContent:'center'}}>
      <div className="glass" style={{padding:'2rem',textAlign:'center',maxWidth:'420px'}}>
        <i className="fa-solid fa-circle-exclamation fa-2x" style={{color:'var(--danger)'}}></i>
        <p style={{marginTop:'1rem',color:'var(--text-muted)'}}>{err}</p>
        <button className="btn btn-primary" style={{marginTop:'1.5rem'}} onClick={onDone}>Back to Dashboard</button>
      </div>
    </div>
  );

  if (!exam) return (
    <div className="runner-overlay" style={{alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'var(--text-muted)'}}>
        <i className="fa-solid fa-spinner fa-spin fa-2x"></i><p style={{marginTop:'1rem'}}>Loading exam…</p>
      </div>
    </div>
  );

  const timerClass = timeLeft > 300 ? 'ok' : timeLeft > 60 ? 'warn' : 'danger';
  const q = exam.questions?.[qIdx];

  // Show result screen
  if (result) return (
    <div className="runner-overlay">
      <div className="runner-topbar">
        <div className="runner-exam-info"><span className="exam-tag">{exam.subject}</span><h3>{exam.title}</h3></div>
        <button className="btn btn-primary" onClick={onDone}><i className="fa-solid fa-house"></i> Dashboard</button>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <div className="result-wrap">
          <div className="glass result-hero">
            <div className="result-icon">{result.passed ? '🏆' : '📝'}</div>
            <h2>{result.passed ? 'Congratulations! You Passed!' : 'Keep Practicing!'}</h2>
            <p style={{color:'var(--text-muted)',marginTop:'.4rem'}}>
              {result.passed ? 'You have successfully completed this assessment.' : 'Review the explanations below and try again.'}
            </p>
          </div>

          <div className="result-score-badges" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
            <div className="glass score-badge">
              <div className="val">{result.score}/{result.total_marks}</div>
              <div className="lbl">Score</div>
            </div>
            <div className="glass score-badge">
              <div className="val">{result.percentage}%</div>
              <div className="lbl">Percentage</div>
            </div>
            <div className="glass score-badge">
              <div className="val" style={{color:result.passed?'var(--success)':'var(--danger)'}}>{result.passed?'PASS':'FAIL'}</div>
              <div className="lbl">Result</div>
            </div>
          </div>

          {warnings > 0 && (
            <div className="alert error" style={{marginBottom:'1.5rem'}}>
              <i className="fa-solid fa-triangle-exclamation"></i> {warnings} anti-cheat warning(s) recorded during this session.
            </div>
          )}

          <div className="glass" style={{padding:'1.5rem'}}>
            <h3 style={{marginBottom:'1rem'}}>Detailed Question Review</h3>
            <div className="q-review">
              {result.detailed_results?.map((r,i) => (
                <div key={i} className={`q-review-item ${r.is_correct?'correct':'wrong'}`}>
                  <div className="q-review-q">Q{i+1}. {r.question_text}</div>
                  <div className="q-review-ans" style={{color: r.is_correct?'var(--success)':'var(--danger)'}}>
                    {r.is_correct ? '✓' : '✗'} Your answer: {r.selected_option !== null ? r.options?.[r.selected_option] : 'No answer selected'}
                  </div>
                  {!r.is_correct && (
                    <div className="q-review-ans" style={{color:'var(--success)'}}>
                      ✓ Correct: {r.options?.[r.correct_option]}
                    </div>
                  )}
                  {r.explanation && <div className="q-review-exp">💡 {r.explanation}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Exam Running Screen
  return (
    <div className="runner-overlay">
      {/* Top Bar */}
      <div className="runner-topbar">
        <div className="runner-exam-info">
          <span className="exam-tag">{exam.subject}</span>
          <h3>{exam.title}</h3>
        </div>
        <div className={`timer ${timerClass}`}>
          <i className="fa-regular fa-clock"></i> {formatTime(timeLeft)}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => submitExam(false)} disabled={submitting}>
          {submitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-paper-plane"></i> Submit</>}
        </button>
      </div>

      {/* Body */}
      <div className="runner-body">
        {/* Question Pane */}
        <div className="question-pane">
          {q && (
            <div className="q-card">
              <div className="q-meta">
                <span className="q-num">Question {qIdx+1} / {exam.questions.length}</span>
                <button
                  className={`flag-btn ${flagged[q.id]?'flagged':''}`}
                  onClick={()=>setFlagged(f=>({...f,[q.id]:!f[q.id]}))}
                >
                  <i className="fa-solid fa-flag"></i> {flagged[q.id]?'Flagged':'Flag Review'}
                </button>
              </div>
              <div className="q-text">{q.question_text}</div>
              <div className="options">
                {q.options.map((opt, oi) => (
                  <div key={oi}
                    className={`option ${answers[q.id]===oi?'selected':''}`}
                    onClick={()=>setAnswers(a=>({...a,[q.id]:oi}))}
                  >
                    <div className="opt-key">{String.fromCharCode(65+oi)}</div>
                    <div>{opt}</div>
                  </div>
                ))}
              </div>
              <div className="q-nav">
                <button className="btn btn-ghost" disabled={qIdx===0} onClick={()=>setQIdx(q=>q-1)}>
                  <i className="fa-solid fa-arrow-left"></i> Prev
                </button>
                {qIdx < exam.questions.length-1 ? (
                  <button className="btn btn-primary" onClick={()=>setQIdx(q=>q+1)}>
                    Next <i className="fa-solid fa-arrow-right"></i>
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={()=>submitExam(false)} disabled={submitting}>
                    <i className="fa-solid fa-paper-plane"></i> Finish & Submit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="sidebar-pane">
          <div>
            <h4 style={{marginBottom:'.75rem'}}>Question Palette</h4>
            <div className="palette-grid">
              {exam.questions.map((q2, i) => {
                const ans = answers[q2.id] !== undefined;
                const fl  = flagged[q2.id];
                const cur = qIdx === i;
                let cls = '';
                if (ans) cls = 'answered';
                if (fl)  cls = 'flagged';
                if (cur) cls = (cls ? cls + ' ' : '') + 'current';
                return (
                  <button key={i} className={`pal-btn ${cls}`} onClick={()=>setQIdx(i)}>{i+1}</button>
                );
              })}
            </div>
          </div>
          <div className="palette-legend">
            <div>🟢 Answered</div>
            <div>🟡 Flagged for Review</div>
            <div>⬜ Unattempted</div>
          </div>
          <div>
            <div style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'.4rem'}}>
              Answered: {Object.keys(answers).length} / {exam.questions.length}
            </div>
          </div>
          {warnings > 0 && (
            <div className="anticheat-alert">
              <i className="fa-solid fa-triangle-exclamation"></i> {warnings} focus warning(s) logged!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
function AdminDashboard({ token, user, navigate, goBack, subPage, pageHistory }) {
  const [tab, setTab]             = useState('exams');
  const [exams, setExams]         = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examAttempts, setExamAttempts]     = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiCall('/api/exams', 'GET', null, token),
      apiCall('/api/analytics', 'GET', null, token)
    ]).then(([e, a]) => { setExams(e); setAnalytics(a); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    await apiCall(`/api/exams/${id}`, 'DELETE', null, token);
    load();
  };

  const viewAttempts = async (examId) => {
    setSelectedExamId(examId);
    setLoadingAttempts(true);
    const data = await apiCall(`/api/submissions/exam/${examId}`, 'GET', null, token);
    setExamAttempts(data);
    setLoadingAttempts(false);
    setTab('attempts');
  };

  if (loading) return <div className="main" style={{textAlign:'center',paddingTop:'4rem',color:'var(--text-muted)'}}>
    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
  </div>;

  return (
    <div className="main">
      {pageHistory.length > 0 && (
        <button className="back-btn" onClick={goBack}>
          <i className="fa-solid fa-arrow-left"></i> Back
        </button>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="glass stat-card">
          <div className="stat-icon indigo"><i className="fa-solid fa-book-open"></i></div>
          <div><div className="stat-val">{analytics?.total_exams||0}</div><div className="stat-lbl">Total Exams</div></div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon sky"><i className="fa-solid fa-users"></i></div>
          <div><div className="stat-val">{analytics?.total_students||0}</div><div className="stat-lbl">Students</div></div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon emerald"><i className="fa-solid fa-circle-check"></i></div>
          <div><div className="stat-val">{analytics?.total_submissions||0}</div><div className="stat-lbl">Submissions</div></div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon amber"><i className="fa-solid fa-chart-line"></i></div>
          <div><div className="stat-val">{analytics?.pass_rate||0}%</div><div className="stat-lbl">Pass Rate</div></div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="pill-tabs">
        <button className={`pill ${tab==='exams'?'active':''}`}     onClick={()=>setTab('exams')}>Manage Exams</button>
        <button className={`pill ${tab==='attempts'?'active':''}`}  onClick={()=>setTab('attempts')}>Student Attempts</button>
        <button className={`pill ${tab==='analytics'?'active':''}`} onClick={()=>setTab('analytics')}>Analytics</button>
      </div>

      {/* Exams Tab */}
      {tab === 'exams' && (
        <div>
          <div className="section-hdr">
            <div><h2>Exam Management</h2><p>Create, manage and monitor all examinations</p></div>
            <button className="btn btn-primary" onClick={()=>setShowCreate(true)}>
              <i className="fa-solid fa-plus"></i> Create New Exam
            </button>
          </div>

          <div className="glass" style={{padding:'1.5rem'}}>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Exam</th><th>Subject</th><th>Schedule</th><th>Duration</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {exams.map(exam => {
                    const st = getExamStatus(exam);
                    return (
                      <tr key={exam.id}>
                        <td>
                          <div style={{fontWeight:600}}>{exam.title}</div>
                          <div style={{fontSize:'.78rem',color:'var(--text-muted)'}}>{exam.code} · {exam.question_count} questions</div>
                        </td>
                        <td>{exam.subject}</td>
                        <td style={{fontSize:'.82rem'}}>
                          {exam.scheduled_start ? (
                            <>
                              <div>▶ {formatDT(exam.scheduled_start)}</div>
                              <div>⏹ {exam.scheduled_end ? formatDT(exam.scheduled_end) : '—'}</div>
                            </>
                          ) : <span style={{color:'var(--text-dim)'}}>No schedule set</span>}
                        </td>
                        <td>{exam.duration_minutes} min</td>
                        <td>
                          <span className={`badge ${st==='active'?'pub':st==='upcoming'?'draft':'fail'}`}>
                            {st === 'active' ? 'LIVE' : st === 'upcoming' ? 'UPCOMING' : 'ENDED'}
                          </span>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                            <button className="btn btn-ghost btn-sm" onClick={()=>viewAttempts(exam.id)}>
                              <i className="fa-solid fa-eye"></i> Attempts
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={()=>deleteExam(exam.id)}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {exams.length === 0 && (
                    <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'2rem'}}>No exams created yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attempts Tab */}
      {tab === 'attempts' && (
        <div>
          <div className="section-hdr">
            <div>
              <h2>Student Attempts</h2>
              <p>{selectedExamId ? `Showing attempts for selected exam` : 'Select an exam from "Manage Exams" to view attempts'}</p>
            </div>
            <button className="back-btn" onClick={()=>setTab('exams')} style={{margin:0}}>
              <i className="fa-solid fa-arrow-left"></i> Back to Exams
            </button>
          </div>

          {loadingAttempts && <p style={{color:'var(--text-muted)'}}><i className="fa-solid fa-spinner fa-spin"></i> Loading…</p>}

          {!loadingAttempts && (
            <div className="glass" style={{padding:'1.5rem'}}>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>Student</th><th>Score</th><th>Percentage</th><th>Status</th><th>Time Taken</th><th>Warnings</th><th>Submitted At</th>
                  </tr></thead>
                  <tbody>
                    {examAttempts.map(s => (
                      <tr key={s.id}>
                        <td style={{fontWeight:600}}>{s.student_name}</td>
                        <td>{s.score}/{s.total_marks}</td>
                        <td>{s.percentage}%</td>
                        <td><span className={`badge ${s.passed?'pass':'fail'}`}>{s.passed?'PASS':'FAIL'}</span></td>
                        <td>{formatTime(s.time_taken_seconds)}</td>
                        <td>
                          <span style={{color: s.anti_cheat_warnings > 0 ? 'var(--danger)' : 'var(--success)'}}>
                            {s.anti_cheat_warnings}
                          </span>
                        </td>
                        <td style={{fontSize:'.82rem'}}>{new Date(s.submitted_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {examAttempts.length === 0 && !loadingAttempts && (
                      <tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-muted)',padding:'2rem'}}>No submissions yet for this exam.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && analytics && (
        <div>
          <div className="section-hdr"><div><h2>Analytics Overview</h2><p>Recent exam activity across all students</p></div></div>
          <div className="glass" style={{padding:'1.5rem'}}>
            <h3 style={{marginBottom:'1rem'}}>Recent Submissions</h3>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Student</th><th>Exam</th><th>Score</th><th>Status</th><th>Submitted</th>
                </tr></thead>
                <tbody>
                  {(analytics.recent_submissions || []).map((s, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{s.student_name}</td>
                      <td>{s.exam_title}</td>
                      <td>{s.percentage}%</td>
                      <td><span className={`badge ${s.passed?'pass':'fail'}`}>{s.passed?'PASS':'FAIL'}</span></td>
                      <td style={{fontSize:'.82rem'}}>{new Date(s.submitted_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(analytics.recent_submissions||[]).length===0 && (
                    <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-muted)',padding:'2rem'}}>No submissions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreate && (
        <CreateExamModal token={token} onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load();}} />
      )}
    </div>
  );
}

/* ============================================================
   CREATE EXAM MODAL (Admin Only)
   ============================================================ */
function CreateExamModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', subject: 'Computer Science', code: '', description: '',
    duration_minutes: 30, total_marks: 40, pass_percentage: 50,
    shuffle_questions: true, show_results_immediately: true, is_published: true,
    scheduled_start: '', scheduled_end: '',
    questions: []
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const setField = (k, v) => setForm(f => ({...f, [k]: v}));

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, {
        question_text: '', type: 'mcq', options: ['', '', '', ''],
        correct_option: 0, marks: 10, explanation: ''
      }]
    }));
  };

  const removeQuestion = (i) => setForm(f => ({...f, questions: f.questions.filter((_,idx)=>idx!==i)}));

  const updateQ = (i, field, val) => {
    const qs = [...form.questions];
    qs[i] = {...qs[i], [field]: val};
    setForm(f => ({...f, questions: qs}));
  };

  const updateQOption = (qi, oi, val) => {
    const qs = [...form.questions];
    const opts = [...qs[qi].options];
    opts[oi] = val;
    qs[qi] = {...qs[qi], options: opts};
    setForm(f => ({...f, questions: qs}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.questions.length === 0) { setErr('Please add at least one question.'); return; }
    setLoading(true); setErr('');
    try {
      const payload = {
        ...form,
        total_marks: form.questions.reduce((a, q) => a + (parseInt(q.marks)||0), 0),
        scheduled_start: form.scheduled_start || null,
        scheduled_end:   form.scheduled_end   || null,
        questions: form.questions.map(q => ({
          ...q,
          marks: parseInt(q.marks) || 10,
          correct_option: parseInt(q.correct_option) || 0,
          options: q.type === 'tf' ? ['True', 'False'] : q.options.filter(Boolean)
        }))
      };
      await apiCall('/api/exams', 'POST', payload, token);
      onCreated();
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass" style={{
        width:'100%', maxWidth:'800px', maxHeight:'92vh', overflowY:'auto',
        background:'#0d1525', padding:'2rem', borderRadius:'var(--radius-xl)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <h2><i className="fa-solid fa-plus-circle" style={{color:'var(--primary)'}}></i> Create New Exam</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        {err && <div className="alert error">{err}</div>}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'1.25rem',marginBottom:'1.25rem'}}>
            <h4 style={{marginBottom:'1rem',color:'var(--primary)'}}>📋 Basic Information</h4>
            <div className="create-exam-grid">
              <div className="form-group">
                <label className="form-label">Exam Title *</label>
                <input className="form-input" required placeholder="e.g. Python Fundamentals" value={form.title} onChange={e=>setField('title',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Exam Code *</label>
                <input className="form-input" required placeholder="e.g. CS101" value={form.code} onChange={e=>setField('code',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input className="form-input" required placeholder="e.g. Computer Science" value={form.subject} onChange={e=>setField('subject',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min={5} required value={form.duration_minutes} onChange={e=>setField('duration_minutes',parseInt(e.target.value))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Describe what this exam covers…" value={form.description} onChange={e=>setField('description',e.target.value)} />
            </div>
            <div className="create-exam-grid">
              <div className="form-group">
                <label className="form-label">Passing Percentage (%)</label>
                <input className="form-input" type="number" min={1} max={100} value={form.pass_percentage} onChange={e=>setField('pass_percentage',parseInt(e.target.value))} />
              </div>
              <div className="form-group" style={{justifyContent:'flex-end'}}>
                <label className="form-label">Publish Immediately</label>
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',paddingTop:'.5rem'}}>
                  <input type="checkbox" id="pub" checked={form.is_published} onChange={e=>setField('is_published',e.target.checked)} style={{accentColor:'var(--primary)',width:18,height:18}} />
                  <label htmlFor="pub" style={{color:'var(--text)',cursor:'pointer'}}>Exam is published & visible</label>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'1.25rem',marginBottom:'1.25rem'}}>
            <h4 style={{marginBottom:'1rem',color:'var(--success)'}}>📅 Exam Schedule (Optional)</h4>
            <p style={{fontSize:'.83rem',color:'var(--text-muted)',marginBottom:'1rem'}}>
              Set a specific window when students can access this exam. Leave blank for always-open exams.
            </p>
            <div className="create-exam-grid">
              <div className="form-group">
                <label className="form-label">Exam Start Date & Time</label>
                <input className="form-input" type="datetime-local" value={form.scheduled_start} onChange={e=>setField('scheduled_start',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Exam End Date & Time</label>
                <input className="form-input" type="datetime-local" value={form.scheduled_end} onChange={e=>setField('scheduled_end',e.target.value)} />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:'1.25rem',marginBottom:'1.5rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <h4 style={{color:'var(--warning)'}}>❓ Questions ({form.questions.length})</h4>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addQuestion}>
                <i className="fa-solid fa-plus"></i> Add Question
              </button>
            </div>

            {form.questions.length === 0 && (
              <div style={{textAlign:'center',color:'var(--text-muted)',padding:'1.5rem',border:'1px dashed var(--border)',borderRadius:'var(--radius-md)'}}>
                No questions yet. Click "Add Question" to begin building the exam.
              </div>
            )}

            {form.questions.map((q, qi) => (
              <div key={qi} className="question-builder-item">
                <div className="q-builder-header">
                  <span style={{fontWeight:700,color:'var(--primary)'}}>Q{qi+1}</span>
                  <div style={{display:'flex',gap:'.5rem',alignItems:'center'}}>
                    <select className="form-select" style={{padding:'5px 10px',fontSize:'.82rem'}} value={q.type} onChange={e=>updateQ(qi,'type',e.target.value)}>
                      <option value="mcq">Multiple Choice</option>
                      <option value="tf">True / False</option>
                    </select>
                    <input className="form-input" type="number" min={1} style={{width:'70px',padding:'5px 8px',fontSize:'.82rem'}} placeholder="Marks" value={q.marks} onChange={e=>updateQ(qi,'marks',e.target.value)} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={()=>removeQuestion(qi)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <textarea className="form-textarea" required style={{minHeight:'60px'}} placeholder="Enter your question here…"
                    value={q.question_text} onChange={e=>updateQ(qi,'question_text',e.target.value)} />
                </div>

                {q.type === 'mcq' && (
                  <div className="form-group">
                    <label className="form-label">Options (select the correct answer)</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="option-row">
                        <input type="radio" name={`correct_${qi}`} checked={q.correct_option === oi}
                          onChange={()=>updateQ(qi,'correct_option',oi)} />
                        <input className="form-input option-text-input" placeholder={`Option ${String.fromCharCode(65+oi)}`}
                          value={opt} onChange={e=>updateQOption(qi,oi,e.target.value)} />
                      </div>
                    ))}
                    <p style={{fontSize:'.78rem',color:'var(--text-muted)',marginTop:'.4rem'}}>
                      ◉ = correct answer
                    </p>
                  </div>
                )}

                {q.type === 'tf' && (
                  <div className="form-group">
                    <label className="form-label">Correct Answer</label>
                    <div style={{display:'flex',gap:'1rem'}}>
                      <label style={{display:'flex',alignItems:'center',gap:'.5rem',cursor:'pointer',color:'var(--text)'}}>
                        <input type="radio" name={`tf_${qi}`} checked={q.correct_option===0} onChange={()=>updateQ(qi,'correct_option',0)} /> True
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:'.5rem',cursor:'pointer',color:'var(--text)'}}>
                        <input type="radio" name={`tf_${qi}`} checked={q.correct_option===1} onChange={()=>updateQ(qi,'correct_option',1)} /> False
                      </label>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Explanation (shown after submission)</label>
                  <input className="form-input" placeholder="Explain why the answer is correct…"
                    value={q.explanation} onChange={e=>updateQ(qi,'explanation',e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div style={{display:'flex',gap:'1rem',justifyContent:'flex-end'}}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || form.questions.length===0}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating…</> : <><i className="fa-solid fa-rocket"></i> Create & Publish Exam</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   CERTIFICATE MODAL
   ============================================================ */
function CertificateModal({ sub, user, onClose }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div>
        <div className="cert-card">
          <div className="cert-header">Certificate of Achievement</div>
          <div className="cert-title">EXAM NEXUS</div>
          <div className="cert-body">This is to certify that</div>
          <div className="cert-name">{user?.name || sub.student_name}</div>
          <div className="cert-body" style={{margin:'.5rem 0'}}>has successfully completed the assessment</div>
          <h2 style={{color:'#1e1b4b',margin:'.5rem 0',fontFamily:"'Outfit',sans-serif"}}>{sub.exam_title}</h2>
          <div className="cert-score">Score: {sub.percentage}% ({sub.score} / {sub.total_marks} marks)</div>
          <div className="cert-footer">
            <div className="cert-footer-detail">
              <div>Date: {new Date(sub.submitted_at).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>
              <div>Certificate ID: NEXUS-{sub.id?.slice(-8).toUpperCase()}</div>
            </div>
            <div className="cert-seal"><i className="fa-solid fa-certificate"></i></div>
          </div>
        </div>
        <div style={{display:'flex',gap:'1rem',justifyContent:'center',marginTop:'1rem'}}>
          <button className="btn btn-primary" onClick={()=>window.print()}>
            <i className="fa-solid fa-print"></i> Print / Save PDF
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i> Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MOUNT
   ============================================================ */
ReactDOM.createRoot(document.getElementById('root')).render(<OnlineExamApp />);
