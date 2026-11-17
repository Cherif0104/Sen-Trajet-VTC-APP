"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export function MonthlyBars({
  data,
  series,
  money,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
  money?: boolean;
}) {
  const empty = data.every((d) => series.every((s) => !Number(d[s.key])));
  if (empty) return <p className="py-16 text-center text-sm text-muted-foreground">Pas encore de données sur la période.</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ececec" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={money ? 70 : 30} tickFormatter={(v) => (money ? `${fmt(v / 1000)} k` : fmt(v))} allowDecimals={false} />
          <Tooltip formatter={(v) => (money ? `${fmt(Number(v))} FCFA` : fmt(Number(v)))} cursor={{ fill: "rgba(201,154,50,0.08)" }} />
          {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
