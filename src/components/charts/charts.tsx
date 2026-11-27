"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type DayPoint = { label: string; Completed: number; Remaining: number };
export function ActivityChart({ data }: { data: DayPoint[] }) {
  if (!data.some((d) => d.Completed + d.Remaining)) return <p className="py-10 text-center text-sm text-muted">No activities scheduled in this period.</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -24, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#e3e8ef" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} minTickGap={4} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip cursor={{ fill: "#f1f4f8" }} contentStyle={{ borderRadius: 10, border: "1px solid #dfe5ec", boxShadow: "0 8px 24px -15px rgba(23,35,52,.32)", fontSize: 13 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Completed" stackId="a" fill="#078a78" maxBarSize={34} />
          <Bar dataKey="Remaining" stackId="a" fill="#dce4ff" radius={[6, 6, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
