import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import AppShell from "@/components/business/AppShell";
import BusinessForm from "@/components/business/BusinessForm";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wallet, Target, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (v) => `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const fmtPct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;

const PreviewKPI = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl bg-mint border border-emerald-100 p-3">
    <div className="h-9 w-9 rounded-lg bg-white grid place-items-center text-emerald-700 border border-emerald-100">
      <Icon className="h-4 w-4" strokeWidth={2.4} />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-charcoal/55">{label}</p>
      <p className="font-display font-bold text-charcoal text-base number-pop">{value}</p>
    </div>
  </div>
);

const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [existing, setExisting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get("/business").then(({ data }) => {
      if (mounted && data.business) setExisting(data.business);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (form) => {
    setSubmitting(true);
    try {
      await api.post("/business", form);
      toast.success("Datos guardados. Generando análisis…");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error("No se pudieron guardar los datos.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    toast.info("Datos de ejemplo cargados. Pulsa Guardar para continuar.");
  };

  const isEdit = Boolean(existing);

  return (
    <AppShell>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 animate-fade-in-up">
        <div className="space-y-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              {isEdit ? "Editar mi negocio" : "Configura tu negocio"}
            </span>
            <h1 className="mt-3 font-display font-bold text-3xl sm:text-4xl text-charcoal text-balance">
              {isEdit ? "Actualiza tus datos financieros" : "Empecemos por conocer tu negocio"}
            </h1>
            <p className="mt-2 text-charcoal/65 max-w-xl">
              Con esta información calculamos tus KPIs, te mostramos un dashboard claro y generamos recomendaciones inteligentes con IA.
            </p>
          </div>

          <BusinessForm
            initialData={existing}
            onSubmit={handleSubmit}
            onLoadSample={handleLoadSample}
            submitting={submitting}
            submitLabel={isEdit ? "Actualizar y volver al panel" : "Guardar y ver resultados"}
          />
        </div>

        <aside className="space-y-4">
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute inset-0 bg-grid-emerald opacity-25" />
              <div className="relative">
                <p className="font-display font-bold uppercase tracking-wider text-xs text-emerald-200">Lo que obtendrás</p>
                <h3 className="mt-2 font-display font-bold text-2xl leading-tight">
                  Un panel claro y recomendaciones que sí entiendes.
                </h3>
                <ul className="mt-5 space-y-3 text-sm">
                  {[
                    "Indicadores en tiempo real",
                    "Punto de equilibrio automático",
                    "Recomendaciones IA en español",
                    "Simulador de escenarios",
                  ].map((t, i) => (
                    <li key={i} className="flex items-center gap-2 text-emerald-50">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100">
            <CardContent className="p-6">
              <p className="font-display font-bold text-charcoal text-sm uppercase tracking-wider mb-3">
                Vista previa rápida
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <PreviewKPI icon={Wallet} label="Ingresos" value={fmtMoney(90000)} />
                <PreviewKPI icon={TrendingUp} label="Utilidad" value={fmtMoney(20000)} />
                <PreviewKPI icon={BarChart3} label="Margen" value={fmtPct(0.22)} />
                <PreviewKPI icon={Target} label="Equilibrio" value="550 u" />
              </div>
              <p className="mt-3 text-charcoal/45 text-xs">
                Ejemplo ilustrativo. Tus números reales aparecerán al guardar.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
};

export default Onboarding;
