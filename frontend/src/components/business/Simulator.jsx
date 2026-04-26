import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Wand2, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const fmtMoney = (v) =>
  `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const fmtPct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;

const SimRow = ({ label, value, onChange, suffix = "%", min = -50, max = 50, testId }) => (
  <div data-testid={testId}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-charcoal">{label}</p>
      <span className={`font-display font-bold tabular-nums text-sm ${value > 0 ? "text-emerald-600" : value < 0 ? "text-danger" : "text-charcoal/60"}`}>
        {value > 0 ? "+" : ""}
        {value}
        {suffix}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(v) => onChange(v[0])}
      className="cursor-pointer"
    />
    <div className="flex justify-between text-[10px] text-charcoal/40 mt-1">
      <span>{min}{suffix}</span>
      <span>0</span>
      <span>+{max}{suffix}</span>
    </div>
  </div>
);

const Delta = ({ before, after, fmt = fmtMoney, testId }) => {
  const change = after - before;
  const pct = before !== 0 ? (change / Math.abs(before)) * 100 : 0;
  const positive = change >= 0;

  return (
    <div data-testid={testId} className="flex items-baseline gap-2">
      <span className="font-display font-bold text-xl text-charcoal number-pop">{fmt(after)}</span>
      <span className={`text-xs font-display font-semibold ${positive ? "text-emerald-600" : "text-danger"}`}>
        {positive ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
      </span>
    </div>
  );
};

const Simulator = () => {
  const [price, setPrice] = useState(0);
  const [cost, setCost] = useState(0);
  const [qty, setQty] = useState(0);
  const [fixedC, setFixedC] = useState(0);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPrice(0); setCost(0); setQty(0); setFixedC(0); setResult(null);
  };

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/business/simulate", {
        price_change_pct: price,
        cost_change_pct: cost,
        quantity_change_pct: qty,
        fixed_cost_change_pct: fixedC,
      });
      setResult(data);
    } catch (e) {
      toast.error("No se pudo ejecutar la simulación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-testid="simulator-card" className="border-emerald-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-500 grid place-items-center border border-amber-100">
              <Wand2 className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <CardTitle className="font-display text-charcoal">Simulador "¿qué pasaría si…?"</CardTitle>
              <p className="text-charcoal/55 text-sm mt-0.5">Mueve los controles y ve el impacto al instante.</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <SimRow testId="sim-price" label="Precio de venta" value={price} onChange={setPrice} />
          <SimRow testId="sim-cost" label="Costo por unidad" value={cost} onChange={setCost} />
          <SimRow testId="sim-qty" label="Cantidad vendida" value={qty} onChange={setQty} />
          <SimRow testId="sim-fixed" label="Costos fijos" value={fixedC} onChange={setFixedC} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button data-testid="run-simulation-btn" onClick={run} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold">
            <Wand2 className="h-4 w-4 mr-1.5" />
            {loading ? "Calculando..." : "Simular"}
          </Button>
          <Button data-testid="reset-simulation-btn" variant="outline" onClick={reset} className="border-emerald-200 hover:bg-emerald-50">
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reiniciar
          </Button>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button
              data-testid="preset-price-up"
              className="text-xs px-3 py-1.5 rounded-full bg-mint hover:bg-emerald-100 border border-emerald-100 text-emerald-800 font-semibold transition"
              onClick={() => { setPrice(10); setCost(0); setQty(0); setFixedC(0); }}
            >
              +10% precio
            </button>
            <button
              data-testid="preset-cost-down"
              className="text-xs px-3 py-1.5 rounded-full bg-mint hover:bg-emerald-100 border border-emerald-100 text-emerald-800 font-semibold transition"
              onClick={() => { setPrice(0); setCost(-10); setQty(0); setFixedC(0); }}
            >
              -10% costo
            </button>
            <button
              data-testid="preset-qty-up"
              className="text-xs px-3 py-1.5 rounded-full bg-mint hover:bg-emerald-100 border border-emerald-100 text-emerald-800 font-semibold transition"
              onClick={() => { setPrice(0); setCost(0); setQty(20); setFixedC(0); }}
            >
              +20% volumen
            </button>
          </div>
        </div>

        {result && (
          <div className="grid sm:grid-cols-2 gap-3 pt-2 animate-fade-in-up">
            <ResultCard tone="muted" title="Escenario actual">
              <ResultRow label="Ingresos" value={fmtMoney(result.current.revenue)} />
              <ResultRow label="Utilidad" value={fmtMoney(result.current.profit)} />
              <ResultRow label="Margen" value={fmtPct(result.current.margin)} />
              <ResultRow label="Punto de equilibrio" value={`${result.current.breakeven_units ?? "—"} u`} />
            </ResultCard>
            <ResultCard tone="emerald" title="Escenario simulado" testId="simulated-result-card">
              <DeltaRow label="Ingresos" before={result.current.revenue} after={result.simulated.revenue} testId="delta-revenue" />
              <DeltaRow label="Utilidad" before={result.current.profit} after={result.simulated.profit} testId="delta-profit" />
              <DeltaRow label="Margen" before={result.current.margin} after={result.simulated.margin} fmt={fmtPct} testId="delta-margin" />
              <DeltaRow label="Punto de equilibrio" before={result.current.breakeven_units || 0} after={result.simulated.breakeven_units || 0} fmt={(v) => `${Number(v).toFixed(0)} u`} testId="delta-breakeven" />
            </ResultCard>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ResultCard = ({ children, title, tone = "muted", testId }) => (
  <div
    data-testid={testId}
    className={`rounded-xl p-4 border ${
      tone === "emerald" ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200" : "bg-mint/40 border-emerald-100"
    }`}
  >
    <p className="font-display font-bold text-charcoal text-xs uppercase tracking-wider mb-3">{title}</p>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const ResultRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-charcoal/60">{label}</span>
    <span className="font-display font-semibold text-charcoal text-sm number-pop">{value}</span>
  </div>
);

const DeltaRow = ({ label, before, after, fmt = fmtMoney, testId }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-charcoal/60">{label}</span>
    <Delta before={before} after={after} fmt={fmt} testId={testId} />
  </div>
);

export default Simulator;
