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

    const SENTISIGHT_API_KEY = process.env.SENTISIGHT_API_KEY;
    
    if (!SENTISIGHT_API_KEY) {
      return NextResponse.json({ 
        error: "SentiSight API key not configured. Add SENTISIGHT_API_KEY to .env.local" 
      }, { status: 500 });
    }

    console.log('Fetching image from URL:', imageUrl);

    // Download the image first
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch image: ${imageResponse.status}` 
      }, { status: 500 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('Image downloaded, size:', imageBuffer.byteLength);

    // Call SentiSight API
    console.log('Calling SentiSight API...');

    const sentisightResponse = await fetch('https://platform.sentisight.ai/api/pm-predict/Background-removal/', {
      method: 'POST',
      headers: {
        'X-Auth-token': SENTISIGHT_API_KEY,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    });

    console.log('SentiSight response status:', sentisightResponse.status);

    if (!sentisightResponse.ok) {
      const errorText = await sentisightResponse.text();
      console.error('SentiSight error response:', errorText);
      return NextResponse.json({ 
        error: `SentiSight API error: ${sentisightResponse.status} - ${errorText}` 
      }, { status: 500 });
    }

    // Parse JSON response containing base64 encoded PNG
    const responseData = await sentisightResponse.json();
    
    // SentiSight returns base64 encoded image in the response
    // Extract base64 data (format: "data:image/png;base64,...")
    let base64Data = responseData.result || responseData.image || responseData;
    
    if (typeof base64Data === 'string' && base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }
    
    const buffer = Buffer.from(base64Data, 'base64');

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
      nobgUrl: publicUrl,
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
