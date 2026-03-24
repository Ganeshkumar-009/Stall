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
  const [newItemCategory, setNewItemCategory] = useState("Biryani");
  const [newItemImage, setNewItemImage] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('key', 'is_payment_enabled').single();
    if (data) {
      setIsPaymentEnabled(data.value);
    } else if (error && error.code === 'PGRST116') {
      // Key doesn't exist, create it if we need to? 
      // For now just assume true if not found in DB
      setIsPaymentEnabled(true);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    fetchSettings();

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
      price: newItemPrice, // Store as string to allow symbols
      category: newItemCategory,
      image_url: newItemImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=250&auto=format&fit=crop",
      is_available: editingItem ? editingItem.is_available : true
    };

    if (editingItem) {
      const { data, error } = await supabase.from('menu_items').update(payload).eq('id', editingItem.id).select();
      
      if (error) {
        const newMenu = menu.map(item => item.id === editingItem.id ? { ...item, ...payload } : item);
        setMenu(newMenu);
        localStorage.setItem('stall_menu', JSON.stringify(newMenu));
      } else if (data) {
        setMenu(menu.map(item => item.id === editingItem.id ? data[0] : item));
      }
      setEditingItem(null);
    } else {
      const { data, error } = await supabase.from('menu_items').insert([payload]).select();
      
      if (error) {
        const newMenu = [{ id: `ITEM-${Date.now()}`, ...payload }, ...menu];
        setMenu(newMenu);
        localStorage.setItem('stall_menu', JSON.stringify(newMenu));
      } else if (data) {
        setMenu([...data, ...menu]);
      }
    }

    setNewItemName(""); setNewItemPrice(""); setNewItemImage(""); setNewItemCategory("Biryani");
    setIsAdding(false);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemPrice(item.price);
    setNewItemCategory(item.category || "Biryani");
    setNewItemImage(item.image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setNewItemName(""); setNewItemPrice(""); setNewItemImage(""); setNewItemCategory("Biryani");
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

  const togglePayment = async () => {
    setIsSavingSettings(true);
    const newVal = !isPaymentEnabled;
    const { error } = await supabase.from('settings').upsert({ key: 'is_payment_enabled', value: newVal });
    
    if (!error) {
      setIsPaymentEnabled(newVal);
      localStorage.setItem('stall_payment_enabled', newVal);
      alert(`Payments ${newVal ? 'Enabled' : 'Disabled (Opens Soon)'}`);
    } else {
      console.error("Error updating settings:", error);
      alert(`Failed to update setting: ${error.message}. Please make sure you have run the SQL script and disabled RLS on the 'settings' table.`);
    }
    setIsSavingSettings(false);
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
    <div className="app-container" style={{ maxWidth: "800px", padding: '20px', background: 'url("/biryani_bg.jpg") center center / cover no-repeat fixed' }}>
      <header className="header" style={{ marginBottom: "20px" }}>
        <img src="/logo.jpg" alt="Tastes of Godavari Logo" style={{ width: '100px', height: 'auto', borderRadius: '12px' }} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href='/login'; }} style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '20px', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(5px)', cursor: 'pointer', fontWeight: 'bold' }}>🚪 Log out</button>
        </div>
      </header>

      {/* ADMIN SECURE TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', padding: '4px' }}>
        <button onClick={() => setActiveTab('new')} className={activeTab === 'new' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 10px', flex: 1, whiteSpace: 'nowrap', borderRadius: '15px' }}>📦 Orders ({newOrders.length})</button>
        <button onClick={() => setActiveTab('completed')} className={activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 10px', flex: 1, whiteSpace: 'nowrap', borderRadius: '15px' }}>✅ Served</button>
        <button onClick={() => setActiveTab('analytics')} className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 10px', flex: 1, whiteSpace: 'nowrap', borderRadius: '15px' }}>📈 Score</button>
        <button onClick={() => setActiveTab('menu')} className={activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 10px', flex: 1, whiteSpace: 'nowrap', borderRadius: '15px' }}>📜 Pantry</button>
        <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} style={{ margin: 0, padding: '12px 10px', flex: 1, whiteSpace: 'nowrap', borderRadius: '15px' }}>⚙️ Setup</button>
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
              <div className="glass-card admin-card" key={order.id} style={{ borderLeft: '6px solid var(--primary)', marginBottom: '4px' }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                      {new Date(order.created_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                    </span>
                  </div>
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
              <div className="glass-card admin-card" key={order.id} style={{ borderLeft: '6px solid var(--success)', marginBottom: '4px' }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{order.order_number ? `#TOG-${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                      {new Date(order.created_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                    </span>
                  </div>
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

      {activeTab === 'analytics' && (
        <div className="glass-panel" style={{ padding: "30px", border: '2px solid var(--primary)' }}>
          <h2 style={{ marginBottom: "20px", color: "var(--primary)", fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1.8rem' }}>Culinary Success 📈</h2>
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

      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: "24px", border: '2px solid var(--primary)', position: 'relative' }}>
            {editingItem && (
              <button onClick={cancelEdit} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: '900' }}>×</button>
            )}
            <h2 style={{ marginBottom: "20px", color: "var(--primary)", fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{editingItem ? "Update Masterpiece" : "Create New Masterpiece"}</h2>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Item Name (e.g. Chicken Biryani)" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="input-field" style={{ marginBottom: 0 }} required />
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="text" placeholder="Price (₹)" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="input-field" style={{ marginBottom: 0, flex: 1 }} required />
                <select 
                  value={newItemCategory} 
                  onChange={e => setNewItemCategory(e.target.value)} 
                  className="input-field" 
                  style={{ marginBottom: 0, flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: 'white' }}
                >
                  <option value="Biryani">Biryani</option>
                  <option value="Soft Drinks">Soft Drinks</option>
                  <option value="Sweets">Sweets</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Starters">Starters</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <input type="url" placeholder="Image URL (optional)" value={newItemImage} onChange={e => setNewItemImage(e.target.value)} className="input-field" style={{ marginBottom: 0 }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" disabled={isAdding} style={{ flex: 2, marginTop: '4px' }}>
                  {isAdding ? (editingItem ? "Updating..." : "Adding...") : (editingItem ? "💾 Save Changes" : "+ Add to Menu Live")}
                </button>
                {editingItem && (
                  <button type="button" onClick={cancelEdit} className="btn-secondary" style={{ flex: 1, marginTop: '4px', borderRadius: '12px' }}>Cancel</button>
                )}
              </div>
            </form>
          </div>

          <h2 style={{ marginBottom: "16px", color: "var(--text-main)", fontSize: "1.2rem" }}>Current Menu</h2>
          <div style={{ display: 'grid', gap: '24px' }}>
            {menu.length === 0 ? <p style={{ color: "var(--text-muted)" }}>Menu is empty.</p> : 
              // Group by category
              Object.entries(
                menu.reduce((acc, item) => {
                  const cat = item.category || 'Other';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(item);
                  return acc;
                }, {})
              ).map(([category, items]) => (
                <div key={category}>
                  <h3 style={{ fontSize: "1rem", color: "var(--primary)", textTransform: "uppercase", marginBottom: "12px", borderBottom: "2px solid var(--primary)", display: "inline-block", paddingRight: "10px" }}>{category}</h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {items.map((item) => (
                      <div key={item.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: "16px", opacity: item.is_available ? 1 : 0.6, borderLeft: '4px solid var(--primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <img src={item.image_url} alt={item.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{item.name}</h3>
                            <p style={{ margin: 0, fontWeight: '700', color: "var(--text-muted)" }}>₹{item.price}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => startEdit(item)} style={{ background: 'var(--accent-gold)', color: '#582f0e', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Edit
                          </button>
                          <button onClick={() => toggleAvailability(item.id, item.is_available)} style={{ background: item.is_available ? 'var(--secondary)' : 'var(--success)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {item.is_available ? 'Pause' : 'Resume'}
                          </button>
                          <button onClick={() => deleteItem(item.id)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: "30px", border: '2px solid var(--primary)' }}>
          <h2 style={{ marginBottom: "24px", color: "var(--primary)", fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1.8rem' }}>Stall Configuration ⚙️</h2>
          
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Accept Online Payments</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isPaymentEnabled ? 'Currently accepting orders' : 'Showing "Opens Soon" to customers'}
              </p>
            </div>
            <button 
              onClick={togglePayment} 
              disabled={isSavingSettings}
              style={{ 
                background: isPaymentEnabled ? 'var(--success)' : 'var(--primary)', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                minWidth: '100px'
              }}
            >
              {isSavingSettings ? 'Saving...' : (isPaymentEnabled ? 'ON' : 'OFF')}
            </button>
          </div>
          
          {!isPaymentEnabled && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(232, 6, 6, 0.05)', borderRadius: '12px', border: '1px solid rgba(232, 6, 6, 0.1)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                ℹ️ Customers can still add items to their cart but cannot proceed to payment. They will see a "Launching in 5 days! Opens soon" notice.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

