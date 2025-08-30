"use client";

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
  fontOptions?: string;
  font?: string;
  textAlign?: string;
  textPosition?: string;
  textMargin?: number;
  fontSize?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
}

const Barcode: React.FC<BarcodeProps> = ({ value, ...options }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        // Clear previous barcode to prevent issues on re-render
        ref.current.innerHTML = ''; 
        JsBarcode(ref.current, value, {
          format: "CODE128",
          displayValue: false, // Always false for BarcodeLabel, text is handled by P tags
          fontSize: 8, // Reduced font size for barcode text
          height: 25, // Reduced height to fit smaller label
          width: 1.2, // Slightly narrower bars
          margin: 0, // No extra margin around the barcode
          ...options,
        });
      } catch (e) {
        console.error("Barcode generation failed", e);
      }
    }
  }, [value, options]);

  return <svg ref={ref} />;
};

export default Barcode;