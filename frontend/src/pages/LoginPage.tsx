// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { useAuth } from "../context/AuthContext";

const LoginPage: React.FC = () => {
    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        try {
            await login(email.trim().toLowerCase(), password);
            // if remember=false you could clear localStorage here; we keep it simple
            navigate("/"); // or /dashboard
        } catch (err: any) {
            setError("Invalid credentials.");
        }
    };

    return (
        <div className="wrap login-page">
            {/* Header */}
            <header className="container header" role="banner" style={{ height: "72px" }}>
                <div className="brand">
                    <div className="brand-badge">CC</div>
                    ClubConnect
                </div>
                <nav className="nav" aria-label="Main">
                    <Link className="btn" to="/">Home</Link>
                    <Link className="btn" to="/signup">Sign Up</Link>
                </nav>
            </header>

            {/* Centered Login Form */}
            <section className="login-section">
                <div className="login-card">
                    <div className="login-body">
                        <h1 className="title login-title">Log in</h1>
                        <p className="subtitle login-subtitle">
                            Welcome back! Enter your credentials to continue.
                        </p>

                        <form onSubmit={handleSubmit}>
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
                                        type={showPw ? "text" : "password"}
                                        placeholder="**********"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn small ghost"
                                        onClick={() => setShowPw((s) => !s)}
                                    >
                                        {showPw ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                    />
                                    Remember me
                                </label>
                                <Link to="#" className="muted">Forgot password?</Link>
                            </div>

                            {error && <p className="form-error">{error}</p>}

                            <div className="form-actions">
                                <button type="submit" className="btn primary">Sign In</button>
                                <Link to="/signup" className="btn ghost">Create Account</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LoginPage;
