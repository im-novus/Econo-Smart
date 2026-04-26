import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";

const PRIORITY = {
  alta: "bg-danger/10 text-danger border-danger/20",
  media: "bg-amber-50 text-amber-600 border-amber-200",
  baja: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const Recommendations = ({ analysis, onRefresh, loading }) => {
  const isAi = analysis?.ai;
  const recs = analysis?.recommendations || [];
  const strengths = analysis?.strengths || [];
  const risks = analysis?.risks || [];
  const next30 = analysis?.next_30_days || [];
  const summary = analysis?.summary;

  return (
    <Card data-testid="ai-recommendations-card" className="border-emerald-100 overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-50 via-white to-mint p-1">
        <div className="bg-white rounded-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white grid place-items-center shadow-md">
                  <Sparkles className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div>
                  <CardTitle className="font-display text-charcoal flex items-center gap-2">
                    Recomendaciones IA
                    {isAi && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Gemini
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-charcoal/55 text-sm mt-0.5">Análisis financiero con inteligencia artificial</p>
                </div>
              </div>
              <Button
                data-testid="refresh-ai-button"
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
                className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Analizando..." : "Volver a analizar"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {summary && (
              <p className="text-charcoal/85 leading-relaxed bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 text-sm">
                {summary}
              </p>
            )}

            {recs.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-display font-bold text-charcoal text-sm uppercase tracking-wider">
                  Acciones recomendadas
                </h4>
                <div className="grid gap-3">
                  {recs.map((r, i) => (
                    <div
                      key={i}
                      data-testid={`recommendation-${i}`}
                      className="border border-emerald-100 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center mt-0.5">
                          <Lightbulb className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display font-bold text-charcoal text-base leading-tight">{r.title}</p>
                            {r.priority && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PRIORITY[String(r.priority).toLowerCase()] || PRIORITY.media}`}>
                                {r.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-charcoal/75 text-sm mt-1 leading-relaxed">{r.detail}</p>
                          {r.impact && (
                            <p className="text-emerald-700 text-xs mt-2 font-medium flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" /> {r.impact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(strengths.length > 0 || risks.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-3">
                {strengths.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="font-display font-bold text-emerald-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Fortalezas
                    </p>
                    <ul className="space-y-1.5">
                      {strengths.map((s, i) => (
                        <li key={i} className="text-charcoal/80 text-sm flex gap-2">
                          <span className="text-emerald-600">·</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {risks.length > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <p className="font-display font-bold text-amber-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Riesgos
                    </p>
                    <ul className="space-y-1.5">
                      {risks.map((r, i) => (
                        <li key={i} className="text-charcoal/80 text-sm flex gap-2">
                          <span className="text-amber-600">·</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {next30.length > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-5">
                <p className="font-display font-bold text-emerald-50 text-xs uppercase tracking-wider mb-3">
                  Plan de los próximos 30 días
                </p>
                <ol className="space-y-2.5">
                  {next30.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-white/15 backdrop-blur grid place-items-center font-display font-bold text-xs">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed text-emerald-50">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

export default Recommendations;
