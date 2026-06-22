"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { incidents } from "@/lib/incidents";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// "6/1/2018" o "2024-10_a_2025-05" -> {y, m}
function parseYM(date: string): { y: number; m: number } | null {
  const s = date.trim();
  let mt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mt) return { y: +mt[3], m: +mt[1] };
  mt = s.match(/^(\d{4})-(\d{2})/);
  if (mt) return { y: +mt[1], m: +mt[2] };
  return null;
}

// Tonos de rojo para la dona
const RED_SHADES = ["#7f1d1d", "#b91c1c", "#ef4444", "#f87171", "#fca5a5"];

export default function Stats() {
  const monthly = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of incidents) {
      const ym = parseYM(r.date);
      if (!ym || ym.y < 2024) continue; // serie desde 2024 (escalada)
      const key = `${ym.y}-${String(ym.m).padStart(2, "0")}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    // rango continuo Ene 2024 -> ultimo mes
    const keys = Object.keys(counts).sort();
    if (keys.length === 0) return [];
    const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
    const out: { label: string; eventos: number }[] = [];
    let y = 2024,
      m = 1;
    while (y < ly || (y === ly && m <= lm)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      out.push({
        label: `${MESES[m - 1]} ${String(y).slice(2)}`,
        eventos: counts[key] ?? 0,
      });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }, []);

  const targets = useMemo(() => {
    const label: Record<string, string> = {
      military: "Militar",
      civilian: "Civil",
      infrastructure: "Infraestructura",
      mixed: "Mixto",
      na: "N/D",
    };
    const counts: Record<string, number> = {};
    for (const r of incidents) {
      const k = label[r.target] ?? r.target ?? "N/D";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value], i) => ({
        name,
        value,
        fill: RED_SHADES[i % RED_SHADES.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const totalTargets = targets.reduce((s, t) => s + t.value, 0);

  const areaConfig: ChartConfig = {
    eventos: { label: "Eventos", color: "#ef4444" },
  };
  const pieConfig: ChartConfig = Object.fromEntries(
    targets.map((t) => [t.name, { label: t.name, color: t.fill }])
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-10">
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Detalle · Colombia
      </h2>
      <p className="mt-2 text-zinc-400">
        Mostrando{" "}
        <span className="font-medium text-red-400">todos los incidentes</span>{" "}
        con drones registrados ({incidents.length} eventos)
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-2">
        {/* Eventos por mes */}
        <Card className="rounded-none border-0 bg-transparent py-0 text-zinc-100 shadow-none ring-0">
          <CardHeader className="px-0">
            <CardTitle className="text-zinc-100">Eventos por mes</CardTitle>
            <CardDescription className="text-zinc-500">
              Desde enero 2024
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ChartContainer config={areaConfig} className="h-[300px] w-full">
              <BarChart data={monthly} margin={{ left: 0, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.95} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(239,68,68,0.08)" }}
                  content={
                    <ChartTooltipContent
                      color="#ef4444"
                      className="border-0 bg-black text-white ring-0 [&_*]:text-white"
                    />
                  }
                />
                <Bar
                  dataKey="eventos"
                  fill="url(#fillEventos)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Tipos de objetivo */}
        <Card className="rounded-none border-0 bg-transparent py-0 text-zinc-100 shadow-none ring-0">
          <CardHeader className="px-0">
            <CardTitle className="text-zinc-100">Tipo de objetivo</CardTitle>
            <CardDescription className="text-zinc-500">
              Distribución de los ataques
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ChartContainer
              config={pieConfig}
              className="mx-auto aspect-square h-[240px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      className="border-0 bg-black text-white ring-0 [&_*]:text-white"
                    />
                  }
                />
                <Pie
                  data={targets}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {targets.map((t) => (
                    <Cell key={t.name} fill={t.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Leyenda */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
              {targets.map((t) => (
                <div key={t.name} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ background: t.fill }}
                  />
                  <span className="text-zinc-300">{t.name}</span>
                  <span className="tabular-nums text-zinc-500">
                    {Math.round((t.value / totalTargets) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
