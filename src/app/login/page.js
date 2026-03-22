"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [step, setStep] = useState("select-role"); // "select-role" or "admin-login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  const handleCustomerContinue = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      router.push("/");
    }, 1500); // Match animation duration
  };

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
        setIsLoggingIn(true);
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 1500);
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
    <div className={`app-container ${isLoggingIn ? 'logging-in' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel login-card" style={{ width: "100%", maxWidth: "400px", padding: "40px 24px", textAlign: "center", transition: 'all 0.8s ease' }}>
        
        <img src="/logo.jpg" alt="Tastes of Godavari Logo" style={{ width: '120px', height: 'auto', margin: '0 auto 16px', display: 'block', borderRadius: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: "var(--primary)", fontWeight: "900", fontStyle: "italic", marginBottom: "8px", fontSize: "2rem" }}>Tastes of Godavari</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "1rem", fontWeight: "500" }}>
          {step === "select-role" ? "The Chef awaits your order..." : "Admin Access Required"}
        </p>

        {errorMsg && <p style={{ color: "var(--primary)", background: "rgba(157, 2, 8, 0.05)", padding: "12px", borderRadius: "12px", marginBottom: "16px", fontSize: "0.9rem", fontWeight: "600", border: '1px solid rgba(157, 2, 8, 0.1)' }}>{errorMsg}</p>}

        {step === "select-role" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={handleCustomerContinue} className="btn-primary" style={{ padding: '18px' }}>
              Order Now ➔
            </button>
            <button onClick={() => setStep("admin-login")} style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.1)", color: "#333", fontWeight: "800", width: "100%", padding: "16px", borderRadius: "16px", fontSize: "1.1rem", cursor: "pointer", backdropFilter: 'blur(5px)' }}>
              Staff Login
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
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Admin Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingRight: '45px' }}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '15px', top: '22px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
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
