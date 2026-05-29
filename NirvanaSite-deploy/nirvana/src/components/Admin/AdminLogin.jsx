import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import styles from "./AdminLogin.module.css";

const AdminLogin = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState("login"); // "login" or "changePassword"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
        setSuccess(null);
    };

    const switchMode = (newMode) => {
        resetForm();
        setMode(newMode);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate("/admin");
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validate new passwords match
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        // Validate minimum length
        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters.");
            return;
        }

        // Make sure new password is different
        if (password === newPassword) {
            setError("New password must be different from the old password.");
            return;
        }

        setLoading(true);

        try {
            // Step 1: Sign in with current credentials to verify identity
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw new Error("Current email or password is incorrect.");

            // Step 2: Update to the new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            setSuccess("Password changed successfully! Redirecting to dashboard...");

            setTimeout(() => {
                navigate("/admin");
            }, 1500);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.logo}>Nirvana Admin</div>

                {mode === "login" ? (
                    <>
                        <h2 className={styles.title}>Welcome Back</h2>
                        <p className={styles.subtitle}>Sign in to manage your portfolio</p>

                        {error && <div className={styles.error}>{error}</div>}
                        {success && <div className={styles.success}>{success}</div>}

                        <form onSubmit={handleLogin} className={styles.form}>
                            <div className={styles.field}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        <button
                            className={styles.toggleLink}
                            onClick={() => switchMode("changePassword")}
                        >
                            Change Password
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className={styles.title}>Change Password</h2>
                        <p className={styles.subtitle}>Verify your identity and set a new password</p>

                        {error && <div className={styles.error}>{error}</div>}
                        {success && <div className={styles.success}>{success}</div>}

                        <form onSubmit={handleChangePassword} className={styles.form}>
                            <div className={styles.field}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.field}>
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="At least 6 characters"
                                    minLength={6}
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Re-type new password"
                                    minLength={6}
                                />
                            </div>
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? "Updating..." : "Update Password"}
                            </button>
                        </form>

                        <button
                            className={styles.toggleLink}
                            onClick={() => switchMode("login")}
                        >
                            ← Back to Sign In
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;
