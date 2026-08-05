import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Return from '@/models/Return';

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
  const returns = await Return.find({}).sort({ date: -1 }).lean();
  return NextResponse.json({ returns });
}

export async function POST(request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const body = await request.json();
  const returnEntry = await Return.create(body);
  return NextResponse.json({ return: returnEntry }, { status: 201 });
}
