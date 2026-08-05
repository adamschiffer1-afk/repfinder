import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import EarningsEntry from '@/models/EarningsEntry';

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user.email !== 'kakobuybs209@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const entries = await EarningsEntry.find({}).sort({ date: -1 }).lean();
  return NextResponse.json({ entries });
}

export async function POST(request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const body = await request.json();
  const entry = await EarningsEntry.create(body);
  return NextResponse.json({ entry }, { status: 201 });
}
