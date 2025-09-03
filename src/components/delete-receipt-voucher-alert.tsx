"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReceiptVoucherWithSettlements } from "@/types";
import { format } from "date-fns";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteReceiptVoucherAlertProps {
  receiptVoucher: ReceiptVoucherWithSettlements;
  onReceiptVoucherDeleted: () => void;
}

export function DeleteReceiptVoucherAlert({ receiptVoucher, onReceiptVoucherDeleted }: DeleteReceiptVoucherAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    // Deleting the receipt voucher will automatically cascade delete its settlements
    // and the triggers on receivable_settlements will update the Receivables balances.
    const { error } = await supabase
      .from("receipt_vouchers")
      .delete()
      .eq("ReceiptVoucherId", receiptVoucher.ReceiptVoucherId);
    
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete receipt voucher", { description: error.message });
    } else {
      toast.success("Receipt voucher deleted successfully!");
      onReceiptVoucherDeleted();
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete Receipt Voucher{" "}
            <span className="font-semibold">{receiptVoucher.ReferenceNo}</span> (Amount:{" "}
            <span className="font-semibold">{formatCurrency(receiptVoucher.AmountReceived)}</span> on{" "}
            <span className="font-semibold">{format(new Date(receiptVoucher.ReceiptDate), "PPP")}</span>).
            All associated receivable settlements will also be removed, which will reverse any payments made to outstanding receivables.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}