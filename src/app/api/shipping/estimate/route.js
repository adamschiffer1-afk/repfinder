import crypto from 'crypto';
import zlib from 'zlib';
import axios from 'axios';
import { NextResponse } from 'next/server';

// Official Kakobuy RSA Public Key
const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCx2UKNVOg0dYx1R3p7GNAXcrRQ7QkiE43UFbHxLPJ8gpWFxhSb6ZoCGO/8AkAFEgroJ7NKUhRyq71vCjDFJh8n7zjA6rgIxKOPNwndHlXBLBj60avRb14BrunQ5EijwGpUF9jUeLrLO3GNd39T4l1RC0jjTBa0hpKpGNGfQAd7rwIDAQAB
-----END PUBLIC KEY-----`;

function generateKeyAndIv() {
  const key = crypto.randomBytes(16).toString('hex'); // 32 chars
  const iv = crypto.randomBytes(8).toString('hex');   // 16 chars
  return { key, iv };
}

function rsaEncrypt(text) {
  return crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(text, 'utf8')
  ).toString('base64');
}

function aesEncryptAndDeflate(data, key, iv) {
  const jsonStr = JSON.stringify(data);
  const compressed = zlib.deflateRawSync(Buffer.from(jsonStr, 'utf8'), { level: 1 });
  
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  let encrypted = cipher.update(compressed);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    data: encrypted.toString('base64'),
    key: rsaEncrypt(key),
    iv: rsaEncrypt(iv)
  };
}

function aesDecryptAndInflate(encryptedBase64, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  let decrypted = decipher.update(Buffer.from(encryptedBase64, 'base64'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(zlib.inflateRawSync(decrypted).toString('utf8'));
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      weight = 1000, 
      areaId = 2765, // Default: Poland (PL)
      length = 0, 
      width = 0, 
      height = 0, 
      goodsType = [],
      warehouseId = "" 
    } = body;

    const { key, iv } = generateKeyAndIv();

    // Reconstruct the exact full payload Kakobuy expects
    const fullPayload = {
      versionCode: "238",
      from: "1201",
      fp: "",
      referer: "",
      uuid: "",
      cur: "USD",
      token: "",
      areaId,
      weight,
      length,
      width,
      height,
      goodsType,
      warehouseId
    };

    const encrypted = aesEncryptAndDeflate(fullPayload, key, iv);

    const requestBody = {
      data: encrypted.data,
      key: encrypted.key,
      iv: encrypted.iv,
      req_code: 4
    };

    const res = await axios.post('https://hbapi.kakobuy.com/api/shipping/estimate', requestBody, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'lang': 'en'
      },
      timeout: 10000 // 10s timeout
    });

    const responseData = res.data;

    if (responseData.code === 202) {
      // Successfully encrypted payload returned, decrypt it
      const decryptedData = aesDecryptAndInflate(responseData.data, key, iv);
      return NextResponse.json({
        success: true,
        code: 200,
        data: decryptedData
      });
    } else if (responseData.code === 200) {
      // Non-encrypted success payload
      return NextResponse.json({
        success: true,
        code: 200,
        data: responseData.data
      });
    } else {
      // Error code returned by Kakobuy
      return NextResponse.json({
        success: false,
        code: responseData.code,
        msg: responseData.msg || "Error from Kakobuy API"
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Kakobuy Estimate API Error:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to fetch shipping estimates" 
    }, { status: 500 });
  }
}
