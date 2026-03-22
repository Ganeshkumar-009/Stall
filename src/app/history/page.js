"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedPhone = localStorage.getItem("stall_customer_phone");
    if (savedPhone) {
      setPhone(savedPhone);
      fetchOrders(savedPhone);
      setIsLoggedIn(true);
    }
  }, []);

  const fetchOrders = async (phoneNum) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_phone", phoneNum)
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (phone.length < 10) return alert("Please enter a valid 10-digit mobile number.");
    localStorage.setItem("stall_customer_phone", phone);
    setIsLoggedIn(true);
    fetchOrders(phone);
  };

  const logout = () => {
    localStorage.removeItem("stall_customer_phone");
    setIsLoggedIn(false);
    setOrders([]);
    setPhone("");
  };

  if (!isLoggedIn) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
        <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "50px", marginBottom: "16px" }}>📜</div>
          <h1 style={{ color: "var(--primary)", fontWeight: "800", marginBottom: "8px", fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>Order History</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontWeight: '500' }}>Enter your mobile number to see your past orders.</p>
          
          <form onSubmit={handleLogin}>
            <input 
              type="tel" 
              placeholder="10-digit Mobile Number" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              required
            />
            <button type="submit" className="btn-primary" style={{ width: "100%", padding: "16px", borderRadius: "16px", marginTop: "8px" }}>
              View My History ➔
            </button>
          </form>
          <Link href="/">
            <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", marginTop: "16px", textDecoration: "underline", cursor: "pointer", fontWeight: "600" }}>
              Back to Menu
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: '20px' }}>
      <header className="glass-panel" style={{ marginBottom: "20px", padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Playfair Display', serif", color: 'var(--primary)' }}>My Orders 📜</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0, fontWeight: '600' }}>Phone: {phone}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={logout} style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '20px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
          <Link href="/"><button style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '20px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(157, 2, 8, 0.2)' }}>Menu</button></Link>
        </div>
      </header>

      {loading ? <p style={{ textAlign: 'center', marginTop: '40px' }}>Loading your orders...</p> : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '16px' }}>No orders found for this number. 🍽️</p>
              <Link href="/"><button className="btn-secondary" style={{ width: 'auto', padding: '12px 30px' }}>Order Something Now</button></Link>
            </div>
          ) : (
            orders.map((order) => (
              <div className="glass-card admin-card" key={order.id} style={{ borderLeftColor: order.order_status === 'delivered' ? 'var(--success)' : 'var(--primary)', marginBottom: '4px' }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                      {new Date(order.created_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                    </span>
                  </div>
                  <span className="badge-status" style={{ 
                    background: order.order_status === 'delivered' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(230, 57, 70, 0.1)', 
                    color: order.order_status === 'delivered' ? 'var(--success)' : 'var(--primary)',
                    height: 'fit-content'
                  }}>
                    {order.order_status.toUpperCase()}
                  </span>
                </div>
                
                <div style={{ marginBottom: "12px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                  {order.items.map((item, i) => (
                    <div key={i}>{item.quantity}x {item.name}</div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
                  <span style={{ fontWeight: "700" }}>Total: ₹{order.total_amount}</span>
                  <Link href={`/receipt/${order.id}`} style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem' }}>View Receipt ➔</Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
