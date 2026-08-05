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

export async function DELETE(request, { params }) {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const { id } = params;
  await Return.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

export async function PUT(request, { params }) {
  const authError = await checkAdmin();
  if (authError) return authError;

  await dbConnect();
  const { id } = params;
  const body = await request.json();
  const updated = await Return.findByIdAndUpdate(id, body, { new: true });
  return NextResponse.json({ return: updated });
}
