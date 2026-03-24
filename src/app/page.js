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
    const { data } = await supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order', { ascending: true });
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

  const createRipple = (event) => {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();
    button.appendChild(circle);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, i) => {
      const priceVal = parseFloat(i.price.toString().replace(/[^0-9.]/g, '')) || 0;
      return sum + (priceVal * i.quantity);
    }, 0);
  };

  const calculateItemCount = () => {
    return cart.reduce((sum, i) => sum + i.quantity, 0);
  };

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryOrder, setCategoryOrder] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'category_order').single();
      if (data) setCategoryOrder(data.value);
    };
    fetchSettings();
  }, []);

  const sortedUniqueCategories = Array.from(new Set(menu.map(item => item.category || 'Other')));
  
  const categories = ["All", ...[...categoryOrder, ...sortedUniqueCategories.filter(c => !categoryOrder.includes(c))].filter(c => sortedUniqueCategories.includes(c))];

  const filteredMenu = selectedCategory === "All" 
    ? menu 
    : menu.filter(item => (item.category || 'Other') === selectedCategory);

  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: "10px" }}>
        <div>
          <img src="/logo.jpg" alt="Tastes of Godavari Logo" style={{ width: '120px', height: 'auto', borderRadius: '16px' }} />
          <p style={{ color: "var(--primary)", fontSize: "1rem", fontWeight: "900", textTransform: "uppercase", marginTop: "4px" }}>Tastes of Godavari</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/history" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.8rem' }}>📜 History</Link>
          <Link href="/login" style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(157, 2, 8, 0.2)' }}> castles Staff</Link>
        </div>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <span style={{ 
          background: 'rgba(255, 183, 3, 0.95)', 
          color: '#000', 
          padding: '8px 20px', 
          borderRadius: '25px', 
          fontSize: '0.9rem', 
          fontWeight: '900',
          border: '2px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 8px 32px rgba(255, 183, 3, 0.3)',
          display: 'inline-block',
          animation: 'pulse 2s infinite'
        }}>
          ⚠️ Prices will be updated soon!
        </span>
      </div>

      {/* Category Tabs */}
      <nav className="category-nav">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="menu-sections" style={{ display: 'grid', gap: '24px', paddingBottom: '120px', marginTop: '10px' }}>
        {filteredMenu.length === 0 ? (
          <div className="glass-panel" style={{ margin: '40px 20px', padding: '40px', textAlign: 'center' }}>
            <p style={{ color: "var(--text-muted)", fontWeight: '600' }}>No items found in this section. 🐭</p>
          </div>
        ) : (
          // Group by category and sort according to categoryOrder
          [...categoryOrder, ...Array.from(new Set(menu.map(i => i.category || 'Other'))).filter(c => !categoryOrder.includes(c))]
            .filter(cat => selectedCategory === "All" || cat === selectedCategory)
            .map(category => {
              const items = filteredMenu.filter(item => (item.category || 'Other') === category).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
              if (items.length === 0) return null;
              return (
                <div key={category} className="menu-category-group">
                  {selectedCategory === "All" && <h3 className="category-title" style={{ marginBottom: "16px" }}>{category}</h3>}
              <div className="menu-grid">
                {items.map((item) => (
                  <div key={item.id} className="glass-card menu-card" style={{ overflow: 'hidden' }}>
                    <img src={item.image_url} alt={item.name} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)', fontFamily: "'Playfair Display', serif" }}>{item.name}</h3>
                      <span style={{ fontWeight: 800, color: "var(--text-muted)", fontSize: "1.1rem" }}>₹{item.price}</span>
                    </div>
                    <button 
                      className="btn-primary" 
                      onClick={(e) => { createRipple(e); addToCart(item); }} 
                      style={{ 
                        width: "50px", 
                        height: "50px", 
                        padding: 0, 
                        margin: 0, 
                        borderRadius: "15px", 
                        fontSize: "1.4rem",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
                );
            })
        )}
      </div>

      {cart.length > 0 && (
        <div className="cart-float" style={{ background: 'linear-gradient(135deg, #1D3557 0%, #283618 100%)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: '440px', borderRadius: '50px', zIndex: '1000' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
            🛒 {calculateItemCount()} items | ₹{calculateTotal()}
          </span>
          <Link href="/cart">
            <button className="btn-success" style={{ padding: "10px 24px", background: 'white', color: '#1D3557', border: 'none', borderRadius: '100px', fontWeight: '800', cursor: 'pointer', fontSize: '1rem' }}>To Cart ➔</button>
          </Link>
        </div>
      )}
    </div>
  );
}
