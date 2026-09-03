import type { Metadata } from "next";
import { DoshaQuiz } from "@/components/DoshaQuiz";

export const metadata: Metadata = {
  title: "Dosha Assessment Quiz - Discover Your Ayurvedic Constitution",
  description:
    "Take our personalized Dosha quiz to discover your unique Ayurvedic constitution (vata, pitta, or kapha) and get tailored wellness recommendations.",
};

export default function QuizPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900">Dosha Assessment</h1>
            <p className="text-text-dim mt-2 text-lg">
              Discover your unique Ayurvedic constitution and receive personalized recommendations
            </p>
          </div>

          <DoshaQuiz
            onComplete={async (result) => {
              const response = await fetch("/api/dosha", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result),
              });

              if (!response.ok) {
                throw new Error("Failed to save assessment");
              }
            }}
          />
        </div>
      </main>
    </div>
  );
}
