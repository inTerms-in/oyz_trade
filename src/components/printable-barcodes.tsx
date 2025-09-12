"use client";

import React from "react";
import { BarcodeLabel } from "./barcode-label";
import { PrintableItem } from "@/types";

interface PrintableBarcodesProps {
  itemsToPrint: PrintableItem[];
}

export const PrintableBarcodes = React.forwardRef<HTMLDivElement, PrintableBarcodesProps>(
  ({ itemsToPrint }, ref) => {
    // Flatten the itemsToPrint array based on quantityToPrint
    const allLabels = itemsToPrint.flatMap(item => 
      Array.from({ length: item.quantityToPrint }, (_, i) => ({ ...item, uniqueKey: `${item.ItemId}-${i}` }))
    );

    return (
      <div ref={ref} className="print-only">
        {/* This div will be styled as a grid in index.css for print */}
        <div className="print-grid-container"> 
          {allLabels.map((item) => (
            <BarcodeLabel key={item.uniqueKey} item={item} />
          ))}
        </div>
      </div>
    );
  }
);