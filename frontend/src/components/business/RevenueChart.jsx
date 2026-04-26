import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmt = (v) => `$${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const RevenueChart = ({ kpis }) => {
  if (!kpis) return null;

  const data = [
    { name: "Ingresos", value: kpis.revenue, color: "#1D9E75" },
    { name: "Costos variables", value: kpis.variable_costs, color: "#EF9F27" },
    { name: "Costos fijos", value: kpis.fixed_costs, color: "#2D7BB8" },
    { name: "Utilidad", value: Math.max(kpis.profit, 0), color: kpis.profit >= 0 ? "#0F6E56" : "#D64545" },
  ];

  return (
    <Card data-testid="revenue-chart-card" className="border-emerald-100">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-display text-charcoal">Ingresos vs Costos</CardTitle>
            <p className="text-charcoal/55 text-sm mt-1">Composición financiera mensual</p>
          </div>
          <div className="hidden sm:flex gap-3 text-xs">
            <LegendDot item="Ingresos" color="#1D9E75" />
            <LegendDot item="C. Variables" color="#EF9F27" />
            <LegendDot item="C. Fijos" color="#2D7BB8" />
            <LegendDot item="Utilidad" color="#0F6E56" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" vertical={false} />
              <XAxis dataKey="name" stroke="#2C2C2A" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#2C2C2A" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={70} />
              <Tooltip
                cursor={{ fill: "rgba(29,158,117,0.08)" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #C2EAD9",
                  boxShadow: "0 10px 30px -12px rgba(15,110,86,0.18)",
                }}
                formatter={(v) => [fmt(v), "Monto"]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const LegendDot = ({ item, color }) => (
  <span className="flex items-center gap-1.5 text-charcoal/65">
    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
    {item}
  </span>
);

export default RevenueChart;
