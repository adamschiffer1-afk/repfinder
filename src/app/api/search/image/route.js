import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

// Zabezpieczenie przed wielokrotnym ładowaniem modelu w trybie dev
let extractor = null;

async function getExtractor() {
  if (!extractor) {
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowLocalModels = false;
    extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  return extractor;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile) {
      return NextResponse.json({ error: 'Brak pliku zdjęcia' }, { status: 400 });
    }

    // Konwersja pliku na format Base64 Data URL, który transformer potrafi odczytać w Node.js
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const mimeType = imageFile.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    console.log("[ImageSearch] Ładowanie modelu...");
    const ext = await getExtractor();
    
    console.log("[ImageSearch] Wektoryzacja zdjęcia...");
    const output = await ext(dataUrl);
    const vector = Array.from(output.data);

    await dbConnect();
    console.log("[ImageSearch] Szukanie w MongoDB (Vector Search)...");

    // UWAGA: To zapytanie wymaga indeksu wektorowego w MongoDB Atlas o nazwie 'vector_index'
    const products = await Product.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "imageVector",
          queryVector: vector,
          numCandidates: 100,
          limit: 20
        }
      },
      {
        $project: {
          imageVector: 0, // nie wysyłamy ciężkiego wektora do klienta
          score: { $meta: "vectorSearchScore" } // możemy zwrócić stopień podobieństwa
        }
      }
    ]);

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("[ImageSearch] Błąd wyszukiwania po zdjęciu:", error);
    return NextResponse.json({ 
      error: 'Wystąpił błąd podczas wyszukiwania. Upewnij się, że masz utworzony indeks vector_index w MongoDB Atlas.',
      details: error.message 
    }, { status: 500 });
  }
}
