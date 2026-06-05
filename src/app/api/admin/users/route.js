import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const ADMIN_EMAIL = "kakobuybs209@gmail.com";

export async function GET(request) {
  try {
    // Verify admin access
    const session = await auth();
    if (!session || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch all users sorted by creation date (newest first)
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select('discordId googleId email name image isAdmin provider lastLogin createdAt updatedAt')
      .lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
