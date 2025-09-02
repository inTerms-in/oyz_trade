"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PurchaseReturnWithItems } from "@/types";

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

interface DeletePurchaseReturnAlertProps {
  purchaseReturn: PurchaseReturnWithItems;
  onPurchaseReturnDeleted: () => void;
}

export function DeletePurchaseReturnAlert({ purchaseReturn, onPurchaseReturnDeleted }: DeletePurchaseReturnAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    // First, reverse stock adjustments for each returned item
    for (const item of purchaseReturn.PurchaseReturnItem) {
      const { error: stockError } = await supabase
        .from("StockAdjustment")
        .insert({
          ItemId: item.ItemId,
          AdjustmentType: 'in', // Reverse the 'out' from return, so it's 'in'
          Quantity: item.Qty,
          Reason: `Purchase Return (Ref: ${purchaseReturn.ReferenceNo}) deleted - reversing stock adjustment`,
        });
      if (stockError) {
        console.error(`Failed to reverse stock for item ${item.ItemId}:`, stockError.message);
        // Decide if you want to stop deletion or continue. For now, log and continue.
      }
    }

    const { error } = await supabase
      .from("PurchaseReturn")
      .delete()
      .eq("PurchaseReturnId", purchaseReturn.PurchaseReturnId); // Removed user_id filter
    
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete purchase return", { description: error.message });
    } else {
      toast.success("Purchase return deleted successfully!");
      onPurchaseReturnDeleted();
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
            This action cannot be undone. This will permanently delete purchase return {purchaseReturn.ReferenceNo} (Refund: {formatCurrency(purchaseReturn.TotalRefundAmount)}) and reverse the stock adjustments for the returned items.
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