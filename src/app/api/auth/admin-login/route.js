import { NextResponse } from "next/server";

export async function POST(req) {
  const { email, password } = await req.json();

  // Multi-account admin support
  const isAdmin = (email === "shannugannu6@gmail.com" && password === "Godavari@009") || 
                  (email === "Godavari2026" && password === "vig@avi@gow");

  if (isAdmin) {
    const response = NextResponse.json({ success: true });
    
    // Generate secure admin session
    response.cookies.set({
      name: "auth_session",
      value: JSON.stringify({ email, role: "admin" }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 Week
      path: "/",
    });

    return response;
  }

  // Incorrect password
  return NextResponse.json({ error: "Incorrect Password for Admin account!" }, { status: 401 });
}
