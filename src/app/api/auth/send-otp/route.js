import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { otpCache } from "@/lib/otpCache";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email address required" }, { status: 400 });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const { error: dbError } = await supabase
      .from("otp_sessions")
      .upsert({ email, otp, created_at: new Date() }, { onConflict: 'email' });
      
    if (dbError) {
      console.warn("Supabase Warning (Saving to local memory instead):", dbError.message);
      // Fallback to local memory cache so development server does not crash without a database
      otpCache.set(email, otp);
    }

    // Send via Gmail
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

    if (!GMAIL_USER || !GMAIL_PASS) {
       return NextResponse.json({ error: "Netlify Error: Missing GMAIL_USER Env Config! Please add them and trigger a brand new deploy." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Tastes of Godavari" <${GMAIL_USER}>`,
      to: email,
      subject: "Your Tastes of Godavari Login Code",
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: #E63946;">Tastes of Godavari Authentication</h2>
          <p>Your one-time password is:</p>
          <h1 style="letter-spacing: 5px; color: #1D3557; background: #FAF9F6; display: inline-block; padding: 10px 20px; border-radius: 8px;">${otp}</h1>
          <p style="color: #6C757D; font-size: 12px; margin-top: 20px;">Please do not share this code with anyone.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("OTP Send Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
