"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [menu, setMenu] = useState([]);
  const { addToCart, cart } = useCart();
  const router = useRouter();

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*').eq('is_available', true);
    if (data && data.length > 0) {
      setMenu(data);
    } else {
      const localMenu = localStorage.getItem('stall_menu');
      if (localMenu) setMenu(JSON.parse(localMenu).filter(i => i.is_available !== false));
      else setMenu([]); // Completely empty if nothing added by Admin!
    }
  };

  useEffect(() => {
    fetchMenu();

    // Listen for updates from the Admin Dashboard saving to localStorage
    const syncTabs = (e) => { if (e.key === 'stall_menu') fetchMenu(); };
    window.addEventListener('storage', syncTabs);

    return () => window.removeEventListener('storage', syncTabs);
  }, []);

  return (
    <div className="app-container">
      <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Tastes of Godavari</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>Order right to your table.</p>
        </div>
        <Link href="/login" style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none", border: "1px solid #eee", padding: "4px 8px", borderRadius: "6px" }}>Admin</Link>
      </header>

      <h2 className="section-title">Live Menu</h2>
      <div className="menu-grid">
        {menu.length === 0 ? <p style={{ color: "var(--text-muted)", gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}>Menu is empty. Wait for Admin to add items!</p> :
          menu.map((item) => (
            <div key={item.id} className="menu-card">
              <img src={item.image_url} alt={item.name} className="menu-image" />
              <div className="menu-details" style={{ flex: 1 }}>
                <h3 className="menu-title" style={{ margin: 0 }}>{item.name}</h3>
                <span className="menu-price" style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1.1rem" }}>₹{item.price}</span>
              </div>
              <button 
                className="btn-primary" 
                onClick={() => addToCart(item)} 
                style={{ 
                  width: "auto", 
                  padding: "10px 24px", 
                  margin: 0, 
                  borderRadius: "100px", 
                  fontSize: "1rem",
                  boxShadow: "none"
                }}
              >
                Add
              </button>
            </div>
          ))
        }
      </div>

      {cart.length > 0 && (
        <div className="cart-float">
          <span>{cart.reduce((sum, i) => sum + i.quantity, 0)} items | ₹{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
          <Link href="/cart">
            <button className="btn-success" style={{ padding: "10px 20px", marginLeft: "16px" }}>Checkout ➔</button>
          </Link>
        </div>
      )}
    </div>
  );
}
