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

export async function PUT(request, { params }) {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const { id } = await params;
  const body = await request.json();
  const entry = await EarningsEntry.findByIdAndUpdate(id, body, { new: true });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function DELETE(request, { params }) {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const { id } = await params;
  await EarningsEntry.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
