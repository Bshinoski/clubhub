import React from "react";

const LandingPage: React.FC = () => {
    return (
        <>
            {/* Local styles just for this page */}
            <style>{`
        .wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: radial-gradient(1200px 600px at 80% -10%, #646cff33, transparent 60%),
                      radial-gradient(1000px 500px at -20% 10%, #22d3ee22, transparent 55%),
                      linear-gradient(180deg, #0f172a, #111827);
          color: #fff;
        }
        .container { width: min(1100px, 92%); margin: 0 auto; }

        /* Header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0;
        }
        .brand {
          display: flex; align-items: center; gap: .6rem;
          font-weight: 800; letter-spacing: .3px; font-size: 1.15rem;
        }
        .brand-badge {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #818cf8, #22d3ee);
          display: grid; place-items: center; font-weight: 900;
          color: #0b1020;
        }
        .nav { display: flex; gap: .75rem; }
        .btn {
          border: 1px solid #ffffff2a; background: #ffffff0f;
          color: #fff; padding: .65rem 1rem; border-radius: 10px;
          font-weight: 600; letter-spacing: .2px;
          transition: transform .15s ease, background .2s ease, border-color .2s ease;
        }
        .btn:hover { transform: translateY(-1px); border-color: #ffffff55; background:#ffffff1a; }
        .btn.primary { background: #fff; color: #0b1020; border: none; }
        .btn.primary:hover { background: #f3f4f6; }

        /* Hero */
        .hero { padding: 70px 0 30px; text-align: center; }
        .eyebrow {
          display:inline-flex; align-items:center; gap:.5rem;
          border:1px solid #ffffff22; background:#ffffff10; color:#e5e7eb;
          padding:.35rem .6rem; border-radius:999px; font-size:.85rem;
        }
        .title { font-size: clamp(2rem, 4.6vw, 3.5rem); line-height:1.1; margin: 16px auto 10px; font-weight: 900; }
        .subtitle { color:#cbd5e1; max-width: 720px; margin: 0 auto; font-size: clamp(1rem, 2.4vw, 1.15rem); }

        .cta { margin-top: 26px; display:flex; justify-content:center; gap:.8rem; flex-wrap: wrap; }
        .ghost { border:1px solid #ffffff30; background: transparent; }

        /* Showcase card */
        .card-wrap { display:flex; justify-content:center; margin-top:40px; }
        .card {
          width: min(900px, 96%);
          background: #0b1020; border:1px solid #ffffff18; border-radius: 18px;
          box-shadow: 0 20px 60px rgba(0,0,0,.35);
          overflow: hidden;
        }
        .card-top {
          display:flex; align-items:center; gap:.35rem; padding:10px 12px;
          border-bottom:1px solid #ffffff10; background:#0f152c;
        }
        .dot { width:10px; height:10px; border-radius:999px; background:#ef4444; }
        .dot:nth-child(2){ background:#f59e0b;}
        .dot:nth-child(3){ background:#10b981;}

        .card-body {
          padding: 26px 24px;
          display: grid; gap: 16px;
          grid-template-columns: 1fr;
        }
        .fake-col {
          background: #0e1530; border:1px solid #ffffff10; border-radius: 12px;
          height: 72px;
        }
        .fake-col.tall { height: 160px; }

        /* Features */
        .features { padding: 64px 0 28px; }
        .grid {
          display: grid; gap: 16px;
          grid-template-columns: repeat(12, 1fr);
        }
        .f {
          grid-column: span 12;
          background:#0b1020; border:1px solid #ffffff18; border-radius:16px; padding:18px;
        }
        .f h3 { margin: 2px 0 6px; font-size: 1.05rem; }
        .f p { color:#cbd5e1; margin:0; }

        @media (min-width: 720px) {
          .card-body { grid-template-columns: 1.2fr 1fr; }
          .f { grid-column: span 4; }
        }

        /* Footer */
        .footer { border-top:1px solid #ffffff12; padding: 26px 0; margin-top: 36px; color:#94a3b8; font-size:.95rem; }
      `}</style>

            <div className="wrap">
                {/* Header */}
                <header className="container header" role="banner">
                    <div className="brand">
                        <div className="brand-badge">CC</div>
                        ClubConnect
                    </div>
                    <nav className="nav" aria-label="Main">
                        <button className="btn ghost" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
                            Pricing
                        </button>
                        <button className="btn" onClick={() => alert("Docs coming soon")}>Docs</button>
                        <button className="btn" onClick={() => alert("Contact coming soon")}>Contact</button>
                        <button className="btn" onClick={() => alert("Navigate to Login")}>Log In</button>
                        <button className="btn primary" onClick={() => alert("Navigate to Sign Up")}>Get Started</button>
                    </nav>
                </header>

                {/* Hero */}
                <section className="container hero">
                    <div className="eyebrow">
                        <span>🚀 New</span> <span>Simple team ops for clubs</span>
                    </div>
                    <h1 className="title">Run your club in one place.</h1>
                    <p className="subtitle">
                        Chat with members, publish schedules, and manage rosters — all in a fast, friendly web app.
                    </p>
                    <div className="cta">
                        <button className="btn primary" onClick={() => alert("Sign Up")}>Create a free team</button>
                        <button className="btn ghost" onClick={() => alert("Watch demo")}>Watch a 60s demo</button>
                    </div>

                    {/* Showcase card: tasteful placeholder for “app preview” */}
                    <div className="card-wrap" aria-hidden="true">
                        <div className="card">
                            <div className="card-top">
                                <div className="dot" /> <div className="dot" /> <div className="dot" />
                            </div>
                            <div className="card-body">
                                <div className="fake-col tall" />
                                <div className="fake-col" />
                                <div className="fake-col" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="container features">
                    <div className="grid">
                        <article className="f">
                            <h3>💬 Team Chat</h3>
                            <p>Keep conversations in one place. Channels for teams, DMs for quick coordination.</p>
                        </article>
                        <article className="f">
                            <h3>📅 Schedule</h3>
                            <p>Create events, share locations, and send reminders so everyone shows up on time.</p>
                        </article>
                        <article className="f">
                            <h3>🧑‍🤝‍🧑 Roster</h3>
                            <p>See members at a glance and promote admins with one click. Invite links built-in.</p>
                        </article>
                    </div>
                </section>

                {/* Footer */}
                <footer className="container footer" role="contentinfo">
                    © {new Date().getFullYear()} ClubConnect — Built for clubs, teams, and communities.
                </footer>
            </div>
        </>
    );
};

export default LandingPage;
