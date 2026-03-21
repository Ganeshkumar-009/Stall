import { CartProvider } from "@/context/CartContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata = {
  title: "Tastes of Godavari - QR Food Stall",
  description: "Order fresh food directly to your table seamlessly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
