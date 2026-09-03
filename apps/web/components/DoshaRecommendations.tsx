"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doshaRecommendations } from "@/lib/recommendations";

interface DoshaRecommendationsProps {
  dosha: string;
}

export function DoshaRecommendations({ dosha }: DoshaRecommendationsProps) {
  const recommendation = doshaRecommendations[dosha];

  if (!recommendation) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Season Tips */}
      <div className="rounded-lg border-l-4 border-vaid-red bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Seasonal Guidance</h3>
        <p className="mt-2 text-gray-700">{recommendation.season}</p>
      </div>

      {/* Foods */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Recommended Foods</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.foods.map((food, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800"
            >
              🌿 {food}
            </span>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Beneficial Activities</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.activities.map((activity, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800"
            >
              ✨ {activity}
            </span>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Daily Tips</h3>
        <ul className="mt-4 space-y-2">
          {recommendation.tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-1 flex-shrink-0 text-vaid-red">✓</span>
              <span className="text-gray-700">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Related Videos CTA */}
      <div className="rounded-lg bg-gradient-to-r from-vaid-red to-red-600 p-6 text-white">
        <h3 className="text-lg font-semibold">Explore {dosha.charAt(0).toUpperCase() + dosha.slice(1)}-Balancing Videos</h3>
        <p className="mt-2 opacity-90">
          Watch videos specifically selected for your constitution
        </p>
        <Link
          href={`/topics?dosha=${dosha}`}
          className="mt-4 inline-flex items-center rounded-lg bg-white px-6 py-2 font-medium text-vaid-red transition-transform hover:scale-105"
        >
          View Videos →
        </Link>
      </div>
    </div>
  );
}
