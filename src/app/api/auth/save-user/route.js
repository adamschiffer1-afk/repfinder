import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

const ADMIN_EMAIL = "kakobuybs209@gmail.com";
const ADMIN_DISCORD_ID = "1464343590586290287";

// Function to get geolocation from IP
async function getGeoLocation(ip) {
  try {
    // Use ip-api.com for free geolocation (no API key needed)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,query`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country || '',
        countryCode: data.countryCode || '',
        city: data.city || '',
        ip: data.query || ip,
      };
    }
  } catch (error) {
    console.error('Error fetching geolocation:', error);
  }
  
  return {
    country: '',
    countryCode: '',
    city: '',
    ip: ip || '',
  };
}

export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
    const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for'); // Vercel
    
    const ip = cfConnectingIp || vercelForwardedFor || forwarded?.split(',')[0] || realIp || 'Unknown';
    
    // Get geolocation data
    const geoData = await getGeoLocation(ip);

    const { email, name, image, provider, discordId, googleId } = session.user;
    const isAdmin = email === ADMIN_EMAIL || discordId === ADMIN_DISCORD_ID;

    const userData = {
      email,
      name: name || '',
      image: image || '',
      isAdmin,
      provider: provider || 'unknown',
      lastLogin: new Date(),
      ipAddress: geoData.ip,
      country: geoData.country,
      countryCode: geoData.countryCode,
      city: geoData.city,
    };

    if (discordId) userData.discordId = discordId;
    if (googleId) userData.googleId = googleId;

    // Upsert user
    const user = await User.findOneAndUpdate(
      { email },
      userData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
