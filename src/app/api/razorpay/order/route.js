import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    // Check if payments are enabled in settings
    const { data: settings } = await supabase.from('settings').select('*').eq('key', 'is_payment_enabled').single();
    if (settings && settings.value === false) {
      return NextResponse.json(
        { success: false, error: "Payments are currently disabled. Opening soon!" },
        { status: 403 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const body = await req.json();
    const { amount, currency = "INR" } = body;

    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: `rcptid_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
