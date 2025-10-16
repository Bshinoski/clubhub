import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./SignupPage.css";

const SignupPage: React.FC = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [showPw1, setShowPw1] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    const [agree, setAgree] = useState(true);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!fullName.trim() || !email.trim() || !pw || !pw2) {
            setError("Please fill out all fields.");
            return;
        }
        if (pw !== pw2) {
            setError("Passwords do not match.");
            return;
        }
        if (!agree) {
            setError("Please accept the Terms to continue.");
            return;
        }

        // TODO: replace with real API call
        // const res = await fetch("/api/signup", { method:"POST", body: JSON.stringify({ fullName, email, password: pw })});
        // if (!res.ok) { setError("Sign up failed"); return; }
        alert(`Sign up (demo): ${fullName} — ${email}`);
    };

    return (
        <div className="wrap signup-page">
            {/* Header */}
            <header className="container header" role="banner" style={{ height: "72px" }}>
                <div className="brand">
                    <div className="brand-badge">CC</div>
                    ClubConnect
                </div>
                <nav className="nav" aria-label="Main">
                    <Link className="btn" to="/">Home</Link>
                    <Link className="btn" to="/login">Log In</Link>
                </nav>
            </header>

            {/* Content */}
            <section className="signup-section">
                <div className="signup-card">
                    <div className="signup-body">
                        <h1 className="title signup-title">Create your account</h1>
                        <p className="subtitle signup-subtitle">
                            Get started in seconds. You can invite teammates later.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full name</label>
                                <input
                                    type="text"
                                    placeholder="First Last"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <div className="password-wrap">
                                    <input
                                        type={showPw1 ? "text" : "password"}
                                        placeholder="**********"
                                        value={pw}
                                        onChange={(e) => setPw(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn small ghost"
                                        onClick={() => setShowPw1((s) => !s)}
                                    >
                                        {showPw1 ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Confirm password</label>
                                <div className="password-wrap">
                                    <input
                                        type={showPw2 ? "text" : "password"}
                                        placeholder="**********"
                                        value={pw2}
                                        onChange={(e) => setPw2(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn small ghost"
                                        onClick={() => setShowPw2((s) => !s)}
                                    >
                                        {showPw2 ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={agree}
                                        onChange={(e) => setAgree(e.target.checked)}
                                    />
                                    I agree to the <a href="#" className="muted">Terms</a> and <a href="#" className="muted">Privacy</a>
                                </label>
                                <span className="muted" />
                            </div>

                            {error && <div className="form-error" role="alert">{error}</div>}

                            <div className="form-actions">
                                <button type="submit" className="btn primary">Create Account</button>
                                <Link to="/login" className="btn ghost">I already have an account</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SignupPage;
