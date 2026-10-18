import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req) {
  try {
    const session = await auth();
    
    if (!session || session.user.email !== "kakobuybs209@gmail.com") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;
    
    if (!REMOVE_BG_API_KEY) {
      return NextResponse.json({ 
        error: "Remove.bg API key not configured. Add REMOVE_BG_API_KEY to .env.local" 
      }, { status: 500 });
    }

    // Call Remove.bg API
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto');

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData
    });

    if (!removeBgResponse.ok) {
      const error = await removeBgResponse.text();
      console.error('Remove.bg error:', error);
      return NextResponse.json({ 
        error: `Remove.bg API error: ${removeBgResponse.status}` 
      }, { status: 500 });
    }

    // Get image without background
    const imageBuffer = await removeBgResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Upload to Supabase Storage
    const fileName = `nobg_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('product-images')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName 
    });

  } catch (error) {
    console.error("Remove background error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to remove background" 
    }, { status: 500 });
  }
}
