import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// =====================================================
// Reporte PDF profesional con jsPDF nativo + autoTable
// =====================================================

const COLORS = {
  emerald: [29, 158, 117],     // #1D9E75
  emeraldDark: [15, 110, 86],  // #0F6E56
  mint: [225, 245, 238],       // #E1F5EE
  charcoal: [44, 44, 42],      // #2C2C2A
  amber: [239, 159, 39],       // #EF9F27
  info: [45, 123, 184],
  danger: [214, 69, 69],
  textMuted: [110, 115, 110],
  bg: [246, 251, 248],
  hairline: [225, 240, 232],
};

const STATUS_COLOR = {
  healthy: COLORS.emerald,
  risk: COLORS.amber,
  loss: COLORS.danger,
};

const STATUS_LABEL = {
  healthy: "Saludable",
  risk: "En riesgo",
  loss: "En pérdidas",
};

const fmtMoney = (v) => `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const fmtPct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;
const monthLabel = (period) => {
  const [y, m] = (period || "").split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  if (!y || !m) return period;
  return `${months[Math.max(0, parseInt(m, 10) - 1)]} ${y.slice(-2)}`;
};

// ----- Funciones de dibujo -----

const setFill = (pdf, color) => pdf.setFillColor(color[0], color[1], color[2]);
const setText = (pdf, color) => pdf.setTextColor(color[0], color[1], color[2]);
const setDraw = (pdf, color) => pdf.setDrawColor(color[0], color[1], color[2]);

const drawHeader = (pdf, opts) => {
  const { businessName, businessType, generatedAt, userName } = opts;
  // Banda superior
  setFill(pdf, COLORS.emeraldDark);
  pdf.rect(0, 0, 595, 90, "F");
  // Logo bg
  setFill(pdf, [255, 255, 255]);
  pdf.roundedRect(40, 25, 40, 40, 8, 8, "F");
  setText(pdf, COLORS.emerald);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("E", 60, 53, { align: "center" });

  setText(pdf, [255, 255, 255]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Econo Smart", 95, 45);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(220, 240, 232);
  pdf.text("Inteligencia financiera para PyMEs", 95, 60);

  // Right - business
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  setText(pdf, [255, 255, 255]);
  pdf.text(businessName, 555, 45, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(220, 240, 232);
  pdf.text(`${businessType || "Negocio"} · Reporte al ${generatedAt}`, 555, 60, { align: "right" });
  if (userName) {
    pdf.text(`Para: ${userName}`, 555, 73, { align: "right" });
  }
};

const drawFooter = (pdf, pageNumber, totalPages, generatedAt) => {
  setDraw(pdf, COLORS.hairline);
  pdf.setLineWidth(0.5);
  pdf.line(40, 800, 555, 800);

  setText(pdf, COLORS.textMuted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Econo Smart · ${generatedAt}`, 40, 815);
  pdf.text(`Página ${pageNumber} de ${totalPages}`, 555, 815, { align: "right" });
  pdf.setFont("helvetica", "italic");
  pdf.text("Reporte generado automáticamente. Las cifras provienen de los datos ingresados por el usuario.", 297.5, 825, { align: "center" });
};

