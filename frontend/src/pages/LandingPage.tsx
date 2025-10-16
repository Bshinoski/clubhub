import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
    return (
        <>
            <div className="wrap landing-page">
                {/* Header */}
                <header className="container header" role="banner">
                    <div className="brand">
                        <div className="brand-badge">CC</div>
                        ClubConnect
                    </div>
                    <nav className="nav" aria-label="Main">
                        <button className="btn" onClick={() => alert("Pricing coming soon")}>Pricing</button>
                        <button className="btn" onClick={() => alert("Docs coming soon")}>Docs</button>
                        <button className="btn" onClick={() => alert("Contact coming soon")}>Contact</button>
                        <Link className="btn" to="/login">Log In</Link>
                        <Link className="btn primary" to="/signup">Get Started</Link>
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
