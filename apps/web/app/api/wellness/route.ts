import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { date, energy, digestion, mood, sleep, notes } = body as {
      date: string;
      energy?: number;
      digestion?: number;
      mood?: number;
      sleep?: number;
      notes?: string;
    };

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Save or update wellness entry
    const entry = await prisma.wellnessEntry.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(date),
        },
      },
      update: {
        energy: energy || undefined,
        digestion: digestion || undefined,
        mood: mood || undefined,
        sleep: sleep || undefined,
        notes: notes || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        date: new Date(date),
        energy,
        digestion,
        mood,
        sleep,
        notes,
      },
    });

    return NextResponse.json({ success: true, entry }, { status: 200 });
  } catch (error) {
    console.error("Wellness entry error:", error);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get last 30 days of entries
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entries = await prisma.wellnessEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { date: "asc" },
    });

    // Calculate statistics
    const stats = {
      totalEntries: entries.length,
      avgEnergy: entries.filter((e) => e.energy).length
        ? Math.round(entries.filter((e) => e.energy).reduce((sum, e) => sum + (e.energy || 0), 0) / entries.filter((e) => e.energy).length)
        : 0,
      avgDigestion: entries.filter((e) => e.digestion).length
        ? Math.round(entries.filter((e) => e.digestion).reduce((sum, e) => sum + (e.digestion || 0), 0) / entries.filter((e) => e.digestion).length)
        : 0,
      avgMood: entries.filter((e) => e.mood).length
        ? Math.round(entries.filter((e) => e.mood).reduce((sum, e) => sum + (e.mood || 0), 0) / entries.filter((e) => e.mood).length)
        : 0,
      avgSleep: entries.filter((e) => e.sleep).length
        ? Math.round(entries.filter((e) => e.sleep).reduce((sum, e) => sum + (e.sleep || 0), 0) / entries.filter((e) => e.sleep).length)
        : 0,
    };

    return NextResponse.json(
      {
        entries: entries.map((e) => ({
          ...e,
          date: e.date.toISOString().split("T")[0],
        })),
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch wellness error:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}
