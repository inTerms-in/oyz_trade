"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
}

const QR_BOX_SIZE = 250;
const READER_ID = "reader";

export function BarcodeScannerDialog({ open, onOpenChange, onScanSuccess }: BarcodeScannerDialogProps) {
  const html5QrCodeScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open) {
      // Dialog is closing, stop the scanner if it's running
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.stop(); // Removed .catch()
        html5QrCodeScannerRef.current = null;
      }
      return;
    }

    // Dialog is opening
    let scannerInstance: Html5Qrcode | null = null;
    let isScanning = false; // Flag to prevent multiple scan successes

    const startScanner = async () => {
      try {
        // Ensure the element exists before creating Html5Qrcode instance
        const readerElement = document.getElementById(READER_ID);
        if (!readerElement) {
          console.error(`HTML Element with id=${READER_ID} not found. Scanner cannot start.`);
          return;
        }

        scannerInstance = new Html5Qrcode(READER_ID);
        html5QrCodeScannerRef.current = scannerInstance; // Store instance in ref

        await scannerInstance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.min(minEdge, QR_BOX_SIZE);
              return { width: qrboxSize, height: qrboxSize };
            },
          },
          (decodedText, _decodedResult) => {
            if (!isScanning) { // Only process the first successful scan
              isScanning = true;
              onScanSuccess(decodedText);
              stopScanner();
            }
          },
          (_errorMessage) => {
            // parse error, ignore.
          }
        );
        console.log("Barcode scanner started successfully.");
      } catch (err) {
        console.error("Unable to start scanning.", err);
        // If start fails, ensure the scanner instance is cleared
        if (scannerInstance) {
          scannerInstance.clear(); // Removed .catch()
          html5QrCodeScannerRef.current = null;
        }
      }
    };

    const stopScanner = () => {
      if (scannerInstance) {
        scannerInstance.stop(); // Removed .then().catch()
        console.log("Barcode scanner stopped.");
        html5QrCodeScannerRef.current = null; // Clear the instance after stopping
      }
    };

    // Use a setTimeout to ensure the DOM element is rendered
    const timeoutId = setTimeout(startScanner, 100); // Small delay

    // Cleanup function for useEffect
    return () => {
      clearTimeout(timeoutId); // Clear timeout if component unmounts before it fires
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.stop(); // Removed .catch()
        html5QrCodeScannerRef.current = null;
      }
    };
  }, [open, onScanSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>Point your camera at a barcode.</DialogDescription>
        </DialogHeader>
        <div id={READER_ID} className="w-full aspect-square"></div>
      </DialogContent>
    </Dialog>
  );
}