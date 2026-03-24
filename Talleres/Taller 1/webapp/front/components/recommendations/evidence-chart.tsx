"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MovieNeighbor } from "@/types/domain";

export function EvidenceChart({ neighbors }: { neighbors: MovieNeighbor[] }) {
  const chartData = neighbors.slice(0, 6).map((neighbor) => ({
    name: neighbor.title.length > 18 ? `${neighbor.title.slice(0, 18)}...` : neighbor.title,
    similarity: Number(neighbor.similarity.toFixed(3)),
    contribution: Number((neighbor.contribution ?? 0).toFixed(3)),
  }));

  if (!chartData.length) return null;

  const hasContribution = chartData.some((row) => row.contribution !== 0);
  const dataKey = hasContribution ? "contribution" : "similarity";

  return (
    <div className="h-64 w-full rounded-xl border border-border/60 bg-slate-950/40 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={55}
          />
          <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#020617",
              border: "1px solid rgba(100,116,139,0.4)",
              borderRadius: "8px",
            }}
          />
          <Bar
            dataKey={dataKey}
            fill="url(#cinematicBar)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <defs>
            <linearGradient id="cinematicBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.85} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
