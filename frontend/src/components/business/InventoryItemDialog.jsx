import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

const empty = {
  name: "",
  sku: "",
  category: "",
  stock: 0,
  reorder_level: 0,
  cost: 0,
  price: 0,
};

const Field = ({ id, label, value, onChange, type = "text", testId, prefix }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs uppercase tracking-wider font-semibold text-charcoal/70">
      {label}
    </Label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 text-sm font-medium">{prefix}</span>
      )}
      <Input
        id={id} data-testid={testId}
        type={type} value={value}
        onChange={(e) => onChange(type === "number" ? e.target.value : e.target.value)}
        className={`h-10 ${prefix ? "pl-7" : ""} bg-white border-emerald-100 focus-visible:ring-emerald-500 focus-visible:ring-offset-0`}
      />
    </div>
  </div>
);

const InventoryItemDialog = ({ open, onOpenChange, item, onSaved }) => {
  const [data, setData] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setData({
        name: item.name || "",
        sku: item.sku || "",
        category: item.category || "",
        stock: item.stock ?? 0,
        reorder_level: item.reorder_level ?? 0,
        cost: item.cost ?? 0,
        price: item.price ?? 0,
      });
    } else {
      setData(empty);
    }
  }, [item, open]);

  const setField = (k) => (v) => setData((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!data.name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        stock: parseInt(data.stock || 0, 10),
        reorder_level: parseInt(data.reorder_level || 0, 10),
        cost: parseFloat(data.cost || 0),
        price: parseFloat(data.price || 0),
      };
      if (item?.item_id) {
        await api.put(`/inventory/${item.item_id}`, payload);
        toast.success("Producto actualizado");
      } else {
        await api.post("/inventory", payload);
        toast.success("Producto agregado");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="inventory-item-dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {item ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            Captura los datos del producto y nivel de reorden para alertas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field id="name" testId="inv-name" label="Nombre" value={data.name} onChange={setField("name")} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="sku" testId="inv-sku" label="SKU / Código" value={data.sku} onChange={setField("sku")} />
            <Field id="category" testId="inv-category" label="Categoría" value={data.category} onChange={setField("category")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="stock" testId="inv-stock" label="Stock actual" type="number" value={data.stock} onChange={setField("stock")} />
            <Field id="reorder" testId="inv-reorder" label="Nivel mínimo" type="number" value={data.reorder_level} onChange={setField("reorder_level")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="cost" testId="inv-cost" label="Costo unitario" type="number" prefix="$" value={data.cost} onChange={setField("cost")} />
            <Field id="price" testId="inv-price" label="Precio unitario" type="number" prefix="$" value={data.price} onChange={setField("price")} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-emerald-200">
              Cancelar
            </Button>
            <Button type="submit" data-testid="inv-save-btn" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Guardando..." : (item ? "Guardar cambios" : "Agregar producto")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryItemDialog;
