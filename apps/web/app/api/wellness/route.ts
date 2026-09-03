import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { getAuthContext } from "@/lib/authz";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authContext = await getAuthContext();

    if (!authContext?.userId) {
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
          userId: authContext.userId,
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
        userId: authContext.userId,
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

export async function GET(): Promise<NextResponse> {
  try {
    const authContext = await getAuthContext();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get last 30 days of entries
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entries = await prisma.wellnessEntry.findMany({
      where: {
        userId: authContext.userId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { date: "asc" },
    });

    // Calculate statistics
    const energyEntries = entries.filter((e: typeof entries[0]) => e.energy !== null);
    const digestionEntries = entries.filter((e: typeof entries[0]) => e.digestion !== null);
    const moodEntries = entries.filter((e: typeof entries[0]) => e.mood !== null);
    const sleepEntries = entries.filter((e: typeof entries[0]) => e.sleep !== null);

    const stats = {
      totalEntries: entries.length,
      avgEnergy: energyEntries.length
        ? Math.round(energyEntries.reduce((sum: number, e: typeof entries[0]) => sum + (e.energy || 0), 0) / energyEntries.length)
        : 0,
      avgDigestion: digestionEntries.length
        ? Math.round(digestionEntries.reduce((sum: number, e: typeof entries[0]) => sum + (e.digestion || 0), 0) / digestionEntries.length)
        : 0,
      avgMood: moodEntries.length
        ? Math.round(moodEntries.reduce((sum: number, e: typeof entries[0]) => sum + (e.mood || 0), 0) / moodEntries.length)
        : 0,
      avgSleep: sleepEntries.length
        ? Math.round(sleepEntries.reduce((sum: number, e: typeof entries[0]) => sum + (e.sleep || 0), 0) / sleepEntries.length)
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
