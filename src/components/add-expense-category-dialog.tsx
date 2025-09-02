"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Removed useAuth import as user.id is no longer used for filtering or insert

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const expenseCategoryFormSchema = z.object({
  CategoryName: z.string().min(2, {
    message: "Category name must be at least 2 characters.",
  }),
  Description: z.string().optional().nullable(),
});

type ExpenseCategoryFormValues = z.infer<typeof expenseCategoryFormSchema>;

interface AddExpenseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
  onCategoryAdded: () => void;
}

export function AddExpenseCategoryDialog({ open, onOpenChange, initialValue = "", onCategoryAdded }: AddExpenseCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed user from useAuth

  const form = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategoryFormSchema),
    mode: "onChange",
    defaultValues: {
      CategoryName: initialValue,
      Description: "",
    },
  });
  
  useEffect(() => {
    if (open) {
      form.reset({ CategoryName: initialValue, Description: "" });
    }
  }, [open, initialValue, form]);

  const { formState: { isValid } } = form;

  async function onSubmit(values: ExpenseCategoryFormValues) {
    setIsSubmitting(true);

    const { error } = await supabase
      .from("ExpenseCategoryMaster")
      .insert([{ 
        CategoryName: values.CategoryName, 
        Description: values.Description || null,
      }])
      .select();

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add expense category", {
        description: error.message,
      });
    } else {
      toast.success(`Expense category "${values.CategoryName}" added successfully!`);
      onCategoryAdded();
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense Category</DialogTitle>
          <DialogDescription>
            Enter the name and an optional description for the new expense category.
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
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}