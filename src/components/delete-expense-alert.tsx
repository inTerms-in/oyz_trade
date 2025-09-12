"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Expense } from "@/types";
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

interface DeleteExpenseAlertProps {
  expense: Expense;
  onExpenseDeleted: () => void;
}

export function DeleteExpenseAlert({ expense, onExpenseDeleted }: DeleteExpenseAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const { error } = await supabase
      .from("Expenses")
      .delete()
      .eq("ExpenseId", expense.ExpenseId);
    
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete expense", {
        description: error.message,
      });
    } else {
      toast.success("Expense deleted successfully!");
      onExpenseDeleted();
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
            This action cannot be undone. This will permanently delete the expense of{" "}
            <span className="font-semibold">{formatCurrency(expense.Amount)}</span> on{" "}
            <span className="font-semibold">{format(new Date(expense.ExpenseDate), "PPP")}</span>{" "}
            {expense.ExpenseCategoryMaster?.CategoryName ? `for category "${expense.ExpenseCategoryMaster.CategoryName}"` : ""}.
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