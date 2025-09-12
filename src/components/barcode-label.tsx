"use client";

import React from 'react';
import Barcode from "@/components/barcode";
import { generateItemCode } from "@/lib/utils";
import { ItemWithCategory } from "@/types";

interface BarcodeLabelProps {
  item: ItemWithCategory;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ item }) => {
  const itemCode = item.ItemCode || generateItemCode(item.CategoryMaster?.CategoryName, item.ItemId);
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex flex-col items-center justify-start text-center overflow-hidden h-full w-full">
      {/* Item Name: Adjusted height and font size */}
      <p className="text-[7px] font-semibold leading-tight w-full px-[1mm] h-[4mm] flex items-center justify-center">{item.ItemName}</p>
      {/* Barcode: Adjusted height */}
      <div className="flex items-center justify-center w-full h-[11.05mm] min-h-0">
        <Barcode value={item.Barcode || itemCode} />
      </div>
      {/* Item Code | Sell Price: Adjusted height and font size */}
      <p className="text-[6px] leading-tight w-full px-[1mm] h-[4mm] flex items-center justify-center">
        <span className="font-mono">{itemCode}</span> | <span className="font-semibold">{formatCurrency(item.SellPrice)}</span>
      </p>
    </div>
  );
};