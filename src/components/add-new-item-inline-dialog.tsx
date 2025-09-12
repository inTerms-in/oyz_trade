"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Category, Item } from "@/types";
// Removed useAuth import as user.id is no longer used for filtering


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
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import {
  SelectItem,
} from "@/components/ui/select";

const itemFormSchema = z.object({
  ItemName: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  CategoryId: z.coerce.number({ required_error: "Please select a category." }),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface AddNewItemInlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItemName?: string;
  onItemAdded: (newItem: Item) => void;
}

export function AddNewItemInlineDialog({
  open,
  onOpenChange,
  initialItemName = "",
  onItemAdded,
}: AddNewItemInlineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  // Removed user from useAuth
  

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      ItemName: initialItemName,
    },
  });

  useEffect(() => {
    if (initialItemName) {
      form.setValue("ItemName", initialItemName);
    }
  }, [initialItemName, form]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from("CategoryMaster").select("*")
      .order("CategoryName");
      if (data) {
        setCategories(data);
        if (data.length > 0 && !form.getValues("CategoryId")) {
          form.setValue("CategoryId", data[0].CategoryId, { shouldValidate: true });
        }
      }
    }
    if (open) {
      fetchCategories();
    }
  }, [open, form]);

  async function onSubmit(values: ItemFormValues) {
    setIsSubmitting(true);

    // Proceed with Supabase if online
    const { data: insertedItem, error: insertError } = await supabase
      .from("ItemMaster")
      .insert([{ 
        ItemName: values.ItemName, 
        CategoryId: values.CategoryId, 
      }])
      .select()
      .single();

    if (insertError || !insertedItem) {
      toast.error("Failed to add item", {
        description: insertError?.message,
      });
      setIsSubmitting(false);
      return;
    }

    const newItemCode = await supabase.rpc('generate_item_code', {
      p_category_id: values.CategoryId,
      p_item_id: insertedItem.ItemId,
    });

    if (newItemCode.error) {
      toast.error("Failed to generate item code", { description: newItemCode.error.message });
      await supabase.from("ItemMaster").delete().eq("ItemId", insertedItem.ItemId);
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("ItemMaster")
      .update({ ItemCode: newItemCode.data })
      .eq("ItemId", insertedItem.ItemId);

    if (updateError) {
      toast.error("Failed to update item with generated code", { description: updateError.message });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    toast.success(`Item "${values.ItemName}" added successfully!`);
    onItemAdded(insertedItem as Item); // Pass the inserted item with its ID
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Quickly add a new item to your inventory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
            <FormField
              control={form.control}
              name="ItemName"
              render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingLabelInput id="ItemName" label="Item Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="CategoryId"
              render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingLabelSelect 
                        label="Category" 
                        value={String(field.value)} 
                        onValueChange={(value) => field.onChange(Number(value))}
                        id="category-select-inline"
                      >
                        {categories.map((category) => (
                          <SelectItem key={category.CategoryId} value={String(category.CategoryId)}>
                            {category.CategoryName}
                          </SelectItem>
                        ))}
                      </FloatingLabelSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}><span>Cancel</span></Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}