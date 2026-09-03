import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/authz";
import { WellnessTracker } from "@/components/WellnessTracker";
import { WellnessChart } from "@/components/WellnessChart";
import { DoshaRecommendations } from "@/components/DoshaRecommendations";
import { prisma } from "@vaidyasala/db";

export const metadata: Metadata = {
  title: "Wellness Tracker - Monitor Your Health Journey",
  description:
    "Track your daily wellness metrics including energy, digestion, mood, and sleep quality to understand your Ayurvedic constitution better.",
};

export default async function WellnessPage() {
  const authContext = await getAuthContext();

  // Require authentication
  if (!authContext?.userId) {
    redirect("/login");
  }

  // Fetch user's dosha assessment
  const doshaAssessment = await prisma.doshaAssessment.findUnique({
    where: { userId: authContext.userId },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900">Wellness Tracker</h1>
            <p className="text-text-dim mt-2 text-lg">
              Monitor your daily wellness and discover patterns based on your unique constitution
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Tracker Form */}
            <div className="lg:col-span-1">
              <WellnessTracker />
            </div>

            {/* Charts and Stats */}
            <div className="lg:col-span-2">
              <WellnessChart />
            </div>
          </div>

          {/* Dosha Recommendations */}
          {doshaAssessment?.dominantDosha && (
            <div className="mt-12">
              <h2 className="mb-8 text-3xl font-bold text-gray-900">
                {doshaAssessment.dominantDosha.charAt(0).toUpperCase() + doshaAssessment.dominantDosha.slice(1)} Constitution Guide
              </h2>
              <DoshaRecommendations dosha={doshaAssessment.dominantDosha} />
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-12 rounded-lg border border-gray-200 bg-blue-50 p-6">
            <h2 className="text-xl font-semibold text-gray-900">💡 Wellness Tips</h2>
            <ul className="mt-4 space-y-2 text-gray-700">
              <li>• Track consistently for at least 2 weeks to identify patterns</li>
              <li>• Your entries help personalize video recommendations based on your constitution</li>
              <li>• Pay attention to how foods, activities, and seasons affect your metrics</li>
              <li>• Use the notes section to record what changed on days with different patterns</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
