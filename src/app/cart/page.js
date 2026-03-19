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
  const router = useRouter();

  const total = getCartTotal();

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
              const finalOrderId = verifyData.orderData?.id || response.razorpay_order_id;
              
              if (verifyData.message.includes("database write failed")) {
                const localOrders = JSON.parse(localStorage.getItem("stall_orders") || "[]");
                localStorage.setItem(
                  "stall_orders",
                  JSON.stringify([{ id: finalOrderId, ...verifyData.orderData }, ...localOrders])
                );
              }

              router.push(`/receipt/${finalOrderId}`);
            } else {
              alert("Payment verification failed: " + verifyData.message);
              setIsProcessing(false);
            }
          } catch (err) {
            console.error(err);
            alert("Error verifying payment.");
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
      const realOrderId = "ORD-" + Math.floor(100000 + Math.random() * 900000); 
      
      const localOrders = JSON.parse(localStorage.getItem("stall_orders") || "[]");
      localStorage.setItem("stall_orders", JSON.stringify([{ id: realOrderId, ...payload }, ...localOrders]));
      
      clearCart();
      router.push(`/receipt/${realOrderId}`);
      return;
    }

    clearCart();
    router.push(`/receipt/${orderData.id}`);
  };

  if (cart.length === 0) {
    return (
      <div className="app-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h2>Your cart is empty 🍽️</h2>
        <Link href="/"><button className="btn-secondary" style={{ width: "auto", padding: "12px 30px" }}>Back to Menu</button></Link>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Your Cart 🛒</h1>
        <Link href="/" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>Back</Link>
      </header>

      <div style={{ padding: "20px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "24px", boxShadow: "var(--shadow-sm)" }}>
          {cart.map((item, idx) => (
            <div key={idx} className="cart-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", paddingTop: "20px", borderTop: "2px dashed #eee", fontSize: "1.4rem", fontWeight: "800" }}>
            <span>Total to Pay:</span>
            <span style={{ color: "var(--primary)" }}>₹{getCartTotal()}</span>
          </div>
        </div>

        <h3 style={{ marginBottom: "12px", color: "var(--text-main)" }}>Contact Details</h3>
        <input type="tel" placeholder="Enter 10-digit Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" disabled={isProcessing} />
        
        <button className="btn-primary" onClick={handleRazorpayPayment} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Pay Securely with Razorpay"}
        </button>
        <button className="btn-secondary" onClick={handleCash} disabled={isProcessing}>
          Pay by Cash at Stall
        </button>
      </div>
    </div>
  );
}
