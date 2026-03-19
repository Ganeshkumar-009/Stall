"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrderData() {
      const { data } = await supabase.from('orders').select('*').eq('id', id).single();
      
      if (data) {
        setOrder(data);
      } else {
        const localOrders = JSON.parse(localStorage.getItem('stall_orders') || '[]');
        const found = localOrders.find(o => o.id === id);
        if (found) setOrder(found);
      }
      setLoading(false);
    }
    if (id) fetchOrderData();
  }, [id]);

  useEffect(() => {
    // Automatically trigger Print/Save as PDF when the receipt completely mounts.
    if (order) {
      setTimeout(() => {
        window.print();
      }, 750);
    }
  }, [order]);

  if (loading) return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Receipt...</div>;
  if (!order) return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h3>Order not found</h3><Link href="/">Return to Menu</Link></div>;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: "white", width: "100%", maxWidth: "400px", padding: "32px", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
        <h1 style={{ color: "var(--success)", textAlign: "center", marginBottom: "8px" }}>Order Confirmed!</h1>
        <div style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "24px" }}>Receipt {order.order_number ? `#TOG-${order.order_number}` : `#${order.id.split('-')[0].toUpperCase()}`}</div>
        
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "8px", marginBottom: "12px", color: "var(--text-main)" }}>Items</h3>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span>{item.quantity}x {item.name}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "2px dashed #eee", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)" }}>
          <span>Total Paid</span>
          <span style={{ color: "var(--primary)" }}>₹{order.total_amount}</span>
        </div>
        
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "24px", fontSize: "0.9rem", lineHeight: "1.5" }}>
          Please show this receipt at the collection counter.<br />
          Contact: {order.customer_phone}
        </p>
      </div>

      <button className="btn-secondary" onClick={() => window.print()} style={{ marginTop: "24px" }}>Download Receipt (PDF)</button>
      <Link href="/"><button className="btn-primary" style={{ marginTop: "8px" }}>Back to Menu</button></Link>
    </div>
  );
}
