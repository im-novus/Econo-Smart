import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";

const fmt = (v) => `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const monthLabel = (period) => {
  // period: "2026-04" -> "abr 26"
  const [y, m] = (period || "").split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  if (!y || !m) return period;
  return `${months[Math.max(0, parseInt(m, 10) - 1)]} ${y.slice(-2)}`;
};

const HistoryChart = ({ snapshots }) => {
  const data = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    return snapshots
      .slice()
      .sort((a, b) => (a.period > b.period ? 1 : -1))
      .map((s) => ({
        label: monthLabel(s.period),
        period: s.period,
        Ingresos: Math.round(s.revenue || 0),
        Utilidad: Math.round(s.profit || 0),
      }));
  }, [snapshots]);

  if (!data.length) {
    return (
      <Card data-testid="history-chart-card" className="border-emerald-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info-50 text-info border border-info-100 grid place-items-center">
              <Activity className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <CardTitle className="font-display text-charcoal">Histórico mensual</CardTitle>
              <p className="text-charcoal/55 text-sm mt-0.5">Aún sin datos históricos</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 grid place-items-center text-charcoal/55 text-sm">
            Tu histórico aparecerá aquí cuando tengas más de un mes de datos.
          </div>
        </CardContent>
      </Card>
    );
  }

  const stableKey = data.map((d) => d.period).join("|");

  return (
    <Card data-testid="history-chart-card" className="border-emerald-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info-50 text-info border border-info-100 grid place-items-center">
              <Activity className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <CardTitle className="font-display text-charcoal">Histórico mensual</CardTitle>
              <p className="text-charcoal/55 text-sm mt-0.5">Evolución de ingresos y utilidad</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-info-50 text-info px-2 py-0.5 rounded-full hidden sm:inline">
            últimos {data.length} meses
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full notranslate" translate="no">
          <ResponsiveContainer width="100%" height="100%" key={stableKey}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1D9E75" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF9F27" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#EF9F27" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" vertical={false} />
              <XAxis dataKey="label" stroke="#2C2C2A" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#2C2C2A" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={70} />
              <Tooltip
                cursor={{ stroke: "#1D9E75", strokeOpacity: 0.4 }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #C2EAD9",
                  boxShadow: "0 10px 30px -12px rgba(15,110,86,0.18)",
                }}
                formatter={(v, name) => [fmt(v), name]}
                isAnimationActive={false}
              />
              <Area
                type="monotone" dataKey="Ingresos" stroke="#1D9E75" strokeWidth={2.5}
                fill="url(#gradRev)" isAnimationActive={false}
                activeDot={{ r: 5, fill: "#1D9E75", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone" dataKey="Utilidad" stroke="#EF9F27" strokeWidth={2.5}
                fill="url(#gradPro)" isAnimationActive={false}
                activeDot={{ r: 5, fill: "#EF9F27", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs notranslate" translate="no">
          <span className="flex items-center gap-1.5 text-charcoal/65">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5 text-charcoal/65">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Utilidad
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(HistoryChart);
