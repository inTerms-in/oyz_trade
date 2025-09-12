"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Category } from "@/types";
// Removed useAuth import as user.id is no longer used for filtering or insert


import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { ScanLine, Sparkles } from "lucide-react";
import { BarcodeScannerDialog } from "./barcode-scanner-dialog";

const itemFormSchema = z.object({
  ItemName: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  CategoryId: z.coerce.number({ required_error: "Please select a category." }),
  SellPrice: z.coerce.number().optional().nullable(),
  Barcode: z.string().optional().nullable(),
  RackNo: z.string().optional().nullable(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: { name: string; categoryId?: number } | null;
  onItemAdded: () => void;
}

export function AddItemDialog({ open, onOpenChange, initialValues, onItemAdded }: AddItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // Removed user from useAuth
  

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    mode: "onChange",
    defaultValues: {
      ItemName: initialValues?.name || "",
      CategoryId: initialValues?.categoryId,
      SellPrice: undefined,
      Barcode: "",
      RackNo: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ItemName: initialValues?.name || "",
        CategoryId: initialValues?.categoryId,
        SellPrice: undefined,
        Barcode: "",
        RackNo: "",
      });
    }
  }, [open, initialValues, form]);

  const { formState: { isValid } } = form;

  useEffect(() => {
    async function fetchCategories() {
      // Removed user.id check here
      const { data } = await supabase.from("CategoryMaster").select("*")
      // Removed .eq("user_id", user.id)
      .order("CategoryName");
      if (data) {
        setCategories(data);
        if (data.length > 0 && !form.getValues("CategoryId")) {
          form.setValue("CategoryId", initialValues?.categoryId || data[0].CategoryId, { shouldValidate: true });
        }
      }
    }
    if (open) {
      fetchCategories();
    }
  }, [open, form, initialValues]); // Removed user.id from dependencies

  const handleGenerateBarcode = async () => {
    
    const { data, error } = await supabase.rpc('generate_unique_barcode');
    if (error) {
      toast.error("Failed to generate barcode", { description: error.message });
    } else {
      form.setValue("Barcode", data, { shouldValidate: true });
      toast.success("New barcode generated!");
    }
  };

  async function onSubmit(values: ItemFormValues) {
    setIsSubmitting(true);

    // Ensure empty string barcode is converted to null
    const barcodeToInsert = values.Barcode === "" ? null : values.Barcode;

    // Proceed with Supabase if online
    const { data: insertedItem, error: insertError } = await supabase
      .from("ItemMaster")
      .insert([{ 
        ItemName: values.ItemName, 
        CategoryId: values.CategoryId, 
        SellPrice: values.SellPrice,
        Barcode: barcodeToInsert,
        RackNo: values.RackNo,
        // Removed user_id: user.id,
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
      await supabase.from("ItemMaster").delete().eq("ItemId", insertedItem.ItemId); // Removed user_id
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("ItemMaster")
      .update({ ItemCode: newItemCode.data })
      .eq("ItemId", insertedItem.ItemId);
      // Removed .eq("user_id", user.id); // Added user_id

    if (updateError) {
      toast.error("Failed to update item with generated code", { description: updateError.message });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    toast.success(`Item "${values.ItemName}" added successfully!`);
    onItemAdded();
    form.reset();
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
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
                        id="category-select"
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
              <FormField
                control={form.control}
                name="SellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingLabelInput id="SellPrice" label="Sell Price (Optional)" type="number" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput id="Barcode" label="Barcode (Optional)" {...field} value={field.value ?? ""} className="pr-24" />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex space-x-1">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={handleGenerateBarcode}>
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsScannerOpen(true)}>
                            <ScanLine className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="RackNo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingLabelInput id="RackNo" label="Rack Number (Optional)" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}><span>Cancel</span></Button>
                <Button type="submit" disabled={isSubmitting || !isValid}>
                  {isSubmitting ? "Adding..." : "Add Item"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
        </DialogContent>
      </Dialog>
      <BarcodeScannerDialog 
        open={isScannerOpen} 
        onOpenChange={setIsScannerOpen} 
        onScanSuccess={(text) => {
          form.setValue("Barcode", text, { shouldValidate: true });
          setIsScannerOpen(false);
        }} 
      />
    </>
  );
}