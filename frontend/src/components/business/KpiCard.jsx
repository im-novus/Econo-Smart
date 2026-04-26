import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const TONE = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  info: "bg-info-50 text-info border-info-100",
  charcoal: "bg-mint text-charcoal border-emerald-100",
};

const KpiCard = ({ icon: Icon, label, value, subtitle, tone = "emerald", delta, testId }) => {
  const toneClasses = TONE[tone] || TONE.emerald;
  const deltaPositive = typeof delta === "number" ? delta >= 0 : null;

  return (
    <Card data-testid={testId} className="border-emerald-100 hover:border-emerald-200 transition-all duration-200 hover:shadow-[0_10px_30px_-12px_rgba(15,110,86,0.18)] group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`h-10 w-10 rounded-xl border grid place-items-center ${toneClasses}`}>
            {Icon && <Icon className="h-5 w-5" strokeWidth={2.2} />}
          </div>
          {deltaPositive !== null && (
            <span className={`text-xs font-display font-semibold flex items-center gap-0.5 ${deltaPositive ? "text-emerald-600" : "text-danger"}`}>
              {deltaPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="mt-4 text-charcoal/55 text-xs uppercase tracking-wider font-semibold">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold text-charcoal number-pop tracking-tight">
          {value}
        </p>
        {subtitle && <p className="text-charcoal/55 text-xs mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
