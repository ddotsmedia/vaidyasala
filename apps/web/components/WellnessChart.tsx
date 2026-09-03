"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WellnessData {
  date: string;
  energy?: number;
  digestion?: number;
  mood?: number;
  sleep?: number;
}

interface Stats {
  totalEntries: number;
  avgEnergy: number;
  avgDigestion: number;
  avgMood: number;
  avgSleep: number;
}

export function WellnessChart() {
  const [data, setData] = useState<WellnessData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/wellness");
        if (!response.ok) {
          throw new Error("Failed to fetch wellness data");
        }
        const result = await response.json();
        setData(result.entries);
        setStats(result.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading wellness data...</div>;
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No wellness entries yet. Start tracking to see trends!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalEntries}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm text-gray-600">Avg Energy</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.avgEnergy}/10</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm text-gray-600">Avg Digestion</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.avgDigestion}/10</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm text-gray-600">Avg Mood</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">{stats.avgMood}/10</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm text-gray-600">Avg Sleep</p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.avgSleep}/10</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">30-Day Wellness Trend</h3>
        <div className="h-96 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9ca3af" domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value) => (typeof value === "number" ? value.toFixed(1) : value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#3b82f6"
                name="Energy"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="digestion"
                stroke="#10b981"
                name="Digestion"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#a855f7"
                name="Mood"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="sleep"
                stroke="#6366f1"
                name="Sleep"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
