"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { toast } from "sonner";
import { format } from "date-fns"; // Added format import

interface ReportExportButtonsProps {
  data: any[];
  columns: { header: string; accessorKey: string }[];
  reportTitle: string;
  fileName: string;
}

export function ReportExportButtons({ data, columns, reportTitle, fileName }: ReportExportButtonsProps) {
  const exportToPdf = () => {
    if (!data || data.length === 0) {
      toast.info("No data to export to PDF.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(reportTitle, 14, 20);

    const tableColumn = columns.map(col => col.header);
    const tableRows = data.map(row => columns.map(col => {
      let value = row[col.accessorKey];
      // Handle nested accessors like "CustomerMaster.CustomerName"
      if (col.accessorKey.includes('.')) {
        const keys = col.accessorKey.split('.');
        value = keys.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : null, row);
      }
      // Format currency if applicable (assuming 'amount' in key or similar)
      if (typeof value === 'number' && col.header.includes('Amount')) {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(value);
      }
      // Format dates
      if (col.accessorKey.includes('Date') && value) {
        try {
          return format(new Date(value), "PPP");
        } catch (e) {
          return value;
        }
      }
      return value !== null && value !== undefined ? String(value) : '';
    }));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.save(`${fileName}.pdf`);
    toast.success("Report exported to PDF successfully!");
  };

  const exportToCsv = () => {
    if (!data || data.length === 0) {
      toast.info("No data to export to CSV.");
      return;
    }

    const csvData = data.map(row => {
      const newRow: { [key: string]: any } = {};
      columns.forEach(col => {
        let value = row[col.accessorKey];
        if (col.accessorKey.includes('.')) {
          const keys = col.accessorKey.split('.');
          value = keys.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : null, row);
        }
        if (typeof value === 'number' && col.header.includes('Amount')) {
          value = new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(value);
        }
        if (col.accessorKey.includes('Date') && value) {
          try {
            value = format(new Date(value), "PPP");
          } catch (e) {
            // Keep original value if date formatting fails
          }
        }
        newRow[col.header] = value !== null && value !== undefined ? String(value) : '';
      });
      return newRow;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported to CSV successfully!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPdf}>Export to PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCsv}>Export to Excel (CSV)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}