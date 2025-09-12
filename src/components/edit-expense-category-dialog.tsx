"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExpenseCategory } from "@/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

const expenseCategoryFormSchema = z.object({
  CategoryName: z.string().min(2, {
    message: "Category name must be at least 2 characters.",
  }),
  Description: z.string().optional().nullable(),
});

type ExpenseCategoryFormValues = z.infer<typeof expenseCategoryFormSchema>;

interface EditExpenseCategoryDialogProps {
  category: ExpenseCategory;
  onCategoryUpdated: () => void;
}

export function EditExpenseCategoryDialog({ category, onCategoryUpdated }: EditExpenseCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategoryFormSchema),
    defaultValues: {
      CategoryName: category.CategoryName,
      Description: category.Description || "",
    },
  });

  useEffect(() => {
    form.reset({ 
      CategoryName: category.CategoryName, 
      Description: category.Description || "" 
    });
  }, [category, form]);

  async function onSubmit(values: ExpenseCategoryFormValues) {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("ExpenseCategoryMaster")
      .update({ 
        CategoryName: values.CategoryName, 
        Description: values.Description || null,
      })
      .eq("ExpenseCategoryId", category.ExpenseCategoryId);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update expense category", {
        description: error.message,
      });
    } else {
      toast.success("Expense category updated successfully!");
      onCategoryUpdated();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Expense Category (ID: {category.ExpenseCategoryId})</DialogTitle>
          <DialogDescription>
            Update the name and description for this expense category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
            <FormField
              control={form.control}
              name="CategoryName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput id="CategoryName" label="Category Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="Description"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="Description">Description (Optional)</Label>
                  <FormControl>
                    <Textarea
                      id="Description"
                      placeholder="e.g., Office supplies, utilities, travel expenses"
                      className="resize-y min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}