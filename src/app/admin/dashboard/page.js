"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("new"); // "new", "completed", "menu", "analytics"
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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
      else setOrders([]);
    }
  };

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setMenu(data);
    } else {
      const localMenu = localStorage.getItem('stall_menu');
      if (localMenu) setMenu(JSON.parse(localMenu));
      else setMenu([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();

    const syncAcrossTabs = (e) => {
      if (e.key === 'stall_orders') fetchOrders();
      if (e.key === 'stall_menu') fetchMenu();
    };
    window.addEventListener('storage', syncAcrossTabs);

    const orderChannel = supabase.channel('public:orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();

    return () => {
      window.removeEventListener('storage', syncAcrossTabs);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  const markAsDelivered = async (orderId, paymentStatus) => {
    const finalPaymentStatus = paymentStatus === "pending" ? "paid" : paymentStatus;
    const { error } = await supabase.from('orders').update({ order_status: "delivered", payment_status: finalPaymentStatus }).eq('id', orderId);
    
    const updated = orders.map(o => o.id === orderId ? { ...o, order_status: "delivered", payment_status: finalPaymentStatus } : o);
    setOrders(updated);
    if (error) localStorage.setItem('stall_orders', JSON.stringify(updated));
  };

  const deleteOrder = async (orderId) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('stall_orders', JSON.stringify(updated));
    if (error) console.error("Error deleting order from Supabase:", error.message);
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

  const filterOrders = (orderList) => {
    if (!searchTerm) return orderList;
    const term = searchTerm.toLowerCase();
    return orderList.filter(o => 
      o.customer_phone?.toLowerCase().includes(term) || 
      o.id.toLowerCase().includes(term) ||
      (o.order_number && `tog-${o.order_number}`.includes(term))
    );
  };

  const newOrders = filterOrders(orders.filter(o => o.order_status === "new"));
  const completedOrders = filterOrders(orders.filter(o => o.order_status === "delivered"));

  // Calculate analytics
  const salesSummary = orders
    .filter(o => o.order_status === "delivered")
    .reduce((acc, order) => {
      order.items.forEach(item => {
        if (!acc[item.name]) acc[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        acc[item.name].quantity += item.quantity;
        acc[item.name].revenue += (item.price * item.quantity);
      });
      return acc;
    }, {});

  const analyticsList = Object.values(salesSummary).sort((a, b) => b.quantity - a.quantity);

  return (
    <div className="app-container" style={{ maxWidth: "800px", padding: '20px' }}>
      <header className="header" style={{ marginBottom: "20px" }}>
        <h1>Admin Live 📊</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href='/login'; }} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {/* ADMIN SECURE TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button onClick={() => setActiveTab('new')} className={activeTab === 'new' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap' }}>Orders ({newOrders.length})</button>
        <button onClick={() => setActiveTab('completed')} className={activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap', background: activeTab === 'completed' ? '' : 'var(--text-muted)' }}>Delivered ({completedOrders.length})</button>
        <button onClick={() => setActiveTab('analytics')} className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap', background: activeTab === 'analytics' ? '' : 'var(--text-muted)' }}>Analytics</button>
        <button onClick={() => setActiveTab('menu')} className={activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 20px', flex: 1, whiteSpace: 'nowrap', background: activeTab === 'menu' ? '' : 'var(--text-muted)' }}>Menu</button>
      </div>

      {/* SEARCH BAR */}
      {(activeTab === 'new' || activeTab === 'completed') && (
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search by phone or order ID..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="input-field" 
            style={{ marginBottom: 0 }}
          />
        </div>
      )}

      {/* NEW ORDERS TAB */}
      {activeTab === 'new' && (
        <div className="admin-grid" style={{ display: 'grid', gap: '16px' }}>
          {newOrders.length === 0 ? <p style={{ textAlign: "center", marginTop: "40px", color: "var(--text-muted)" }}>No matching orders found.</p> : 
            newOrders.map((order) => (
              <div className="admin-card" key={order.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  <button onClick={() => deleteOrder(order.id)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>Delete</button>
                </div>
                <p style={{ marginBottom: "12px", fontWeight: "600", color: "var(--text-main)" }}>📞 {order.customer_phone}</p>
                <div style={{ marginBottom: "16px", color: "var(--text-muted)" }}>
                  {order.items.map((item, i) => (
                    <div key={i}>{item.quantity}x {item.name}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span className="badge-status" style={{ flex: 1, textAlign: 'center', background: order.payment_method === "upi" ? "rgba(42, 157, 143, 0.1)" : "rgba(244, 162, 97, 0.1)", color: order.payment_method === "upi" ? "var(--success)" : "var(--secondary)" }}>
                    {order.payment_method.toUpperCase()} ({order.payment_status})
                  </span>
                  <button className="btn-success" onClick={() => markAsDelivered(order.id, order.payment_status)} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Mark Delivered ✅
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* COMPLETED ORDERS TAB */}
      {activeTab === 'completed' && (
        <div className="admin-grid" style={{ display: 'grid', gap: '16px' }}>
          {completedOrders.length === 0 ? <p style={{ textAlign: "center", marginTop: "40px", color: "var(--text-muted)" }}>No matching completed orders found.</p> : 
            completedOrders.map((order) => (
              <div className="admin-card" key={order.id} style={{ borderColor: "var(--success)", opacity: 0.8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  <button onClick={() => deleteOrder(order.id)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>Delete</button>
                </div>
                <div style={{ marginBottom: "8px", color: "var(--text-muted)" }}>
                  {order.items.map((item, i) => (
                    <div key={i}>{order.items && order.items.length > 0 ? (item.quantity + "x " + item.name) : ""}</div>
                  ))}
                </div>
                {order.total_amount && <p style={{ fontWeight: "700", color: "var(--text-main)" }}>Total: ₹{order.total_amount} | {order.customer_phone}</p>}
              </div>
            ))
          }
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div style={{ background: "var(--surface)", padding: "24px", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ marginBottom: "20px", color: "var(--text-main)" }}>Sales Summary 📈</h2>
          {analyticsList.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No sales data available yet.</p> : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {analyticsList.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: '600' }}>{item.name}</div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.quantity} sold</span>
                    <span style={{ color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>₹{item.revenue}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid var(--primary)', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.2rem' }}>
                <span>Total Revenue</span>
                <span>₹{analyticsList.reduce((sum, item) => sum + item.revenue, 0)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MENU MANAGEMENT TAB */}
      {activeTab === 'menu' && (
        <div>
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

