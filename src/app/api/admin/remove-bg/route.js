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

    const PHOTOROOM_API_KEY = process.env.PHOTOROOM_API_KEY;
    
    if (!PHOTOROOM_API_KEY) {
      return NextResponse.json({ 
        error: "PhotoRoom API key not configured. Add PHOTOROOM_API_KEY to .env.local" 
      }, { status: 500 });
    }

    console.log('Fetching image from URL:', imageUrl);

    // Download the image first (PhotoRoom might not support direct URLs)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch image: ${imageResponse.status}` 
      }, { status: 500 });
    }

    const imageBlob = await imageResponse.blob();
    console.log('Image downloaded, size:', imageBlob.size);

    // Call PhotoRoom API with image file
    const formData = new FormData();
    formData.append('image_file', imageBlob, 'image.jpg');

    console.log('Calling PhotoRoom API...');

    const photoRoomResponse = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
      },
      body: formData
    });

    console.log('PhotoRoom response status:', photoRoomResponse.status);

    if (!photoRoomResponse.ok) {
      const errorText = await photoRoomResponse.text();
      console.error('PhotoRoom error response:', errorText);
      return NextResponse.json({ 
        error: `PhotoRoom API error: ${photoRoomResponse.status} - ${errorText}` 
      }, { status: 500 });
    }

    // Get image without background
    const imageBuffer = await photoRoomResponse.arrayBuffer();
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
