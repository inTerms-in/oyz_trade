"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaleWithItems } from "@/types"; // Changed from Sale

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

interface DeleteSaleAlertProps {
  sale: SaleWithItems; // Changed type to SaleWithItems
  onSaleDeleted: () => void;
}

export function DeleteSaleAlert({ sale, onSaleDeleted }: DeleteSaleAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    const { error } = await supabase
      .from("Sales")
      .delete()
      .eq("SaleId", sale.SaleId);
    
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete sale", { description: error.message });
    } else {
      toast.success("Sale deleted successfully!");
      onSaleDeleted();
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
            This action cannot be undone. This will permanently delete sale {sale.ReferenceNo ? `${sale.ReferenceNo} for ` : `for "${sale.CustomerMaster?.CustomerName || 'N/A'}" on ${new Date(sale.SaleDate).toLocaleDateString()}`} and all its items.
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