import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, TrendingUp, Percent, Target, Sparkles, Plus, Boxes, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/business/AppShell";
import KpiCard from "@/components/business/KpiCard";
import HealthIndicator from "@/components/business/HealthIndicator";
import RevenueChart from "@/components/business/RevenueChart";
import Recommendations from "@/components/business/Recommendations";
import Simulator from "@/components/business/Simulator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const fmtMoney = (v) => `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const fmtPct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;

const EmptyState = ({ onLoadSample, navigate, loadingSample }) => (
  <div className="grid place-items-center py-12 animate-fade-in-up">
    <Card className="max-w-2xl border-emerald-100 overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-50 via-mint to-white p-1">
        <CardContent className="bg-white rounded-md p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 grid place-items-center text-white mx-auto shadow-lg">
            <Sparkles className="h-7 w-7" strokeWidth={2.4} />
          </div>
          <h2 className="mt-5 font-display font-bold text-2xl sm:text-3xl text-charcoal text-balance">
            Bienvenido a Econo Smart
          </h2>
          <p className="mt-2 text-charcoal/65">
            Carga los datos de tu negocio para ver tu panel financiero y recomendaciones de IA.
            Si solo quieres explorar, puedes usar nuestros datos de ejemplo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button
              data-testid="empty-add-data-btn"
              onClick={() => navigate("/onboarding")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ingresar mis datos
            </Button>
            <Button
              data-testid="empty-load-sample-btn"
              variant="outline"
              onClick={onLoadSample}
              disabled={loadingSample}
              className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {loadingSample ? "Cargando…" : "Probar con datos de ejemplo"}
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [biz, setBiz] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  const fetchBiz = useCallback(async () => {
    try {
      const { data } = await api.get("/business");
      setBiz(data.business);
      return data.business;
    } catch (e) {
      return null;
    }
  }, []);

  const fetchAi = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("/business/analyze");
      setAnalysis(data);
    } catch (e) {
      toast.error("No se pudo generar el análisis IA.");
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const b = await fetchBiz();
      if (mounted && b) await fetchAi();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchBiz, fetchAi]);

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      const { data } = await api.post("/business/sample");
      setBiz(data);
      toast.success("Datos de ejemplo cargados.");
      await fetchAi();
    } catch (e) {
      toast.error("No se pudieron cargar los datos de ejemplo.");
    } finally {
      setLoadingSample(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center py-32">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!biz) {
    return (
      <AppShell>
        <EmptyState
          onLoadSample={handleLoadSample}
          navigate={navigate}
          loadingSample={loadingSample}
        />
      </AppShell>
    );
  }

  const k = biz.kpis;

  return (
    <AppShell
      action={
        <Button
          data-testid="header-edit-data-btn"
          onClick={() => navigate("/onboarding")}
          variant="outline"
          className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Editar datos
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-emerald-700 font-display font-semibold text-sm">
              Hola, {user?.name?.split(" ")[0] || "emprendedor"} 👋
            </p>
            <h1 data-testid="business-name-heading" className="mt-1 font-display font-bold text-3xl sm:text-4xl text-charcoal text-balance">
              {biz.business_name}
            </h1>
            <p className="text-charcoal/55 text-sm capitalize mt-1">
              {biz.business_type} · panel financiero al {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
            </p>
          </div>
          <Button
            data-testid="mobile-edit-data-btn"
            onClick={() => navigate("/onboarding")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white sm:hidden"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Editar
          </Button>
        </div>

        {/* Health */}
        <HealthIndicator status={k.status} />

        {/* KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            testId="kpi-revenue"
            icon={Wallet} tone="emerald"
            label="Ingresos mensuales"
            value={fmtMoney(k.revenue)}
            subtitle={`${biz.quantity_sold} unidades vendidas`}
          />
          <KpiCard
            testId="kpi-profit"
            icon={TrendingUp}
            tone={k.profit >= 0 ? "emerald" : "amber"}
            label="Utilidad"
            value={fmtMoney(k.profit)}
            subtitle={k.profit >= 0 ? "Tu negocio gana dinero" : "Operando a pérdida"}
          />
          <KpiCard
            testId="kpi-margin"
            icon={Percent}
            tone={k.margin >= 0.20 ? "emerald" : "amber"}
            label="Margen de ganancia"
            value={fmtPct(k.margin)}
            subtitle={k.margin >= 0.20 ? "Saludable (>20%)" : "Por debajo del objetivo"}
          />
          <KpiCard
            testId="kpi-breakeven"
            icon={Target} tone="info"
            label="Punto de equilibrio"
            value={k.breakeven_units ? `${k.breakeven_units} u` : "—"}
            subtitle={k.breakeven_revenue ? fmtMoney(k.breakeven_revenue) + " en ventas" : "Sin margen de contribución"}
          />
        </div>

        {/* Charts + Inventory */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart kpis={k} />
          </div>
          <Card className="border-emerald-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-info-50 text-info border border-info-100 grid place-items-center">
                  <Boxes className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-display font-bold text-charcoal">Inventario y costos</p>
                  <p className="text-charcoal/55 text-xs">Resumen operativo</p>
                </div>
              </div>
              <div className="space-y-3">
                <Row label="Inventario actual" value={`${biz.inventory} u`} />
                <Row label="Cantidad vendida" value={`${biz.quantity_sold} u`} />
                <Row label="Rotación de inventario" value={k.inventory_turnover_ratio ? `${k.inventory_turnover_ratio}x` : "—"} />
                <div className="h-px bg-emerald-100 my-3" />
                <Row label="Costos variables" value={fmtMoney(k.variable_costs)} />
                <Row label="Costos fijos" value={fmtMoney(k.fixed_costs)} />
                <Row label="Costos totales" value={fmtMoney(k.total_costs)} strong />
                <Row
                  label="Margen por unidad"
                  value={fmtMoney(k.contribution_margin_per_unit)}
                  helper={k.contribution_margin_per_unit > 0 ? "ganancia bruta/unidad" : "pérdida por unidad"}
                />
              </div>
              {k.inventory_high && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-800 text-xs flex gap-2 items-start">
                  <BarChart3 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Tu inventario es alto vs. ventas. Considera promociones o reducir compras.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations */}
        <Recommendations analysis={analysis} loading={aiLoading} onRefresh={fetchAi} />

        {/* Simulator */}
        <Simulator />
      </div>
    </AppShell>
  );
};

const Row = ({ label, value, strong, helper }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-charcoal/65">{label}</span>
    <div className="text-right">
      <p className={`font-display ${strong ? "font-bold text-charcoal" : "font-semibold text-charcoal/85"} text-sm number-pop`}>{value}</p>
      {helper && <p className="text-[10px] text-charcoal/45">{helper}</p>}
    </div>
  </div>
);

export default Dashboard;
