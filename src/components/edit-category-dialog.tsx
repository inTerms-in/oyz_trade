"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Category } from "@/types";

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
import { Pencil } from "lucide-react";

const categoryFormSchema = z.object({
  CategoryName: z.string().min(2, {
    message: "Category name must be at least 2 characters.",
  }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface EditCategoryDialogProps {
  category: Category;
  onCategoryUpdated: () => void;
}

export function EditCategoryDialog({ category, onCategoryUpdated }: EditCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      CategoryName: category.CategoryName,
    },
  });

  useEffect(() => {
    form.reset({ CategoryName: category.CategoryName });
  }, [category, form]);

  async function onSubmit(values: CategoryFormValues) {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("CategoryMaster")
      .update({ CategoryName: values.CategoryName })
      .eq("CategoryId", category.CategoryId);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update category", {
        description: error.message,
      });
    } else {
      toast.success("Category updated successfully!");
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
          <DialogTitle>Edit Category (ID: {category.CategoryId})</DialogTitle>
          <DialogDescription>
            Update the name for this category.
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