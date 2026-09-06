import { NextRequest, NextResponse } from 'next/server';
import { createPaymentSession } from '@/lib/stripe';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, date, duration } = await req.json();

    const consultation = await prisma.consultation.create({
      data: {
        name,
        email,
        phone,
        date: new Date(date),
        duration,
        status: 'pending',
      },
    });

    const paymentUrl = await createPaymentSession(consultation);

    return NextResponse.json({ paymentUrl, consultationId: consultation.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const consultations = await prisma.consultation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(consultations);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
