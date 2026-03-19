"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import Script from "next/script";

export default function ReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef();

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

  const downloadPDF = async () => {
    if (!receiptRef.current || !window.jspdf || !window.html2canvas) {
      console.warn("PDF libraries not loaded yet");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Receipt_TOG_${order.order_number || order.id.slice(0,8)}.pdf`);
  };

  useEffect(() => {
    if (order) {
      setTimeout(() => {
        downloadPDF();
      }, 2000); // Give CDN scripts more time to load and stabilize
    }
  }, [order]);

  if (loading) return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Receipt...</div>;
  if (!order) return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h3>Order not found</h3><Link href="/">Return to Menu</Link></div>;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" 
        strategy="afterInteractive" 
      />
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" 
        strategy="afterInteractive" 
      />
      
      <div ref={receiptRef} style={{ background: "white", width: "100%", maxWidth: "400px", padding: "32px", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
        <h1 style={{ color: "var(--success)", textAlign: "center", marginBottom: "8px" }}>Order Confirmed!</h1>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--primary)", background: "rgba(230, 57, 70, 0.05)", display: "inline-block", padding: "8px 16px", borderRadius: "12px" }}>
            {order.order_number ? `Order #TOG-${order.order_number}` : `Order #${order.id.slice(0, 18).toUpperCase()}`}
          </div>
        </div>
        
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

      <button className="btn-secondary" onClick={downloadPDF} style={{ marginTop: "24px" }}>Download Receipt (PDF)</button>
      <Link href="/"><button className="btn-primary" style={{ marginTop: "8px" }}>Back to Menu</button></Link>
    </div>
  );
}