const drawSectionTitle = (pdf, y, title, subtitle) => {
  setFill(pdf, COLORS.emerald);
  pdf.roundedRect(40, y, 4, 18, 2, 2, "F");
  setText(pdf, COLORS.charcoal);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(title, 52, y + 13);
  if (subtitle) {
    setText(pdf, COLORS.textMuted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(subtitle, 52, y + 26);
    return y + 40;
  }
  return y + 32;
};

const drawHealthBanner = (pdf, y, status) => {
  const color = STATUS_COLOR[status] || STATUS_COLOR.healthy;
  setFill(pdf, color);
  pdf.roundedRect(40, y, 515, 60, 8, 8, "F");
  // White circle
  setFill(pdf, [255, 255, 255, 0.18]);
  // simulate alpha by mixing
  pdf.setFillColor(255, 255, 255);
  pdf.circle(70, y + 30, 14, "F");
  setText(pdf, color);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("✓", 70, y + 36, { align: "center" });

  setText(pdf, [255, 255, 255]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("ESTADO DEL NEGOCIO", 95, y + 22);
  pdf.setFontSize(20);
  pdf.text(STATUS_LABEL[status] || STATUS_LABEL.healthy, 95, y + 42);
  return y + 75;
};

const drawKpiCard = (pdf, x, y, w, h, label, value, subtitle, accent = COLORS.emerald) => {
  // Card bg
  setFill(pdf, [255, 255, 255]);
  setDraw(pdf, COLORS.hairline);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(x, y, w, h, 6, 6, "FD");

  // Accent bar
  setFill(pdf, accent);
  pdf.roundedRect(x, y, 3, h, 1.5, 1.5, "F");

  // Label
  setText(pdf, COLORS.textMuted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text(label.toUpperCase(), x + 12, y + 18);

  // Value
  setText(pdf, COLORS.charcoal);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(String(value), x + 12, y + 40);

  if (subtitle) {
    setText(pdf, COLORS.textMuted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(subtitle, x + 12, y + 55);
  }
};

const drawKpiGrid = (pdf, y, kpis, biz) => {
  const W = 515 / 2 - 4;
  const H = 70;
  const left = 40, right = 40 + W + 8;

  drawKpiCard(pdf, left, y,         W, H,
              "Ingresos mensuales", fmtMoney(kpis.revenue),
              `${biz.quantity_sold} unidades vendidas`, COLORS.emerald);

  drawKpiCard(pdf, right, y,        W, H,
              "Utilidad neta", fmtMoney(kpis.profit),
              kpis.profit >= 0 ? "Tu negocio gana dinero" : "Operando a pérdida",
              kpis.profit >= 0 ? COLORS.emerald : COLORS.danger);

  drawKpiCard(pdf, left, y + H + 8, W, H,
              "Margen de ganancia", fmtPct(kpis.margin),
              kpis.margin >= 0.20 ? "Saludable (>20%)" : "Por debajo del objetivo",
              kpis.margin >= 0.20 ? COLORS.emerald : COLORS.amber);

  drawKpiCard(pdf, right, y + H + 8, W, H,
              "Punto de equilibrio",
              kpis.breakeven_units ? `${kpis.breakeven_units} unidades` : "—",
              kpis.breakeven_revenue ? `${fmtMoney(kpis.breakeven_revenue)} en ventas` : "Sin margen de contribución",
              COLORS.info);

  return y + (H + 8) * 2;
};

// ----- Construcción del PDF -----

async function buildPdf(report) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = 595;
  const generatedDate = new Date(report.generated_at).toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  const biz = report.business;
  const k = report.kpis;
  const snaps = report.snapshots || [];
  const items = report.inventory || [];
  const bench = report.benchmark;

  // ============== PÁGINA 1: PORTADA + KPIs ==============
  drawHeader(pdf, {
    businessName: biz.business_name,
    businessType: biz.business_type,
    generatedAt: generatedDate,
    userName: report.user?.name,
  });

  let y = 110;
  y = drawSectionTitle(pdf, y, "Resumen ejecutivo", "Estado y métricas clave del negocio");
  y = drawHealthBanner(pdf, y, k.status);
  y = drawKpiGrid(pdf, y, k, biz);

  // Resumen narrativo
  y += 10;
  setFill(pdf, COLORS.mint);
  pdf.roundedRect(40, y, 515, 64, 6, 6, "F");
  setText(pdf, COLORS.charcoal);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const narrative = `Este reporte resume el desempeño financiero de ${biz.business_name} con base en los datos ingresados. ` +
    `Tu margen actual es ${fmtPct(k.margin)}` +
    (bench ? ` (industria: ${fmtPct(bench.margin)})` : "") +
    `. Punto de equilibrio: ${k.breakeven_units || "—"} unidades.`;
  const lines = pdf.splitTextToSize(narrative, 495);
  pdf.text(lines, 50, y + 18);

  // ============== PÁGINA 2: COSTOS + INVENTARIO + BENCHMARK ==============
  pdf.addPage();
  drawHeader(pdf, {
    businessName: biz.business_name,
    businessType: biz.business_type,
    generatedAt: generatedDate,
    userName: report.user?.name,
  });

  y = 110;
  y = drawSectionTitle(pdf, y, "Composición financiera", "Detalle de ingresos, costos e inventario");

  autoTable(pdf, {
    startY: y,
    head: [["Concepto", "Monto", "Porcentaje sobre ingresos"]],
    body: [
      ["Ingresos totales", fmtMoney(k.revenue), "100.0%"],
      ["Costos variables", fmtMoney(k.variable_costs), k.revenue ? fmtPct(k.variable_costs / k.revenue) : "—"],
      ["Costos fijos", fmtMoney(k.fixed_costs), k.revenue ? fmtPct(k.fixed_costs / k.revenue) : "—"],
      ["Costos totales", fmtMoney(k.total_costs), k.revenue ? fmtPct(k.total_costs / k.revenue) : "—"],
      ["Utilidad neta", fmtMoney(k.profit), fmtPct(k.margin)],
      ["Margen de contribución / unidad", fmtMoney(k.contribution_margin_per_unit), "—"],
    ],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, lineColor: COLORS.hairline, lineWidth: 0.4 },
    headStyles: { fillColor: COLORS.emerald, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    alternateRowStyles: { fillColor: [250, 253, 251] },
    margin: { left: 40, right: 40 },
  });
  y = pdf.lastAutoTable.finalY + 20;

  // Inventario operativo
  y = drawSectionTitle(pdf, y, "Inventario y operación", "Niveles actuales y rotación");
  autoTable(pdf, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Inventario actual", `${biz.inventory} unidades`],
      ["Cantidad vendida al mes", `${biz.quantity_sold} unidades`],
      ["Rotación de inventario", k.inventory_turnover_ratio ? `${k.inventory_turnover_ratio}x al mes` : "—"],
      ["Inventario alto (>1.5x ventas)", k.inventory_high ? "Sí — considera promociones" : "No"],
    ],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5 },
    columnStyles: { 0: { textColor: COLORS.textMuted }, 1: { halign: "right", fontStyle: "bold", textColor: COLORS.charcoal } },
    margin: { left: 40, right: 40 },
  });
  y = pdf.lastAutoTable.finalY + 16;

  // Benchmark
  if (bench) {
    y = drawSectionTitle(pdf, y, "Comparativo de industria", `Sector: ${bench.label}`);
    const diff = k.margin - bench.margin;
    const diffLabel = diff >= 0
      ? `Estás ${fmtPct(Math.abs(diff))} por encima del promedio del sector.`
      : `Estás ${fmtPct(Math.abs(diff))} por debajo del promedio del sector.`;
    autoTable(pdf, {
      startY: y,
      head: [["Métrica", "Tu negocio", "Promedio sector"]],
      body: [
        ["Margen de ganancia", fmtPct(k.margin), fmtPct(bench.margin)],
        ["Rotación inventario (referencia)",
          k.inventory_turnover_ratio ? `${k.inventory_turnover_ratio}x` : "—",
          bench.inv_turnover ? `${bench.inv_turnover}x` : "n/a"],
      ],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, lineColor: COLORS.hairline, lineWidth: 0.4 },
      headStyles: { fillColor: COLORS.info, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });
    y = pdf.lastAutoTable.finalY + 8;

    setFill(pdf, diff >= 0 ? COLORS.mint : [254, 240, 220]);
    pdf.roundedRect(40, y, 515, 30, 6, 6, "F");
    setText(pdf, diff >= 0 ? COLORS.emeraldDark : [168, 106, 20]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text(diffLabel, 52, y + 19);
  }

  // ============== PÁGINA 3: HISTÓRICO ==============
  if (snaps.length > 0) {
    pdf.addPage();
    drawHeader(pdf, {
      businessName: biz.business_name,
      businessType: biz.business_type,
      generatedAt: generatedDate,
      userName: report.user?.name,
    });
    y = 110;
    y = drawSectionTitle(pdf, y, "Histórico mensual", `Evolución de los últimos ${snaps.length} meses`);

    autoTable(pdf, {
      startY: y,
      head: [["Mes", "Ingresos", "Utilidad", "Margen", "Estado"]],
      body: snaps.slice().reverse().map((s) => [
        monthLabel(s.period),
        fmtMoney(s.revenue),
        fmtMoney(s.profit),
        fmtPct(s.margin),
        STATUS_LABEL[s.status] || s.status,
      ]),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, lineColor: COLORS.hairline, lineWidth: 0.4 },
      headStyles: { fillColor: COLORS.emerald, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      alternateRowStyles: { fillColor: [250, 253, 251] },
      margin: { left: 40, right: 40 },
    });
    y = pdf.lastAutoTable.finalY + 20;

    // Mini-resumen tendencia
    if (snaps.length >= 2) {
      const first = snaps[0], last = snaps[snaps.length - 1];
      const revGrowth = first.revenue ? ((last.revenue - first.revenue) / first.revenue) : 0;
      const profGrowth = first.profit ? ((last.profit - first.profit) / Math.abs(first.profit)) : 0;

      setFill(pdf, COLORS.mint);
      pdf.roundedRect(40, y, 515, 40, 6, 6, "F");
      setText(pdf, COLORS.emeraldDark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Tendencia", 50, y + 16);
      setText(pdf, COLORS.charcoal);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.text(
        `Crecimiento de ingresos: ${revGrowth >= 0 ? "+" : ""}${fmtPct(revGrowth)} · ` +
        `Crecimiento de utilidad: ${profGrowth >= 0 ? "+" : ""}${fmtPct(profGrowth)}`,
        50, y + 30
      );
    }
  }

  // ============== PÁGINA 4: INVENTARIO DETALLADO ==============
  if (items.length > 0) {
    pdf.addPage();
    drawHeader(pdf, {
      businessName: biz.business_name,
      businessType: biz.business_type,
      generatedAt: generatedDate,
      userName: report.user?.name,
    });
    y = 110;
    y = drawSectionTitle(pdf, y, "Catálogo de productos", `${items.length} productos en inventario`);

    autoTable(pdf, {
      startY: y,
      head: [["Producto", "SKU", "Categoría", "Stock", "Mínimo", "Costo", "Precio", "Margen/u"]],
      body: items.map((it) => {
        const margin = (it.price || 0) - (it.cost || 0);
        const low = it.stock <= it.reorder_level;
        return [
          (low ? "⚠ " : "") + (it.name || ""),
          it.sku || "—",
          it.category || "—",
          String(it.stock),
          String(it.reorder_level),
          fmtMoney(it.cost),
          fmtMoney(it.price),
          fmtMoney(margin),
        ];
      }),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, lineColor: COLORS.hairline, lineWidth: 0.4 },
      headStyles: { fillColor: COLORS.emerald, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      columnStyles: {
        3: { halign: "right" }, 4: { halign: "right" },
        5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
      },
      alternateRowStyles: { fillColor: [250, 253, 251] },
      margin: { left: 40, right: 40 },
    });
    y = pdf.lastAutoTable.finalY + 16;

    // Inventory totals
    const totalUnits = items.reduce((s, i) => s + (parseInt(i.stock, 10) || 0), 0);
    const totalCost = items.reduce((s, i) => s + (parseInt(i.stock, 10) || 0) * (parseFloat(i.cost) || 0), 0);
    const totalRetail = items.reduce((s, i) => s + (parseInt(i.stock, 10) || 0) * (parseFloat(i.price) || 0), 0);
    const lowStock = items.filter((i) => i.stock <= i.reorder_level);

    autoTable(pdf, {
      startY: y,
      head: [["Resumen del inventario", ""]],
      body: [
        ["Productos totales", String(items.length)],
        ["Unidades en stock", String(totalUnits)],
        ["Valor a costo", fmtMoney(totalCost)],
        ["Valor a precio de venta", fmtMoney(totalRetail)],
        ["Potencial de utilidad bruta", fmtMoney(totalRetail - totalCost)],
        ["Productos con bajo stock", `${lowStock.length}${lowStock.length ? ": " + lowStock.map((i) => i.name).join(", ") : ""}`],
      ],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 5 },
      headStyles: { fillColor: COLORS.mint, textColor: COLORS.emeraldDark, fontStyle: "bold", fontSize: 10 },
      columnStyles: { 0: { textColor: COLORS.textMuted }, 1: { halign: "right", fontStyle: "bold", textColor: COLORS.charcoal } },
      margin: { left: 40, right: 40 },
    });
  }

  // ============== PÁGINA FINAL: RECOMENDACIONES IA ==============
  if (report.analysis) {
    pdf.addPage();
    drawHeader(pdf, {
      businessName: biz.business_name,
      businessType: biz.business_type,
      generatedAt: generatedDate,
      userName: report.user?.name,
    });
    y = 110;

    const a = report.analysis;
    y = drawSectionTitle(pdf, y, "Análisis y recomendaciones",
      a.ai ? "Generado con IA (Gemini) — recomendaciones personalizadas" : "Recomendaciones basadas en reglas");

    // Resumen
    if (a.summary) {
      setFill(pdf, COLORS.mint);
      const summaryLines = pdf.splitTextToSize(a.summary, 495);
      const sumH = summaryLines.length * 12 + 16;
      pdf.roundedRect(40, y, 515, sumH, 6, 6, "F");
      setText(pdf, COLORS.charcoal);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(summaryLines, 50, y + 16);
      y += sumH + 15;
    }

    // Strengths + risks
    if ((a.strengths?.length || 0) + (a.risks?.length || 0) > 0) {
      const halfW = (515 - 8) / 2;

      const colHeight = (arr) => 28 + (arr || []).reduce((sum, t) => {
        return sum + pdf.splitTextToSize(t, halfW - 16).length * 11;
      }, 0);
      const blockHeight = Math.max(colHeight(a.strengths), colHeight(a.risks), 60);

      // Strengths
      setFill(pdf, [240, 250, 245]);
      setDraw(pdf, COLORS.hairline);
      pdf.roundedRect(40, y, halfW, blockHeight, 6, 6, "FD");
      setText(pdf, COLORS.emeraldDark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("FORTALEZAS", 50, y + 16);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      setText(pdf, COLORS.charcoal);
      let ty = y + 30;
      (a.strengths || []).forEach((s) => {
        const sLines = pdf.splitTextToSize("• " + s, halfW - 20);
        pdf.text(sLines, 50, ty);
        ty += sLines.length * 11;
      });

      // Risks
      setFill(pdf, [254, 244, 232]);
      pdf.roundedRect(40 + halfW + 8, y, halfW, blockHeight, 6, 6, "FD");
      setText(pdf, [168, 106, 20]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("RIESGOS", 50 + halfW + 8, y + 16);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      setText(pdf, COLORS.charcoal);
      let ry = y + 30;
      (a.risks || []).forEach((r) => {
        const rLines = pdf.splitTextToSize("• " + r, halfW - 20);
        pdf.text(rLines, 50 + halfW + 8, ry);
        ry += rLines.length * 11;
      });

      y += blockHeight + 16;
    }

    // Recommendations
    if ((a.recommendations || []).length > 0) {
      autoTable(pdf, {
        startY: y,
        head: [["#", "Recomendación", "Prioridad"]],
        body: (a.recommendations || []).map((r, i) => [
          String(i + 1),
          (r.title ? `${r.title}\n` : "") + (r.detail || "") + (r.impact ? `\n→ ${r.impact}` : ""),
          (r.priority || "media").toUpperCase(),
        ]),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 7, lineColor: COLORS.hairline, lineWidth: 0.4, valign: "top" },
        headStyles: { fillColor: COLORS.emerald, textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          0: { halign: "center", cellWidth: 24, fontStyle: "bold", textColor: COLORS.emeraldDark },
          2: { halign: "center", cellWidth: 60, fontStyle: "bold", fontSize: 8 },
        },
        didParseCell: (d) => {
          if (d.section === "body" && d.column.index === 2) {
            const v = (d.cell.raw || "").toLowerCase();
            if (v.includes("alta")) {
              d.cell.styles.fillColor = [254, 232, 232]; d.cell.styles.textColor = COLORS.danger;
            } else if (v.includes("media")) {
              d.cell.styles.fillColor = [254, 244, 220]; d.cell.styles.textColor = [168, 106, 20];
            } else {
              d.cell.styles.fillColor = COLORS.mint; d.cell.styles.textColor = COLORS.emeraldDark;
            }
          }
        },
        margin: { left: 40, right: 40 },
      });
      y = pdf.lastAutoTable.finalY + 16;
    }

    // 30 day plan
    if ((a.next_30_days || []).length > 0) {
      // Si no entra, nueva página
      if (y > 680) {
        pdf.addPage();
        drawHeader(pdf, {
          businessName: biz.business_name,
          businessType: biz.business_type,
          generatedAt: generatedDate,
          userName: report.user?.name,
        });
        y = 110;
      }
      y = drawSectionTitle(pdf, y, "Plan de los próximos 30 días", "Acciones concretas para ejecutar");
      autoTable(pdf, {
        startY: y,
        body: (a.next_30_days || []).map((step, i) => [String(i + 1), step]),
        theme: "plain",
        styles: { font: "helvetica", fontSize: 10, cellPadding: 7, valign: "top" },
        columnStyles: {
          0: { cellWidth: 28, halign: "center", fillColor: COLORS.emerald, textColor: [255, 255, 255], fontStyle: "bold" },
          1: { textColor: COLORS.charcoal },
        },
        margin: { left: 40, right: 40 },
      });
    }
  }

  // ============== Footers en todas las páginas ==============
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(pdf, i, totalPages, generatedDate);
  }

  return pdf;
}

// =====================================================
// Componente
// =====================================================
const PdfExportButton = ({ filename = "econo-smart-reporte.pdf" }) => {
  const [loading, setLoading] = useState(false);

  const exportPdf = async () => {
    setLoading(true);
    try {
      // 1) Bundle backend
      const { data: report } = await api.get("/business/report");

      // 2) Análisis IA: intenta usar lo que el dashboard ya generó si el usuario lo pidió
      try {
        const { data: analysis } = await api.post("/business/analyze");
        report.analysis = analysis;
      } catch (e) {
        // sin IA, sigue sin análisis
      }

      // 3) Construir PDF
      const pdf = await buildPdf(report);

      const safeName = (report.business?.business_name || "negocio")
        .replace(/[^\w\d\-]+/g, "_").slice(0, 40);
      pdf.save(`econo-smart-${safeName}.pdf`);
      toast.success("Reporte PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      data-testid="export-pdf-btn"
      onClick={exportPdf}
      disabled={loading}
      variant="outline"
      className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hidden md:inline-flex"
    >
      {loading
        ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        : <Download className="h-4 w-4 mr-1.5" />}
      {loading ? "Generando..." : "Exportar PDF"}
    </Button>
  );
};

export default PdfExportButton;
