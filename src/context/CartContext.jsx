"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("qr-stall-cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("qr-stall-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    // Play subtle "pop" sound
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime); // A5 note
        oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
      }
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }

    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === id);
      if (exists && exists.quantity === 1) return prev.filter((i) => i.id !== id);
      return prev.map((i) => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("qr-stall-cart");
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, getCartTotal, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
