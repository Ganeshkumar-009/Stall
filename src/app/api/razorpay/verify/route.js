import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderPayload } = await req.json();

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return NextResponse.json(
        { success: false, message: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Payment Verification Successful. Save order to database.
    orderPayload.payment_status = "paid";
    orderPayload.payment_method = "razorpay";
    orderPayload.transaction_id = razorpay_payment_id;
    orderPayload.razorpay_order_id = razorpay_order_id;
    orderPayload.created_at = new Date().toISOString();

    const { data: orderData, error } = await supabase
      .from("orders")
      .insert([orderPayload])
      .select()
      .single();
 
    if (error) {
      console.error("Supabase error after payment verification:", error);
      // Fallback: Generate a pseudo-order state if DB fails so user still gets a TOG number
      const fallbackData = {
        ...orderPayload,
        id: razorpay_order_id, // Use Razorpay ID as backup
        order_number: "OFFLINE-" + Math.floor(1000 + Math.random() * 9000), // Random backup number
        is_offline_stored: true
      };

      return NextResponse.json({ 
        success: true, 
        message: "Payment verified but database write failed", 
        orderData: fallbackData 
      });
    }

    return NextResponse.json({ success: true, message: "Payment verified successfully", orderData });
  } catch (error) {
    console.error("Error verifying signature:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
