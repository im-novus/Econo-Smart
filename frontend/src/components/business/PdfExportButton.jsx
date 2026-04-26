import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PdfExportButton = ({ targetId = "dashboard-export-target", filename = "econo-smart-reporte.pdf" }) => {
  const [loading, setLoading] = useState(false);

  const exportPdf = async () => {
    setLoading(true);
    try {
      const target = document.getElementById(targetId);
      if (!target) {
        toast.error("No se encontró el contenido a exportar.");
        return;
      }
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(target, {
        scale: 1.6,
        useCORS: true,
        backgroundColor: "#F6FBF8",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      const pdfWidth = 595.28;  // A4 width pt
      const pdfHeight = 841.89; // A4 height pt
      const pdf = new jsPDF("p", "pt", "a4");

      const imgRatio = canvas.height / canvas.width;
      const imgWidth = pdfWidth - 40;
      const imgHeight = imgWidth * imgRatio;

      let position = 20;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "JPEG", 20, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 40);

      while (heightLeft > 0) {
        pdf.addPage();
        position = -(imgHeight - heightLeft) + 20;
        pdf.addImage(imgData, "JPEG", 20, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 40);
      }

      pdf.save(filename);
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
