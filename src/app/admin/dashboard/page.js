"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("new"); // "new", "completed", "menu"
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);

  // Form states for adding items
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setOrders(data);
    } else {
      const localOrders = localStorage.getItem('stall_orders');
      if (localOrders) setOrders(JSON.parse(localOrders));
      else setOrders([]); // No hardcoded mocks!
    }
  };

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setMenu(data);
    } else {
      const localMenu = localStorage.getItem('stall_menu');
      if (localMenu) setMenu(JSON.parse(localMenu));
      else setMenu([]); // No hardcoded mocks!
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();

    // Listen for events sent by the Customer Cart window (across tabs)
    const syncAcrossTabs = (e) => {
      if (e.key === 'stall_orders') fetchOrders();
      if (e.key === 'stall_menu') fetchMenu();
    };
    window.addEventListener('storage', syncAcrossTabs);

    // Supabase Real-time connection
    const orderChannel = supabase.channel('public:orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();

    return () => {
      window.removeEventListener('storage', syncAcrossTabs);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  const markAsDelivered = async (orderId, paymentStatus) => {
    const finalPaymentStatus = paymentStatus === "pending" ? "paid" : paymentStatus;
    const { error } = await supabase.from('orders').update({ order_status: "delivered", payment_status: finalPaymentStatus }).eq('id', orderId);
    
    // Optimistic UI Update
    const updated = orders.map(o => o.id === orderId ? { ...o, order_status: "delivered", payment_status: finalPaymentStatus } : o);
    setOrders(updated);
    if (error) localStorage.setItem('stall_orders', JSON.stringify(updated));
  };
  
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return alert("Name and Price required.");
    setIsAdding(true);
    
    const payload = {
      name: newItemName,
      price: parseInt(newItemPrice),
      image_url: newItemImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=250&auto=format&fit=crop",
      is_available: true
    };

    const { data, error } = await supabase.from('menu_items').insert([payload]).select();
    
    if (error) {
      console.warn("Saving new item to memory since DB table menu_items might be missing:", error.message);
      const newMenu = [{ id: `ITEM-${Date.now()}`, ...payload }, ...menu];
      setMenu(newMenu);
      localStorage.setItem('stall_menu', JSON.stringify(newMenu));
    } else if (data) {
      setMenu([...data, ...menu]);
    }

    setNewItemName(""); setNewItemPrice(""); setNewItemImage("");
    setIsAdding(false);
  };

  const deleteItem = async (id) => {
    if(!confirm("Are you sure you want to permanently delete this menu item?")) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    
    const newMenu = menu.filter(item => item.id !== id);
    setMenu(newMenu);
    if (error) localStorage.setItem('stall_menu', JSON.stringify(newMenu));
  };

  const toggleAvailability = async (id, currentStatus) => {
    const { error } = await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id);
    
    const newMenu = menu.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item);
    setMenu(newMenu);
    if (error) localStorage.setItem('stall_menu', JSON.stringify(newMenu));
  };

  const newOrders = orders.filter(o => o.order_status === "new");
  const completedOrders = orders.filter(o => o.order_status === "delivered");

  return (
    <div className="app-container" style={{ maxWidth: "800px", padding: '20px' }}>
      <header className="header" style={{ marginBottom: "20px" }}>
        <h1>Admin Live 📊</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href='/login'; }} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {/* ADMIN SECURE TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button onClick={() => setActiveTab('new')} className={activeTab === 'new' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap' }}>Orders ({newOrders.length})</button>
        <button onClick={() => setActiveTab('completed')} className={activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap', background: activeTab === 'completed' ? '' : 'var(--text-muted)' }}>Delivered ({completedOrders.length})</button>
        <button onClick={() => setActiveTab('menu')} className={activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap', background: activeTab === 'menu' ? '' : 'var(--text-muted)' }}>Manage Menu</button>
      </div>

      {/* NEW ORDERS TAB */}
      {activeTab === 'new' && (
        <div className="admin-grid" style={{ display: 'grid', gap: '16px' }}>
          {newOrders.length === 0 ? <p style={{ textAlign: "center", marginTop: "40px", color: "var(--text-muted)" }}>No new orders right now. Ready for rush!</p> : 
            newOrders.map((order) => (
              <div className="admin-card" key={order.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  <span className="badge-status" style={{ background: order.payment_method === "upi" ? "rgba(42, 157, 143, 0.1)" : "rgba(244, 162, 97, 0.1)", color: order.payment_method === "upi" ? "var(--success)" : "var(--secondary)" }}>
                    {order.payment_method.toUpperCase()} ({order.payment_status})
                  </span>
                </div>
                <p style={{ marginBottom: "12px", fontWeight: "600", color: "var(--text-main)" }}>📞 {order.customer_phone}</p>
                <div style={{ marginBottom: "16px", color: "var(--text-muted)" }}>
                  {order.items.map((item, i) => (
                    <div key={i}>{item.quantity}x {item.name}</div>
                  ))}
                </div>
                <button className="btn-success" onClick={() => markAsDelivered(order.id, order.payment_status)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                  Mark Delivered ✅
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* COMPLETED ORDERS TAB */}
      {activeTab === 'completed' && (
        <div className="admin-grid" style={{ display: 'grid', gap: '16px' }}>
          {completedOrders.length === 0 ? <p style={{ textAlign: "center", marginTop: "40px", color: "var(--text-muted)" }}>No completed orders yet.</p> : 
            completedOrders.map((order) => (
              <div className="admin-card" key={order.id} style={{ borderColor: "var(--success)", opacity: 0.8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  <span className="badge-status" style={{ background: "rgba(42, 157, 143, 0.1)", color: "var(--success)" }}>DELIVERED</span>
                </div>
                <div style={{ marginBottom: "8px", color: "var(--text-muted)" }}>
                  {order.items.map((item, i) => (
                    <div key={i}>{order.items && order.items.length > 0 ? (item.quantity + "x " + item.name) : ""}</div>
                  ))}
                </div>
                {order.total_amount && <p style={{ fontWeight: "700", color: "var(--text-main)" }}>Total: ₹{order.total_amount}</p>}
              </div>
            ))
          }
        </div>
      )}

      {/* MENU MANAGEMENT TAB */}
      {activeTab === 'menu' && (
        <div>
          {/* Add Item Form  */}
          <div style={{ background: "var(--surface)", padding: "20px", borderRadius: "16px", boxShadow: "var(--shadow-sm)", marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "16px", color: "var(--text-main)", fontSize: "1.2rem" }}>Add New Item</h2>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Item Name (e.g. Veg Burger)" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="input-field" style={{ marginBottom: 0 }} required />
              <input type="number" placeholder="Price (₹)" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="input-field" style={{ marginBottom: 0 }} required />
              <input type="url" placeholder="Image URL (optional)" value={newItemImage} onChange={e => setNewItemImage(e.target.value)} className="input-field" style={{ marginBottom: 0 }} />
              <button type="submit" className="btn-primary" disabled={isAdding} style={{ marginTop: '4px' }}>{isAdding ? "Adding..." : "+ Add to Menu Live"}</button>
            </form>
          </div>

          <h2 style={{ marginBottom: "16px", color: "var(--text-main)", fontSize: "1.2rem" }}>Current Menu</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {menu.length === 0 ? <p style={{ color: "var(--text-muted)" }}>Menu is empty.</p> : 
              menu.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: "var(--surface)", padding: "16px", borderRadius: "12px", boxShadow: "var(--shadow-sm)", opacity: item.is_available ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={item.image_url} alt={item.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{item.name}</h3>
                      <p style={{ margin: 0, fontWeight: '700', color: "var(--text-muted)" }}>₹{item.price}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleAvailability(item.id, item.is_available)} style={{ background: item.is_available ? 'var(--secondary)' : 'var(--success)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {item.is_available ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => deleteItem(item.id)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
