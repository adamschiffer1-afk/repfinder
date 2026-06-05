import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

const ADMIN_EMAIL = "kakobuybs209@gmail.com";
const ADMIN_DISCORD_ID = "1464343590586290287";

export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { email, name, image, provider, discordId, googleId } = session.user;
    const isAdmin = email === ADMIN_EMAIL || discordId === ADMIN_DISCORD_ID;

    const userData = {
      email,
      name: name || '',
      image: image || '',
      isAdmin,
      provider: provider || 'unknown',
      lastLogin: new Date(),
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
