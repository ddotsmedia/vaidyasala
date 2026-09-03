"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const wellnessSchema = z.object({
  date: z.string().date(),
  energy: z.number().min(1).max(10).nullable().optional(),
  digestion: z.number().min(1).max(10).nullable().optional(),
  mood: z.number().min(1).max(10).nullable().optional(),
  sleep: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).optional(),
});

type WellnessInput = z.infer<typeof wellnessSchema>;

export function WellnessTracker() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WellnessInput>({
    resolver: zodResolver(wellnessSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
    },
  });

  const [energy, digestion, mood, sleep] = watch(["energy", "digestion", "mood", "sleep"]);

  const onSubmit = async (data: WellnessInput) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save entry");
      }

      setSubmitStatus("success");
      reset();
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSlider = (
    label: string,
    name: "energy" | "digestion" | "mood" | "sleep",
    value: number | undefined
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">
        {label} {value !== undefined && <span className="text-vaid-red">({value}/10)</span>}
      </label>
      <input
        type="range"
        min="1"
        max="10"
        {...register(name, { valueAsNumber: true })}
        className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-vaid-red"
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Daily Wellness Entry</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-900">Date</label>
            <input
              type="date"
              {...register("date")}
              className="border-border mt-2 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vaid-red"
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            {renderSlider("Energy Level", "energy", energy)}
            {renderSlider("Digestion Quality", "digestion", digestion)}
            {renderSlider("Mood", "mood", mood)}
            {renderSlider("Sleep Quality", "sleep", sleep)}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900">Notes (optional)</label>
            <textarea
              {...register("notes")}
              placeholder="Any observations about your wellness..."
              rows={4}
              className="border-border mt-2 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vaid-red"
            />
            {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-vaid-red hover:bg-vaid-red/90 disabled:opacity-50 flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all"
            >
              {isSubmitting ? "Saving..." : "Save Entry"}
            </button>
          </div>

          {submitStatus === "success" && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              ✓ Wellness entry saved successfully!
            </p>
          )}

          {submitStatus === "error" && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
          )}
        </form>
      </div>
    </div>
  );
}
