import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Sparkles } from "lucide-react";

const TYPES = [
  { value: "tienda", label: "Tienda / Retail" },
  { value: "restaurante", label: "Restaurante / Cafetería" },
  { value: "servicios", label: "Servicios profesionales" },
  { value: "manufactura", label: "Manufactura / Taller" },
  { value: "ecommerce", label: "E-commerce / Online" },
  { value: "salud", label: "Salud / Belleza" },
  { value: "educacion", label: "Educación / Cursos" },
  { value: "otro", label: "Otro" },
];

const initial = {
  business_name: "",
  business_type: "tienda",
  monthly_sales: "",
  fixed_costs: "",
  cost_per_unit: "",
  sale_price: "",
  quantity_sold: "",
  inventory: "",
};

const sampleData = {
  business_name: "Cafetería La Esquina",
  business_type: "restaurante",
  monthly_sales: 85000,
  fixed_costs: 22000,
  cost_per_unit: 35,
  sale_price: 75,
  quantity_sold: 1200,
  inventory: 400,
};

const NumField = ({ id, label, value, onChange, prefix, suffix, placeholder, testId }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs uppercase tracking-wider font-semibold text-charcoal/70">
      {label}
    </Label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 font-display font-semibold text-sm">{prefix}</span>
      )}
      <Input
        id={id}
        data-testid={testId}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-11 ${prefix ? "pl-7" : ""} ${suffix ? "pr-12" : ""} bg-white border-emerald-100 focus-visible:ring-emerald-500 focus-visible:ring-offset-0`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 text-xs font-medium">{suffix}</span>
      )}
    </div>
  </div>
);

const BusinessForm = ({ initialData, onSubmit, onLoadSample, submitting, submitLabel = "Guardar y analizar" }) => {
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (initialData) {
      setData({
        business_name: initialData.business_name || "",
        business_type: initialData.business_type || "tienda",
        monthly_sales: initialData.monthly_sales ?? "",
        fixed_costs: initialData.fixed_costs ?? "",
        cost_per_unit: initialData.cost_per_unit ?? "",
        sale_price: initialData.sale_price ?? "",
        quantity_sold: initialData.quantity_sold ?? "",
        inventory: initialData.inventory ?? "",
      });
    }
  }, [initialData]);

  const setField = (k) => (v) => setData((prev) => ({ ...prev, [k]: v }));

  const fillSample = () => {
    setData(sampleData);
    onLoadSample?.();
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...data,
      monthly_sales: Number(data.monthly_sales || 0),
      fixed_costs: Number(data.fixed_costs || 0),
      cost_per_unit: Number(data.cost_per_unit || 0),
      sale_price: Number(data.sale_price || 0),
      quantity_sold: Number(data.quantity_sold || 0),
      inventory: Number(data.inventory || 0),
    });
  };

  return (
    <form onSubmit={submit}>
      <Card className="border-emerald-100">
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="font-display font-bold text-charcoal text-lg">Datos de tu negocio</h3>
            <p className="text-charcoal/55 text-sm">
              Tarda menos de 3 minutos. Puedes editarlos después en cualquier momento.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="business_name" className="text-xs uppercase tracking-wider font-semibold text-charcoal/70">
                Nombre del negocio
              </Label>
              <Input
                id="business_name"
                data-testid="input-business-name"
                value={data.business_name}
                onChange={(e) => setField("business_name")(e.target.value)}
                placeholder="Ej. Cafetería La Esquina"
                className="h-11 bg-white border-emerald-100 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-semibold text-charcoal/70">
                Tipo de negocio
              </Label>
              <Select value={data.business_type} onValueChange={setField("business_type")}>
                <SelectTrigger data-testid="select-business-type" className="h-11 bg-white border-emerald-100 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <NumField
              id="monthly_sales" testId="input-monthly-sales"
              label="Ventas mensuales totales"
              value={data.monthly_sales} onChange={setField("monthly_sales")}
              prefix="$" placeholder="85000"
            />

            <NumField
              id="fixed_costs" testId="input-fixed-costs"
              label="Costos fijos al mes"
              value={data.fixed_costs} onChange={setField("fixed_costs")}
              prefix="$" placeholder="22000"
            />
            <NumField
              id="cost_per_unit" testId="input-cost-per-unit"
              label="Costo por producto / unidad"
              value={data.cost_per_unit} onChange={setField("cost_per_unit")}
              prefix="$" placeholder="35"
            />

            <NumField
              id="sale_price" testId="input-sale-price"
              label="Precio de venta unitario"
              value={data.sale_price} onChange={setField("sale_price")}
              prefix="$" placeholder="75"
            />
            <NumField
              id="quantity_sold" testId="input-quantity-sold"
              label="Cantidad vendida al mes"
              value={data.quantity_sold} onChange={setField("quantity_sold")}
              suffix="u" placeholder="1200"
            />

            <NumField
              id="inventory" testId="input-inventory"
              label="Inventario actual"
              value={data.inventory} onChange={setField("inventory")}
              suffix="u" placeholder="400"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-3 border-t border-emerald-50">
            <Button type="submit" data-testid="submit-business-btn" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold">
              <Save className="h-4 w-4 mr-2" />
              {submitting ? "Guardando..." : submitLabel}
            </Button>
            <Button type="button" data-testid="load-sample-btn" variant="outline" onClick={fillSample} className="border-emerald-200 hover:bg-emerald-50">
              <Sparkles className="h-4 w-4 mr-2" />
              Usar datos de ejemplo
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default BusinessForm;
