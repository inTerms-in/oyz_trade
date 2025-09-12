"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PurchaseWithItems } from "@/types"; // Changed from Purchase

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

interface DeletePurchaseAlertProps {
  purchase: PurchaseWithItems; // Changed type to PurchaseWithItems
  onPurchaseDeleted: () => void;
}

export function DeletePurchaseAlert({ purchase, onPurchaseDeleted }: DeletePurchaseAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    const { error } = await supabase
      .from("Purchase")
      .delete()
      .eq("PurchaseId", purchase.PurchaseId);
    
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete purchase", { description: error.message });
    } else {
      toast.success("Purchase deleted successfully!");
      onPurchaseDeleted();
    }
  }

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
            This action cannot be undone. This will permanently delete purchase {purchase.ReferenceNo ? `${purchase.ReferenceNo} from ` : `from "${purchase.SupplierMaster?.SupplierName || 'N/A'}" on ${new Date(purchase.PurchaseDate).toLocaleDateString()}`} and all its items.
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