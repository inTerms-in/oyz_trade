"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-provider"; // Import useAuth


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

const categoryFormSchema = z.object({
  CategoryName: z.string().min(2, {
    message: "Category name must be at least 2 characters.",
  }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
  onCategoryAdded: () => void;
}

export function AddCategoryDialog({ open, onOpenChange, initialValue = "", onCategoryAdded }: AddCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth(); // Use useAuth
  

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onChange",
    defaultValues: {
      CategoryName: initialValue,
    },
  });
  
  useEffect(() => {
    if (open) {
      form.reset({ CategoryName: initialValue });
    }
  }, [open, initialValue, form]);

  const { formState: { isValid } } = form;

  async function onSubmit(values: CategoryFormValues) {
    if (!user?.id) return toast.error("Authentication error. Please log in again."); // Ensure user is logged in
    setIsSubmitting(true);

    // Proceed with Supabase if online
    const { error } = await supabase
      .from("CategoryMaster")
      .insert([{ 
        CategoryName: values.CategoryName, 
        user_id: user.id, // Add user_id
      }])
      .select();

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add category", {
        description: error.message,
      });
    } else {
      toast.success(`Category "${values.CategoryName}" added successfully!`);
      onCategoryAdded();
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Enter the name for the new category.
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