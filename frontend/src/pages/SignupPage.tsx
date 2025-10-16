// src/pages/SignupPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignupPage.css";
import { useAuth } from "../context/AuthContext";

const SignupPage: React.FC = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();

    // form fields
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    // group/create-or-join
    const [mode, setMode] = useState<"create" | "join">("create");
    const [groupName, setGroupName] = useState("");
    const [inviteCode, setInviteCode] = useState("");

    // ui state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setInfo("");

        const username = email.trim().toLowerCase();

        // basic validation
        if (!username || !password) return setError("Email and password are required.");
        if (password !== confirm) return setError("Passwords do not match.");
        if (mode === "create" && !groupName.trim()) return setError("Please enter a group name.");
        if (mode === "join" && !inviteCode.trim()) return setError("Please enter an invite code.");

        try {
            setSubmitting(true);
            const res = await signup(
                username,
                password,
                displayName || undefined,
                mode === "create"
                    ? { mode, groupName: groupName.trim() }
                    : { mode, inviteCode: inviteCode.trim() }
            );

            if (res.groupCode) {
                setInfo(`Group created! Share this code with teammates: ${res.groupCode}`);
            }

            // route into the app (adjust to /dashboard if you prefer)
            navigate("/");
        } catch (err: any) {
            setError("Could not create account. Username may already exist or code is invalid.");
        } finally {
            setSubmitting(false);
        }
    }

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

            {/* Centered Signup Form */}
            <section className="signup-section">
                <div className="signup-card">
                    <div className="signup-body">
                        <h1 className="title">Create your account</h1>
                        <p className="subtitle">Join your team or create a new one.</p>

                        <form onSubmit={handleSubmit}>
                            {/* Email */}
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            {/* Display Name */}
                            <div className="form-group">
                                <label>Display Name (optional)</label>
                                <input
                                    type="text"
                                    placeholder="Your name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
                            </div>

                            {/* Password + Confirm */}
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            {/* Create or Join toggle */}
                            <div className="form-group">
                                <label>Team Option</label>
                                <div className="row">
                                    <label className="checkbox">
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={mode === "create"}
                                            onChange={() => setMode("create")}
                                        />
                                        Create a new group
                                    </label>
                                    <label className="checkbox" style={{ marginLeft: "1rem" }}>
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={mode === "join"}
                                            onChange={() => setMode("join")}
                                        />
                                        Join with code
                                    </label>
                                </div>
                            </div>

                            {/* Conditional field */}
                            {mode === "create" ? (
                                <div className="form-group">
                                    <label>Group Name</label>
                                    <input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Clemson Club Lacrosse"
                                    />
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Invite Code</label>
                                    <input
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="e.g., abC12_X"
                                    />
                                </div>
                            )}

                            {/* Messages */}
                            {error && <p className="form-error">{error}</p>}
                            {info && <p className="form-info">{info}</p>}

                            {/* Actions */}
                            <div className="form-actions">
                                <button type="submit" className="btn primary" disabled={submitting}>
                                    {submitting ? "Creating..." : "Create Account"}
                                </button>
                                <Link to="/login" className="btn ghost">Already have an account?</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SignupPage;
