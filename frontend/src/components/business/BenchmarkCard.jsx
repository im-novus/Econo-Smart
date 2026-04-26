import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Building2 } from "lucide-react";

const fmtPct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;

const BenchmarkCard = ({ businessType, userMargin }) => {
  const [bench, setBench] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!businessType) return;
    api.get(`/benchmarks/${businessType}`).then(({ data }) => {
      if (mounted) setBench(data);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [businessType]);

  if (!bench) {
    return (
      <Card data-testid="benchmark-card" className="border-emerald-100">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info-50 text-info border border-info-100 grid place-items-center">
              <Building2 className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-display font-bold text-charcoal">Comparativo de industria</p>
              <p className="text-charcoal/55 text-xs">Cargando benchmark…</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const diff = (userMargin || 0) - bench.margin;
  const ahead = diff >= 0;
  const Icon = Math.abs(diff) < 0.02 ? Minus : ahead ? TrendingUp : TrendingDown;
  const tone = Math.abs(diff) < 0.02
    ? { bg: "bg-info-50", color: "text-info", border: "border-info-100", label: "Al nivel" }
    : ahead
      ? { bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200", label: "Por encima" }
      : { bg: "bg-amber-50", color: "text-amber-600", border: "border-amber-200", label: "Por debajo" };

  return (
    <Card data-testid="benchmark-card" className="border-emerald-100">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-xl ${tone.bg} ${tone.color} ${tone.border} border grid place-items-center`}>
            <Building2 className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="font-display font-bold text-charcoal">Comparativo de industria</p>
            <p className="text-charcoal/55 text-xs">{bench.label}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-mint border border-emerald-100 p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-charcoal/55">Tu margen</p>
            <p className="font-display font-bold text-charcoal text-2xl number-pop">{fmtPct(userMargin)}</p>
          </div>
          <div className="rounded-xl bg-info-50 border border-info-100 p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-charcoal/55">Industria</p>
            <p className="font-display font-bold text-charcoal text-2xl number-pop">{fmtPct(bench.margin)}</p>
          </div>
        </div>

        <div className={`mt-3 rounded-xl ${tone.bg} ${tone.border} border p-3 flex items-start gap-2.5`}>
          <Icon className={`h-4 w-4 ${tone.color} mt-0.5 shrink-0`} strokeWidth={2.4} />
          <div className="flex-1">
            <p className={`font-display font-bold text-sm ${tone.color}`}>
              {tone.label} del promedio del sector
            </p>
            <p className="text-charcoal/65 text-xs mt-0.5">
              {ahead
                ? `Estás ${fmtPct(Math.abs(diff))} arriba del promedio. Mantén o invierte en crecer.`
                : `Tu margen está ${fmtPct(Math.abs(diff))} por debajo. Hay margen de mejora.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BenchmarkCard;
