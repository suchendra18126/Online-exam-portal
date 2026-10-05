const { useState, useEffect, useRef } = React;

function OnlineExamApp() {
  // State variables
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'exam-runner', 'instructor', 'my-results'
  const [activeSubject, setActiveSubject] = useState('All');
  
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Active Test Runner state
  const [activeExam, setActiveExam] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [antiCheatWarnings, setAntiCheatWarnings] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Modals state
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    title: '',
    subject: 'Computer Science',
    code: 'CS101',
    description: '',
    duration_minutes: 20,
    total_marks: 40,
    pass_percentage: 50,
    questions: [
      {
        question_text: 'What is the default value of a boolean variable in Java?',
        type: 'mcq',
        options: ['true', 'false', 'null', '0'],
        correct_option: 1,
        marks: 10,
        explanation: 'In Java, primitive boolean fields default to false.'
      }
    ]
  });

  // Fetch Current User on mount or token change
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then(data => {
        setUser(data);
      })
      .catch(() => {
        // Fallback to demo login if token invalid
        handleDemoLogin('student');
      });
    } else {
      handleDemoLogin('student');
    }
  }, [token]);

  // Fetch Exams & Submissions when user logs in
  useEffect(() => {
    if (token && user) {
      loadExams();
      loadSubmissions();
      loadAnalytics();
    }
  }, [token, user]);

  // Live Timer & Anti-cheat tracking during Exam Runner
  useEffect(() => {
    let timerInterval = null;
    if (currentView === 'exam-runner' && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            handleFinalSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [currentView, timeLeft]);

  // Anti-Cheat Tab Switch Detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (currentView === 'exam-runner' && document.hidden) {
        setAntiCheatWarnings(prev => prev + 1);
        alert('⚠️ Anti-Cheat Warning: Tab switch or focus loss detected! This event has been logged.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentView]);

  const loadExams = () => {
    fetch('/api/exams', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setExams(data))
    .catch(err => console.error("Error loading exams:", err));
  };

  const loadSubmissions = () => {
    fetch('/api/submissions/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setSubmissions(data))
    .catch(err => console.error("Error loading submissions:", err));
  };

  const loadAnalytics = () => {
    fetch('/api/analytics', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setAnalytics(data))
    .catch(err => console.error("Error loading analytics:", err));
  };

  const handleDemoLogin = (role) => {
    fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setCurrentView('dashboard');
    })
    .catch(err => console.error("Demo login error:", err));
  };

  const startExam = (examId) => {
    fetch(`/api/exams/${examId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setActiveExam(data);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
      setFlaggedQuestions({});
      setAntiCheatWarnings(0);
      setTestResult(null);
      setTimeLeft(data.duration_minutes * 60);
      setCurrentView('exam-runner');
    })
    .catch(err => console.error("Error starting exam:", err));
  };

  const selectOption = (questionId, optionIdx) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const toggleFlagQuestion = (questionId) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleFinalSubmit = () => {
    if (!activeExam || isSubmitting) return;
    setIsSubmitting(true);

    const answersList = (activeExam.questions || []).map(q => ({
      question_id: q.id,
      selected_option: userAnswers[q.id] !== undefined ? userAnswers[q.id] : null
    }));

    const totalSecondsSpent = (activeExam.duration_minutes * 60) - timeLeft;

    fetch('/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        exam_id: activeExam.id,
        answers: answersList,
        time_taken_seconds: totalSecondsSpent,
        anti_cheat_warnings: antiCheatWarnings
      })
    })
    .then(res => res.json())
    .then(result => {
      setIsSubmitting(false);
      setTestResult(result);
      loadSubmissions();
      loadAnalytics();
    })
    .catch(err => {
      setIsSubmitting(false);
      console.error("Error submitting test:", err);
    });
  };

  const handleCreateExamSubmit = (e) => {
    e.preventDefault();
    fetch('/api/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newExamForm)
    })
    .then(res => res.json())
    .then(() => {
      setShowCreateExamModal(false);
      loadExams();
      alert('✅ New Exam Created & Published Successfully!');
    })
    .catch(err => console.error("Error creating exam:", err));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const subjectsList = ['All', ...new Set(exams.map(e => e.subject))];
  const filteredExams = activeSubject === 'All' ? exams : exams.filter(e => e.subject === activeSubject);

  return (
    <div>
      {/* HEADER NAVBAR */}
      {currentView !== 'exam-runner' && (
        <header className="app-header">
          <div className="header-container">
            <a href="#" className="brand-logo" onClick={() => setCurrentView('dashboard')}>
              <div className="logo-icon"><i className="fa-solid fa-graduation-cap"></i></div>
              <span>EXAM<span style={{ color: '#6366f1' }}>NEXUS</span></span>
            </a>

            <div className="nav-controls">
              <div className="persona-switcher">
                <button 
                  className={`persona-btn ${user?.role === 'student' ? 'active' : ''}`}
                  onClick={() => handleDemoLogin('student')}
                >
                  <i className="fa-solid fa-user-graduate"></i> Student
                </button>
                <button 
                  className={`persona-btn ${user?.role === 'teacher' ? 'active' : ''}`}
                  onClick={() => handleDemoLogin('teacher')}
                >
                  <i className="fa-solid fa-chalkboard-user"></i> Instructor
                </button>
                <button 
                  className={`persona-btn ${user?.role === 'admin' ? 'active' : ''}`}
                  onClick={() => handleDemoLogin('admin')}
                >
                  <i className="fa-solid fa-user-shield"></i> Admin
                </button>
              </div>

              {user && (
                <div className="user-badge">
                  <img src={user.avatar} alt="avatar" className="user-avatar" />
                  <span className="user-name">{user.name}</span>
                  <span className={`role-pill ${user.role}`}>{user.role}</span>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="main-layout">
        {/* STUDENT / INSTRUCTOR DASHBOARD VIEW */}
        {currentView === 'dashboard' && (
          <div>
            {/* STATS OVERVIEW CARDS */}
            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <div className="stat-icon indigo"><i className="fa-solid fa-book-open"></i></div>
                <div>
                  <div className="stat-val">{exams.length}</div>
                  <div className="stat-lbl">Active Exams</div>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon emerald"><i className="fa-solid fa-circle-check"></i></div>
                <div>
                  <div className="stat-val">{submissions.length}</div>
                  <div className="stat-lbl">Completed Tests</div>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon amber"><i className="fa-solid fa-chart-line"></i></div>
                <div>
                  <div className="stat-val">{analytics?.avg_score || '85'}%</div>
                  <div className="stat-lbl">Average Portal Score</div>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon rose"><i className="fa-solid fa-award"></i></div>
                <div>
                  <div className="stat-val">{submissions.filter(s => s.passed).length}</div>
                  <div className="stat-lbl">Certificates Earned</div>
                </div>
              </div>
            </div>

            {/* SUBJECT FILTER TABS & TEACHER CTA */}
            <div className="section-header">
              <div>
                <h2>Available Examinations</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Select an assessment to begin your proctored online examination.
                </p>
              </div>

              {user?.role !== 'student' && (
                <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowCreateExamModal(true)}>
                  <i className="fa-solid fa-plus"></i> Create New Exam
                </button>
              )}
            </div>

            <div className="subject-tabs" style={{ marginBottom: '1.5rem' }}>
              {subjectsList.map(sub => (
                <button
                  key={sub}
                  className={`tab-btn ${activeSubject === sub ? 'active' : ''}`}
                  onClick={() => setActiveSubject(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* EXAMS GRID */}
            <div className="exams-grid">
              {filteredExams.map(exam => (
                <div key={exam.id} className="glass-panel exam-card">
                  <div>
                    <span className="exam-badge">{exam.subject} • {exam.code}</span>
                    <h3 className="exam-title">{exam.title}</h3>
                    <p className="exam-desc">{exam.description}</p>
                  </div>

                  <div>
                    <div className="exam-meta">
                      <span><i className="fa-regular fa-clock"></i> {exam.duration_minutes} Mins</span>
                      <span><i className="fa-solid fa-list-check"></i> {exam.question_count} Qs</span>
                      <span><i className="fa-solid fa-bullseye"></i> {exam.pass_percentage}% Pass</span>
                    </div>

                    <button className="btn-primary" onClick={() => startExam(exam.id)}>
                      <span>Start Assessment</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* MY RECENT SUBMISSIONS TABLE */}
            {submissions.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>My Recent Exam Performance</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px' }}>Exam Title</th>
                        <th style={{ padding: '12px' }}>Score</th>
                        <th style={{ padding: '12px' }}>Percentage</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Time Taken</th>
                        <th style={{ padding: '12px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map(sub => (
                        <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: '600' }}>{sub.exam_title}</td>
                          <td style={{ padding: '12px' }}>{sub.score} / {sub.total_marks}</td>
                          <td style={{ padding: '12px' }}>{sub.percentage}%</td>
                          <td style={{ padding: '12px' }}>
                            <span className={`role-pill ${sub.passed ? 'teacher' : 'admin'}`}>
                              {sub.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>{formatTime(sub.time_taken_seconds)}</td>
                          <td style={{ padding: '12px' }}>
                            {sub.passed && (
                              <button 
                                className="tab-btn active" 
                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                onClick={() => setSelectedCertificate(sub)}
                              >
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
          </div>
        )}

        {/* FULLSCREEN EXAM RUNNER OVERLAY */}
        {currentView === 'exam-runner' && activeExam && (
          <div className="exam-runner-overlay">
            {/* TOP BAR */}
            <div className="runner-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="exam-badge" style={{ margin: 0 }}>{activeExam.subject}</span>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{activeExam.title}</h3>
              </div>

              <div className={`timer-box ${timeLeft < 300 ? 'urgent' : ''}`}>
                <i className="fa-regular fa-clock"></i>
                <span>{formatTime(timeLeft)}</span>
              </div>

              <div>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleFinalSubmit}>
                  Submit Examination
                </button>
              </div>
            </div>

            {/* TEST BODY */}
            {!testResult ? (
              <div className="runner-body">
                {/* QUESTION AREA */}
                <div className="question-area">
                  {activeExam.questions && activeExam.questions.length > 0 && (
                    <div className="question-card glass-panel" style={{ padding: '2rem' }}>
                      <div className="q-header">
                        <span className="q-number">Question {currentQuestionIdx + 1} of {activeExam.questions.length}</span>
                        <button 
                          className="tab-btn" 
                          style={{ background: flaggedQuestions[activeExam.questions[currentQuestionIdx].id] ? 'var(--accent-warning)' : 'transparent' }}
                          onClick={() => toggleFlagQuestion(activeExam.questions[currentQuestionIdx].id)}
                        >
                          <i className="fa-solid fa-flag"></i> {flaggedQuestions[activeExam.questions[currentQuestionIdx].id] ? 'Flagged' : 'Flag for Review'}
                        </button>
                      </div>

                      <div className="q-text">
                        {activeExam.questions[currentQuestionIdx].question_text}
                      </div>

                      <div className="options-list">
                        {activeExam.questions[currentQuestionIdx].options.map((opt, oIdx) => {
                          const qId = activeExam.questions[currentQuestionIdx].id;
                          const isSelected = userAnswers[qId] === oIdx;
                          return (
                            <div 
                              key={oIdx} 
                              className={`option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => selectOption(qId, oIdx)}
                            >
                              <div className="opt-indicator">{String.fromCharCode(65 + oIdx)}</div>
                              <div>{opt}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* NAV BUTTONS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button 
                          className="tab-btn" 
                          disabled={currentQuestionIdx === 0}
                          onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                        >
                          <i className="fa-solid fa-arrow-left"></i> Previous
                        </button>

                        <button 
                          className="btn-primary" 
                          style={{ width: 'auto' }}
                          onClick={() => {
                            if (currentQuestionIdx < activeExam.questions.length - 1) {
                              setCurrentQuestionIdx(prev => prev + 1);
                            } else {
                              handleFinalSubmit();
                            }
                          }}
                        >
                          {currentQuestionIdx === activeExam.questions.length - 1 ? 'Finish & Submit' : 'Next Question'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SIDEBAR QUESTION PALETTE */}
                <div className="runner-sidebar">
                  <h4>Question Palette</h4>
                  <div className="q-palette">
                    {activeExam.questions.map((q, idx) => {
                      const isAnswered = userAnswers[q.id] !== undefined;
                      const isFlagged = flaggedQuestions[q.id];
                      const isCurrent = currentQuestionIdx === idx;
                      let statusClass = '';
                      if (isAnswered) statusClass = 'answered';
                      if (isFlagged) statusClass = 'flagged';
                      if (isCurrent) statusClass = 'current';

                      return (
                        <button
                          key={q.id}
                          className={`palette-btn ${statusClass}`}
                          onClick={() => setCurrentQuestionIdx(idx)}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>🟢 Answered</div>
                    <div>🟡 Flagged for Review</div>
                    <div>⚪ Unanswered</div>
                  </div>

                  {antiCheatWarnings > 0 && (
                    <div style={{ background: 'var(--accent-danger-bg)', color: '#f87171', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-triangle-exclamation"></i> {antiCheatWarnings} Anti-Cheat Focus Warning(s) Logged!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* INSTANT SCORECARD & DETAILED RESULTS */
              <div style={{ padding: '3rem', maxWidth: '850px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
                <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', color: testResult.passed ? 'var(--accent-success)' : 'var(--accent-danger)', marginBottom: '1rem' }}>
                    <i className={testResult.passed ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}></i>
                  </div>
                  <h2>Assessment Completed</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {testResult.passed ? 'Congratulations! You have successfully passed the exam.' : 'Keep practicing! You can retake this assessment anytime.'}
                  </p>

                  <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                      <div className="stat-val">{testResult.score} / {testResult.total_marks}</div>
                      <div className="stat-lbl">Final Score</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                      <div className="stat-val">{testResult.percentage}%</div>
                      <div className="stat-lbl">Percentage</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                      <div className="stat-val">{testResult.passed ? 'PASSED' : 'FAILED'}</div>
                      <div className="stat-lbl">Result Status</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
                    <h3>Question Performance & Explanations</h3>
                    {testResult.detailed_results?.map((res, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                          Q{i+1}. {res.question_text}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: res.is_correct ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          Your choice: {res.selected_option !== null ? res.options[res.selected_option] : 'No answer'} {res.is_correct ? '✓' : '✗'}
                        </div>
                        {!res.is_correct && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-success)', marginTop: '4px' }}>
                            Correct option: {res.options[res.correct_option]}
                          </div>
                        )}
                        {res.explanation && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                            💡 Explanation: {res.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setCurrentView('dashboard')}>
                      Return to Dashboard
                    </button>
                    {testResult.passed && (
                      <button className="tab-btn active" style={{ padding: '12px 24px' }} onClick={() => setSelectedCertificate(testResult)}>
                        <i className="fa-solid fa-award"></i> View Certificate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PRINTABLE CERTIFICATE MODAL */}
      {selectedCertificate && (
        <div className="modal-backdrop" onClick={() => setSelectedCertificate(null)}>
          <div className="certificate-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Official Certificate of Completion
            </div>

            <h1 className="cert-title">EXAM NEXUS ACADEMY</h1>

            <p style={{ margin: '1.5rem 0 0.5rem 0', color: '#4b5563' }}>This is to certify that</p>
            <div className="cert-student">{user?.name || selectedCertificate.student_name}</div>
            <p style={{ color: '#4b5563', margin: '0.5rem 0 1.5rem 0' }}>
              has successfully passed the online proctored examination for
            </p>

            <h2 style={{ color: '#1e1b4b', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {selectedCertificate.exam_title}
            </h2>

            <p style={{ color: '#6366f1', fontWeight: '700', fontSize: '1.1rem' }}>
              Score: {selectedCertificate.percentage}% ({selectedCertificate.score} / {selectedCertificate.total_marks} Marks)
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <div style={{ textAlign: 'left', fontSize: '0.8rem', color: '#6b7280' }}>
                <div>Date Issued: {new Date(selectedCertificate.submitted_at).toLocaleDateString()}</div>
                <div>Certificate ID: NEXUS-{selectedCertificate.id?.slice(-8).toUpperCase()}</div>
              </div>

              <div style={{ fontSize: '2.5rem', color: '#4f46e5' }}>
                <i className="fa-solid fa-certificate"></i>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn-primary" 
                style={{ width: 'auto', display: 'inline-flex' }}
                onClick={() => window.print()}
              >
                <i className="fa-solid fa-print"></i> Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW EXAM MODAL FOR INSTRUCTORS */}
      {showCreateExamModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateExamModal(false)}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '2rem', background: '#111827' }} onClick={e => e.stopPropagation()}>
            <h3>Create & Publish New Exam</h3>
            <form onSubmit={handleCreateExamSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exam Title</label>
                <input 
                  type="text"
                  required
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
                  value={newExamForm.title}
                  onChange={e => setNewExamForm({ ...newExamForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subject</label>
                  <input 
                    type="text"
                    required
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
                    value={newExamForm.subject}
                    onChange={e => setNewExamForm({ ...newExamForm, subject: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exam Code</label>
                  <input 
                    type="text"
                    required
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
                    value={newExamForm.code}
                    onChange={e => setNewExamForm({ ...newExamForm, code: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</label>
                <textarea 
                  required
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px', minHeight: '80px' }}
                  value={newExamForm.description}
                  onChange={e => setNewExamForm({ ...newExamForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Duration (Minutes)</label>
                  <input 
                    type="number"
                    required
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
                    value={newExamForm.duration_minutes}
                    onChange={e => setNewExamForm({ ...newExamForm, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Passing Percentage (%)</label>
                  <input 
                    type="number"
                    required
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
                    value={newExamForm.pass_percentage}
                    onChange={e => setNewExamForm({ ...newExamForm, pass_percentage: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="tab-btn" onClick={() => setShowCreateExamModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Publish Exam</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OnlineExamApp />);
