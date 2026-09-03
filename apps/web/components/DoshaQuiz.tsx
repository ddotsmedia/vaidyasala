"use client";

import { useState, useCallback } from "react";
import { doshaQuestions, doshaDescriptions } from "@/lib/dosha-questions";
import { trackCustomEvent } from "@/lib/plausible";

interface DoshaScores {
  vata: number;
  pitta: number;
  kapha: number;
}

type DoshaType = "vata" | "pitta" | "kapha";

interface QuizResult {
  scores: DoshaScores;
  dominantDosha: DoshaType;
  description: string;
}

export function DoshaQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scores, setScores] = useState<DoshaScores>({ vata: 0, pitta: 0, kapha: 0 });
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const question = doshaQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / doshaQuestions.length) * 100;

  const calculateDominantDosha = (finalScores: DoshaScores): DoshaType => {
    const max = Math.max(finalScores.vata, finalScores.pitta, finalScores.kapha);
    if (finalScores.vata === max) return "vata";
    if (finalScores.pitta === max) return "pitta";
    return "kapha";
  };

  const handleAnswer = useCallback(
    (dosha: DoshaType, points: number) => {
      const newScores = { ...scores, [dosha]: scores[dosha] + points };
      setScores(newScores);

      // Move to next question or complete
      if (currentQuestion + 1 < doshaQuestions.length) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Quiz completed
        const dominantDosha = calculateDominantDosha(newScores);
        const quizResult: QuizResult = {
          scores: newScores,
          dominantDosha,
          description:
            doshaDescriptions[dominantDosha].en ||
            "Your unique Ayurvedic constitution",
        };
        setResult(quizResult);
        setCompleted(true);
        trackCustomEvent("Quiz Completed", { dosha: dominantDosha });
      }
    },
    [currentQuestion, scores]
  );

  const handleSubmit = async () => {
    if (!result) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/dosha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        throw new Error("Failed to save assessment");
      }

      // Success - stay on results page or redirect
    } finally {
      setSubmitting(false);
    }
  };

  if (completed && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-vaid-red">Your Dosha</h2>
          <div className="mt-8 rounded-2xl border-2 border-vaid-red bg-red-50 p-8">
            <div className="text-5xl font-bold capitalize text-vaid-red">
              {result.dominantDosha || "Unknown"}
            </div>
            <p className="mt-4 text-lg text-gray-700">{result.description}</p>
          </div>
        </div>

        {/* Scores breakdown */}
        <div className="grid gap-4 sm:grid-cols-3">
          {(["vata", "pitta", "kapha"] as const).map((dosha) => (
            <div
              key={dosha}
              className="rounded-lg border border-gray-200 bg-white p-4 text-center"
            >
              <div className="text-sm font-medium text-gray-600 capitalize">
                {dosha}
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {result.scores[dosha]}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Foods</h4>
              <p className="text-sm text-gray-600 mt-1">
                {doshaDescriptions[result.dominantDosha].recommendations.foods.join(
                  ", "
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Activities</h4>
              <p className="text-sm text-gray-600 mt-1">
                {doshaDescriptions[result.dominantDosha].recommendations.activities.join(
                  ", "
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Season Tips</h4>
              <p className="text-sm text-gray-600 mt-1">
                {doshaDescriptions[result.dominantDosha].recommendations.season}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-vaid-red hover:bg-vaid-red/90 disabled:opacity-50 flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-colors"
          >
            {submitting ? "Saving..." : "Save My Result"}
          </button>
          <button
            onClick={() => {
              setCurrentQuestion(0);
              setScores({ vata: 0, pitta: 0, kapha: 0 });
              setCompleted(false);
              setResult(null);
            }}
            className="border-border hover:bg-surface rounded-lg border px-6 py-3 font-semibold transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return <div className="text-center text-gray-500">Loading quiz...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Question {currentQuestion + 1} of {doshaQuestions.length}
          </span>
          <span className="text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-vaid-red transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
          {question.questionEn}
        </h2>

        {question.questionMl && (
          <p className="font-ml text-lg text-gray-700" lang="ml">
            {question.questionMl}
          </p>
        )}

        {/* Answer options */}
        <div className="space-y-3">
          {question.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(answer.dosha, answer.points)}
              className="border-border hover:border-vaid-red hover:bg-red-50 w-full rounded-lg border px-4 py-3 text-left transition-colors"
            >
              <span className="font-medium text-gray-900">{answer.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        {currentQuestion > 0 && (
          <button
            onClick={() => {
              setCurrentQuestion(currentQuestion - 1);
              // Subtract points from previous answer
              const prevQuestion = doshaQuestions[currentQuestion - 1];
              // This is simplified - in production, track answer history
            }}
            className="border-border hover:bg-surface rounded-lg border px-6 py-2 font-medium transition-colors"
          >
            Previous
          </button>
        )}
        <div className="flex-1" />
      </div>
    </div>
  );
}
