import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const maskEmail = (email) => {
    if (!email) return "***";
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const maskedLocal = local.length <= 2 ? local[0] + "***" : local[0] + "***" + local.slice(-1);
    return `${maskedLocal}@${domain}`;
};

const Unsubscribe = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [state, setState] = useState("loading"); // loading | confirm | success | already | invalid | error
    const [email, setEmail] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!token) {
            setState("invalid");
            return;
        }

        const lookup = async () => {
            const { data, error } = await supabase
                .from("alert_subscribers")
                .select("email, is_active")
                .eq("unsubscribe_token", token)
                .maybeSingle();

            if (error || !data) {
                setState("invalid");
                return;
            }

            if (!data.is_active) {
                setEmail(data.email);
                setState("already");
                return;
            }

            setEmail(data.email);
            setState("confirm");
        };

        lookup();
    }, [token]);

    const handleUnsubscribe = async () => {
        setProcessing(true);
        const { error } = await supabase
            .from("alert_subscribers")
            .update({ is_active: false })
            .eq("unsubscribe_token", token);

        if (error) {
            setState("error");
        } else {
            setState("success");
        }
        setProcessing(false);
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0b1324 0%, #10243f 100%)",
                padding: "20px",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "48px 40px",
                    maxWidth: "480px",
                    width: "100%",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                    textAlign: "center",
                }}
            >
                {state === "loading" && (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
                        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#333", margin: "0 0 8px" }}>
                            Loading...
                        </h2>
                        <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
                            Verifying your unsubscribe link.
                        </p>
                    </>
                )}

                {state === "confirm" && (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>📧</div>
                        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#171717", margin: "0 0 12px" }}>
                            Unsubscribe from Alerts
                        </h2>
                        <p style={{ color: "#666", fontSize: "15px", margin: "0 0 8px", lineHeight: 1.6 }}>
                            You are about to unsubscribe the following email from Nirvana Luxe alerts:
                        </p>
                        <p
                            style={{
                                fontWeight: 600,
                                color: "#171717",
                                fontSize: "16px",
                                background: "#f5f5f5",
                                padding: "10px 16px",
                                borderRadius: "8px",
                                display: "inline-block",
                                margin: "8px 0 24px",
                            }}
                        >
                            {maskEmail(email)}
                        </p>
                        <br />
                        <button
                            onClick={handleUnsubscribe}
                            disabled={processing}
                            style={{
                                padding: "12px 32px",
                                background: "#dc2626",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "15px",
                                fontWeight: 600,
                                cursor: processing ? "not-allowed" : "pointer",
                                opacity: processing ? 0.7 : 1,
                                transition: "all 0.2s",
                            }}
                        >
                            {processing ? "Processing..." : "Confirm Unsubscribe"}
                        </button>
                    </>
                )}

                {state === "success" && (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
                        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#171717", margin: "0 0 12px" }}>
                            You've Been Unsubscribed
                        </h2>
                        <p style={{ color: "#666", fontSize: "15px", margin: "0 0 24px", lineHeight: 1.6 }}>
                            <strong>{maskEmail(email)}</strong> has been removed from our mailing list. You will no
                            longer receive alert emails from us.
                        </p>
                        <Link
                            to="/"
                            style={{
                                display: "inline-block",
                                padding: "10px 24px",
                                background: "#171717",
                                color: "#fff",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                            }}
                        >
                            Back to Home
                        </Link>
                    </>
                )}

                {state === "already" && (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>ℹ️</div>
                        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#171717", margin: "0 0 12px" }}>
                            Already Unsubscribed
                        </h2>
                        <p style={{ color: "#666", fontSize: "15px", margin: "0 0 24px", lineHeight: 1.6 }}>
                            <strong>{maskEmail(email)}</strong> is already unsubscribed from our alerts.
                        </p>
                        <Link
                            to="/"
                            style={{
                                display: "inline-block",
                                padding: "10px 24px",
                                background: "#171717",
                                color: "#fff",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                            }}
                        >
                            Back to Home
                        </Link>
                    </>
                )}

                {state === "invalid" && (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
                        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#171717", margin: "0 0 12px" }}>
                            Invalid Link
                        </h2>
                        <p style={{ color: "#666", fontSize: "15px", margin: "0 0 24px", lineHeight: 1.6 }}>
                            This unsubscribe link is invalid or has expired. Please contact us if you need help.
                        </p>
                        <Link
                            to="/contact"
                            style={{
                                display: "inline-block",
                                padding: "10px 24px",
                                background: "#171717",
                                color: "#fff",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                            }}
                        >
                            Contact Us
                        </Link>
                    </>
                )}

                {state === "error" && (
                    <>
                        <div style={{ fontSize: "40px", marginBottom: "16px" }}>❌</div>
                        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#171717", margin: "0 0 12px" }}>
                            Something Went Wrong
                        </h2>
                        <p style={{ color: "#666", fontSize: "15px", margin: "0 0 24px", lineHeight: 1.6 }}>
                            We couldn't process your request. Please try again or contact our support team.
                        </p>
                        <Link
                            to="/contact"
                            style={{
                                display: "inline-block",
                                padding: "10px 24px",
                                background: "#171717",
                                color: "#fff",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                            }}
                        >
                            Contact Us
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default Unsubscribe;
