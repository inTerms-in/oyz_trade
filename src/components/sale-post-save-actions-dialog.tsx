"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircleMore, List } from "lucide-react";

interface SalePostSaveActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: number | null;
  onSendWhatsApp: (saleId: number) => void;
  onPrint: (saleId: number) => void;
  onReturnToList: () => void;
}

export function SalePostSaveActionsDialog({
  open,
  onOpenChange,
  saleId,
  onSendWhatsApp,
  onPrint,
  onReturnToList,
}: SalePostSaveActionsDialogProps) {
  const handleWhatsAppClick = () => {
    if (saleId) {
      onSendWhatsApp(saleId);
    }
    onOpenChange(false);
  };

  const handlePrintClick = () => {
    if (saleId) {
      onPrint(saleId);
    }
    onOpenChange(false);
  };

  const handleReturnToListClick = () => {
    onReturnToList();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sale Saved Successfully!</DialogTitle>
          <DialogDescription>
            What would you like to do next?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button onClick={handleWhatsAppClick} disabled={!saleId}>
            <MessageCircleMore className="mr-2 h-4 w-4" /> Send via WhatsApp
          </Button>
          <Button onClick={handlePrintClick} disabled={!saleId}>
            <Printer className="mr-2 h-4 w-4" /> Print Invoice
          </Button>
          <Button variant="outline" onClick={handleReturnToListClick}>
            <List className="mr-2 h-4 w-4" /> Return to Sales List
          </Button>
        </div>
        <DialogFooter>
          {/* No primary action here, as options are in the body */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}