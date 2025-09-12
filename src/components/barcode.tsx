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
        ref.current.innerHTML = ''; 
        // Check if the value is suitable for barcode generation
        if (value && value.trim() !== '') {
          JsBarcode(ref.current, value, {
            format: "CODE128",
            displayValue: false, // Always false for BarcodeLabel, text is handled by P tags
            fontSize: 8, // Reduced font size for barcode text
            height: 25, // Reduced height to fit smaller label
            width: 1.2, // Slightly narrower bars
            margin: 0, // No extra margin around the barcode
            ...options,
          });
        } else {
          // Render a placeholder if no valid barcode value
          ref.current.innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#999">No Barcode</text>';
        }
      } catch (e) {
        console.error("Barcode generation failed", e);
        // Fallback to text on error
        if (ref.current) {
          ref.current.innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#999">Error</text>';
        }
      }
    }
  }, [value, options]);

  return <svg ref={ref} />;
};

export default Barcode;