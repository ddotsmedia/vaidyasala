import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { scores, dominantDosha } = body as {
      scores?: { vata: number; pitta: number; kapha: number };
      dominantDosha?: string;
    };

    if (!scores || !dominantDosha) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // BLOCKED: Get session to associate with user
    // For now, allow anonymous submissions
    // In production: get user ID from session
    const session = await getSession();

    // Save or update assessment
    const assessment = await prisma.doshaAssessment.upsert({
      where: { userId: session?.user?.id || undefined },
      update: {
        vata: scores.vata,
        pitta: scores.pitta,
        kapha: scores.kapha,
        dominantDosha,
        updatedAt: new Date(),
      },
      create: {
        userId: session?.user?.id || undefined,
        vata: scores.vata,
        pitta: scores.pitta,
        kapha: scores.kapha,
        dominantDosha,
      },
    });

    // Also save to history for tracking trends
    if (session?.user?.id) {
      const today = new Date().toISOString().split("T")[0];
      const currentSeason = getCurrentSeason();

      await prisma.doshaHistory.upsert({
        where: {
          userId_doshaDate: {
            userId: session.user.id,
            doshaDate: new Date(today),
          },
        },
        update: {
          vata: scores.vata,
          pitta: scores.pitta,
          kapha: scores.kapha,
          dominantDosha,
          season: currentSeason,
        },
        create: {
          userId: session.user.id,
          doshaDate: new Date(today),
          vata: scores.vata,
          pitta: scores.pitta,
          kapha: scores.kapha,
          dominantDosha,
          season: currentSeason,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        assessment,
        message: "Dosha assessment saved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dosha assessment error:", error);
    return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 });
  }
}

/**
 * Determine current season based on month.
 * Northern hemisphere seasons.
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

/**
 * GET /api/dosha - Fetch user's dosha assessment
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const assessment = await prisma.doshaAssessment.findUnique({
      where: { userId: session.user.id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "No assessment found" }, { status: 404 });
    }

    return NextResponse.json(assessment, { status: 200 });
  } catch (error) {
    console.error("Fetch dosha error:", error);
    return NextResponse.json({ error: "Failed to fetch assessment" }, { status: 500 });
  }
}
