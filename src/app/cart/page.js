"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

export default function CheckoutCart() {
  const { cart, getCartTotal, clearCart, removeFromCart } = useCart();
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const router = useRouter();

  const total = getCartTotal();

  useState(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('key', 'is_payment_enabled').single();
      if (data) {
        setIsPaymentEnabled(data.value);
      }
      setIsLoadingSettings(false);
    };
    fetchSettings();
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    if (!phone || phone.length < 10) return alert("Please enter a valid 10-digit mobile number.");
    setIsProcessing(true);

    const res = await loadRazorpay();
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      setIsProcessing(false);
      return;
    }

    const orderPayload = {
      customer_phone: phone,
      items: cart,
      total_amount: total,
      payment_method: "pending_razorpay",
      payment_status: "processing",
      order_status: "new",
    };

    try {
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const orderData = await orderRes.json();
      
      if (!orderData.success) {
        alert("Could not initiate payment. " + orderData.error);
        setIsProcessing(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Tastes of Godavari",
        description: "Food Stall Order",
        order_id: orderData.order.id,
        handler: async function (response) {
          setIsProcessing(true); // Keep processing state active during verification
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderPayload,
              }),
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              clearCart();
              // Prioritize the returned ID, then fallback to Razorpay ID
              const finalOrderId = verifyData.orderData?.id || response.razorpay_order_id;
              
              if (verifyData.message.includes("database write failed")) {
                localStorage.setItem("stall_customer_phone", phone);
                localStorage.setItem(
                  "stall_orders",
                  JSON.stringify([{ ...verifyData.orderData, id: finalOrderId }, ...localOrders])
                );
              }

              // Instant notification to user so they don't think it's stuck
              router.push(`/receipt/${finalOrderId}`);
            } else {
              alert("Payment verification failed: " + verifyData.message);
              setIsProcessing(false);
            }
          } catch (err) {
            console.error(err);
            alert("Error verifying payment. Please contact the counter with your Payment ID: " + response.razorpay_payment_id);
            setIsProcessing(false);
          }
        },
        prefill: {
          contact: phone,
        },
        theme: {
          color: "#E23E3E", // Match UI style
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            alert("Payment was cancelled.");
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      alert("Error setting up payment");
      setIsProcessing(false);
    }
  };

  const handleCash = () => {
    if (!phone || phone.length < 10) return alert("Please enter a valid 10-digit mobile number.");
    finalizeOrder("cash");
  };

  const finalizeOrder = async (paymentMethod) => {
    setIsProcessing(true);
    
    const payload = {
      customer_phone: phone,
      items: cart,
      total_amount: total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cash" ? "pending" : "processing",
      order_status: "new",
      created_at: new Date().toISOString(),
    };

    const { data: orderData, error } = await supabase.from("orders").insert([payload]).select().single();

    if (error) {
      console.warn("Database disconnected, writing to stall_orders cache...");
      const realOrderId = "TOG-OFFLINE-" + Math.floor(100000 + Math.random() * 900000); 
      
      const localOrders = JSON.parse(localStorage.getItem("stall_orders") || "[]");
      localStorage.setItem("stall_orders", JSON.stringify([{ id: realOrderId, ...payload }, ...localOrders]));
      
      clearCart();
      router.push(`/receipt/${realOrderId}`);
      return;
    }

    localStorage.setItem("stall_customer_phone", phone);
    clearCart();
    router.push(`/receipt/${orderData.id}`);
  };

  if (cart.length === 0) {
    return (
      <div className="app-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontStyle: 'italic', color: 'var(--primary)', marginBottom: '16px' }}>Your cart is empty 🛒</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Waiting for your order</p>
        <Link href="/"><button className="btn-primary" style={{ width: "auto", padding: "12px 30px" }}>Discover Flavors</button></Link>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <img src="/logo.jpg" alt="Tastes of Godavari Logo" style={{ width: '100px', height: 'auto' }} />
        <Link href="/" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "700", border: '1px solid var(--accent-gold)', padding: '4px 12px', borderRadius: '20px' }}>Back</Link>
      </header>

      <div style={{ padding: "20px", display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: "24px", marginBottom: "0", display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cart.map((item, idx) => (
            <div key={idx} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: '16px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <span className="cart-item-title">{item.name}</span>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>Qty: {item.quantity}</div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  style={{ background: "#ff4d4d", color: "white", border: "none", borderRadius: "50%", width: "26px", height: "26px", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "2px" }}
                >
                  -
                </button>
                <span className="cart-item-price" style={{ minWidth: "50px", textAlign: "right" }}>₹{item.price * item.quantity}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", paddingTop: "20px", borderTop: "2px dashed var(--accent-gold)", fontSize: "1.4rem", fontWeight: "800" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>Grand Total:</span>
            <span style={{ color: "var(--primary)" }}>₹{getCartTotal()}</span>
          </div>
        </div>

        <h3 style={{ marginBottom: "12px", color: "var(--text-main)", fontFamily: "'Playfair Display', serif" }}>Customer's Contact Number</h3>
        <input type="tel" placeholder="Enter 10-digit Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" disabled={isProcessing || !isPaymentEnabled} />
        
        {isLoadingSettings ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontWeight: '600' }}>Checking kitchen status...</div>
        ) : isPaymentEnabled ? (
          <button className="btn-primary" onClick={handleRazorpayPayment} disabled={isProcessing} style={{ padding: '20px', fontSize: '1.2rem' }}>
            {isProcessing ? "Finalizing..." : "Pay Securely with Razorpay"}
          </button>
        ) : (
          <div className="glass-panel" style={{ 
            padding: '32px 24px', 
            border: '2px dashed var(--primary)',
            textAlign: 'center'
          }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '8px', fontSize: '1.5rem', fontFamily: "'Playfair Display', serif" }}>🚀 Launching in 5 Days!</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: '700' }}>
              The Chef is perfecting the recipes. Opening soon!
            </p>
            <Link href="/">
              <button className="btn-primary" style={{ marginTop: '20px', width: 'auto', padding: '12px 30px', background: 'var(--primary)' }}>Browse Menu</button>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
