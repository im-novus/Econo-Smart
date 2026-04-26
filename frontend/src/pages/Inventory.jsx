import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import AppShell from "@/components/business/AppShell";
import InventoryItemDialog from "@/components/business/InventoryItemDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Boxes,
  AlertTriangle,
  Package,
  Coins,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (v) => `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const SummaryCard = ({ icon: Icon, label, value, tone = "emerald", testId }) => {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    info: "bg-info-50 text-info border-info-100",
    danger: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <Card data-testid={testId} className="border-emerald-100">
      <CardContent className="p-4">
        <div className={`h-9 w-9 rounded-lg border grid place-items-center ${tones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <p className="mt-3 text-charcoal/55 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
        <p className="font-display font-bold text-charcoal text-xl number-pop">{value}</p>
      </CardContent>
    </Card>
  );
};

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/inventory");
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (e) {
      toast.error("No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/inventory/${deleting.item_id}`);
      toast.success("Producto eliminado");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error("No se pudo eliminar.");
    }
  };

  const lowStock = (it) => it.stock <= it.reorder_level;

  return (
    <AppShell
      action={
        <Button
          data-testid="add-inventory-btn"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-semibold"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo producto
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
            <Boxes className="h-3 w-3" /> Inventario
          </span>
          <h1 className="mt-3 font-display font-bold text-3xl sm:text-4xl text-charcoal text-balance">
            Tus productos y existencias
          </h1>
          <p className="mt-2 text-charcoal/65 max-w-xl">
            Administra tu catálogo, mantén stock saludable y recibe alertas cuando un producto necesite reordenarse.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard testId="sum-count" icon={Package} label="Productos" value={summary?.count ?? 0} tone="emerald" />
          <SummaryCard testId="sum-units" icon={Boxes} label="Unidades totales" value={summary?.total_units ?? 0} tone="info" />
          <SummaryCard testId="sum-value" icon={Coins} label="Valor a costo" value={fmtMoney(summary?.total_cost_value)} tone="emerald" />
          <SummaryCard testId="sum-low" icon={AlertTriangle} label="Bajo stock"
            value={summary?.low_stock_count ?? 0} tone={summary?.low_stock_count ? "amber" : "info"} />
        </div>

        {/* Low stock alert */}
        {summary?.low_stock_count > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500 text-white grid place-items-center shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-display font-bold text-amber-800">Productos con bajo stock</p>
              <p className="text-amber-700 text-sm mt-0.5">
                {summary.low_stock_items.join(", ")}. Considera reordenarlos pronto para no perder ventas.
              </p>
            </div>
          </div>
        )}

        {/* Search + Table */}
        <Card className="border-emerald-100">
          <CardContent className="p-0">
            <div className="p-4 border-b border-emerald-50 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/40" />
                <Input
                  data-testid="inventory-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, SKU o categoría…"
                  className="pl-9 h-10 bg-white border-emerald-100 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                />
              </div>
              <span className="text-xs text-charcoal/55">{filtered.length} de {items.length}</span>
            </div>

            {loading ? (
              <div className="grid place-items-center py-16">
                <div className="h-8 w-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 grid place-items-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-display font-bold text-charcoal">
                  {items.length === 0 ? "Aún no tienes productos" : "Sin resultados"}
                </p>
                <p className="text-charcoal/55 text-sm mt-1">
                  {items.length === 0 ? "Agrega tu primer producto para empezar a controlar tu inventario." : "Ajusta tu búsqueda."}
                </p>
                {items.length === 0 && (
                  <Button
                    data-testid="empty-add-inv-btn"
                    onClick={() => { setEditing(null); setDialogOpen(true); }}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Agregar producto
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-display font-bold text-charcoal/70">Producto</TableHead>
                      <TableHead className="font-display font-bold text-charcoal/70">SKU</TableHead>
                      <TableHead className="font-display font-bold text-charcoal/70">Categoría</TableHead>
                      <TableHead className="font-display font-bold text-charcoal/70 text-right">Stock</TableHead>
                      <TableHead className="font-display font-bold text-charcoal/70 text-right">Costo</TableHead>
                      <TableHead className="font-display font-bold text-charcoal/70 text-right">Precio</TableHead>
                      <TableHead className="font-display font-bold text-charcoal/70 text-right">Margen/u</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((it) => {
                      const margin = (it.price || 0) - (it.cost || 0);
                      const low = lowStock(it);
                      return (
                        <TableRow key={it.item_id} className="hover:bg-mint/40">
                          <TableCell className="font-display font-semibold text-charcoal">
                            <div className="flex items-center gap-2">
                              {it.name}
                              {low && (
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] uppercase tracking-wider">
                                  bajo stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-charcoal/65 text-sm">{it.sku || "—"}</TableCell>
                          <TableCell className="text-charcoal/65 text-sm">{it.category || "—"}</TableCell>
                          <TableCell className="text-right font-display font-semibold tabular-nums">
                            <span className={low ? "text-amber-600" : "text-charcoal"}>{it.stock}</span>
                            <span className="text-charcoal/40 text-xs"> / {it.reorder_level}</span>
                          </TableCell>
                          <TableCell className="text-right text-charcoal/75 tabular-nums">{fmtMoney(it.cost)}</TableCell>
                          <TableCell className="text-right text-charcoal/75 tabular-nums">{fmtMoney(it.price)}</TableCell>
                          <TableCell className={`text-right tabular-nums font-display font-semibold ${margin >= 0 ? "text-emerald-700" : "text-danger"}`}>
                            {fmtMoney(margin)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                data-testid={`edit-${it.item_id}`}
                                onClick={() => { setEditing(it); setDialogOpen(true); }}
                                className="h-8 w-8 grid place-items-center rounded-lg hover:bg-emerald-50 text-emerald-700 transition"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                data-testid={`delete-${it.item_id}`}
                                onClick={() => setDeleting(it)}
                                className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-50 text-danger transition"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Potential margin */}
        {summary?.count > 0 && (
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
            <CardContent className="p-5 flex items-center gap-4 flex-wrap">
              <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="font-display font-bold text-emerald-50 text-xs uppercase tracking-wider">Potencial de utilidad bruta</p>
                <p className="font-display font-bold text-3xl number-pop mt-0.5">
                  {fmtMoney(summary.potential_margin)}
                </p>
                <p className="text-emerald-100/80 text-sm mt-0.5">
                  Si vendes todo el inventario al precio configurado.
                </p>
              </div>
              <div className="text-right text-emerald-50/85 text-sm space-y-0.5">
                <p>A costo: <span className="font-semibold">{fmtMoney(summary.total_cost_value)}</span></p>
                <p>A precio: <span className="font-semibold">{fmtMoney(summary.total_retail_value)}</span></p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <InventoryItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará "{deleting?.name}" del inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-emerald-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-btn"
              onClick={handleDelete}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default InventoryPage;
