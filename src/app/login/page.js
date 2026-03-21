"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [step, setStep] = useState("select-role"); // "select-role" or "admin-login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.refresh(); 
        router.push("/admin/dashboard");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Invalid Credentials.");
      }
    } catch (err) {
      setErrorMsg("Network error.");
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div style={{ background: "var(--surface)", width: "100%", maxWidth: "400px", borderRadius: "24px", padding: "32px 24px", boxShadow: "var(--shadow-md)", textAlign: "center" }}>
        
        <div style={{ fontSize: "50px", marginBottom: "16px" }}>{step === "admin-login" ? "👨‍🍳" : "✨"}</div>
        <img src="/logo.jpg" alt="Tastes of Godavari Logo" style={{ width: '180px', height: 'auto', margin: '0 auto 16px', display: 'block', borderRadius: '16px' }} />
        <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "0.95rem" }}>
          {step === "select-role" ? "Welcome back! Who is cooking in today?" : "Enter Chef Credentials"}
        </p>

        {errorMsg && <p style={{ color: "var(--primary)", background: "rgba(230, 57, 70, 0.1)", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.9rem", fontWeight: "600" }}>{errorMsg}</p>}

        {step === "select-role" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={() => router.push("/")} className="btn-primary" style={{ width: "100%", padding: "16px", borderRadius: "16px", fontSize: "1.1rem" }}>
              Continue as Guest ➔
            </button>
            <button onClick={() => setStep("admin-login")} style={{ background: "rgba(255,255,255,0.7)", border: "2px solid #D4A373", color: "#1D3557", fontWeight: "bold", width: "100%", padding: "16px", borderRadius: "16px", fontSize: "1.1rem", cursor: "pointer" }}>
              Login as Chef 👨‍🍳
            </button>
          </div>
        )}

        {step === "admin-login" && (
          <form onSubmit={handleAdminLogin}>
            <input 
              type="email" 
              placeholder="Admin Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
            <button type="submit" className="btn-primary" style={{ width: "100%", padding: "16px", borderRadius: "16px", marginTop: "8px" }} disabled={loading}>
              {loading ? "Verifying..." : "Login to Dashboard"}
            </button>
            <button type="button" onClick={() => setStep("select-role")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", marginTop: "16px", textDecoration: "underline", cursor: "pointer", fontWeight: "600" }}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
