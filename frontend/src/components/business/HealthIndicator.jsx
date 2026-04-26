import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, TrendingDown } from "lucide-react";

const STATES = {
  healthy: {
    label: "Saludable",
    description: "Tu negocio funciona bien. Mantén el ritmo y enfoca en escalar.",
    bg: "from-emerald-500 to-emerald-700",
    icon: CheckCircle2,
    chip: "bg-white/15 text-white",
  },
  risk: {
    label: "En riesgo",
    description: "Margen ajustado. Pequeños cambios en precio o costo cambian el panorama.",
    bg: "from-amber-400 to-amber-600",
    icon: AlertTriangle,
    chip: "bg-white/20 text-white",
  },
  loss: {
    label: "En pérdida",
    description: "Estás operando a pérdida. Acción inmediata requerida.",
    bg: "from-red-500 to-rose-700",
    icon: TrendingDown,
    chip: "bg-white/20 text-white",
  },
};

const HealthIndicator = ({ status = "healthy" }) => {
  const cfg = STATES[status] || STATES.healthy;
  const Icon = cfg.icon;
  return (
    <Card data-testid="health-indicator-card" className="border-0 overflow-hidden text-white animate-fade-in-up">
      <div className={`bg-gradient-to-br ${cfg.bg} relative`}>
        <div className="absolute inset-0 bg-grid-emerald opacity-20" />
        <CardContent className="relative p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <Icon className="h-6 w-6" strokeWidth={2.4} />
            </div>
            <div className="flex-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.chip}`}>
                Estado
              </span>
              <p data-testid="health-status-label" className="mt-1.5 font-display text-3xl font-bold leading-tight">
                {cfg.label}
              </p>
              <p className="mt-1 text-white/85 text-sm max-w-md">
                {cfg.description}
              </p>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default HealthIndicator;
