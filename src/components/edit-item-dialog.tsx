"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Category, ItemWithCategory } from "@/types";
import { generateItemCode } from "@/lib/utils";
import Barcode from "@/components/barcode";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { FloatingLabelSelect } from "@/components/ui/floating-label-select"; // Using FloatingLabelSelect
import {
  SelectItem,
} from "@/components/ui/select";
import { Pencil, ScanLine, Sparkles } from "lucide-react";
import { BarcodeScannerDialog } from "./barcode-scanner-dialog";

const itemFormSchema = z.object({
  ItemName: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  CategoryId: z.coerce.number({ required_error: "Please select a category." }),
  SellPrice: z.coerce.number().optional().nullable(),
  Barcode: z.string().optional().nullable(),
  ItemCode: z.string().optional().nullable(),
  RackNo: z.string().optional().nullable(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface EditItemDialogProps {
  item: ItemWithCategory;
  onItemUpdated: () => void;
}

export function EditItemDialog({ item, onItemUpdated }: EditItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemCodeDisplay, setItemCodeDisplay] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      ItemName: item.ItemName ?? '', // Fixed: Provide empty string fallback
      CategoryId: item.CategoryId,
      SellPrice: item.SellPrice,
      Barcode: item.Barcode,
      ItemCode: item.ItemCode,
      RackNo: item.RackNo,
    },
  });

  const watchedCategoryId = form.watch("CategoryId");
  const watchedBarcode = form.watch("Barcode");
  const watchedItemName = form.watch("ItemName");
  const watchedSellPrice = form.watch("SellPrice");


  useEffect(() => {
    if (open && item.ItemId) {
      const currentCategoryName = categories.find(c => c.CategoryId === watchedCategoryId)?.CategoryName || item.CategoryMaster?.CategoryName;
      setItemCodeDisplay(generateItemCode(currentCategoryName, item.ItemId, item.ItemCode));
    }
  }, [open, watchedCategoryId, categories, item]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from("CategoryMaster").select("*").order("CategoryName");
      if (data) {
        setCategories(data);
      }
    }
    if (open) {
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    form.reset({
      ItemName: item.ItemName ?? '', // Fixed: Provide empty string fallback
      CategoryId: item.CategoryId,
      SellPrice: item.SellPrice,
      Barcode: item.Barcode,
      ItemCode: item.ItemCode,
      RackNo: item.RackNo,
    });
  }, [item, form]);

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
    const { error } = await supabase
      .from("ItemMaster")
      .update({ 
        ItemName: values.ItemName, 
        CategoryId: values.CategoryId,
        SellPrice: values.SellPrice,
        Barcode: values.Barcode,
        ItemCode: values.ItemCode,
        RackNo: values.RackNo,
      })
      .eq("ItemId", item.ItemId);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update item", {
        description: error.message,
      });
    } else {
      toast.success("Item updated successfully!");
      onItemUpdated();
      setOpen(false);
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto"> {/* Added max-h and overflow */}
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            {/* Removed DialogDescription */}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
              {(watchedBarcode || itemCodeDisplay) && (
                <div className="flex flex-col items-center py-2 border rounded-md bg-muted/50">
                  <Barcode value={watchedBarcode || itemCodeDisplay} height={50} />
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    <p className="font-medium">{watchedItemName}</p>
                    <p>Code: {itemCodeDisplay}</p>
                    <p>Sell Price: {formatCurrency(watchedSellPrice)}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                  <FloatingLabelInput
                      id="ItemId"
                      label="Item ID"
                      value={item.ItemId}
                      readOnly
                      className="bg-muted/50"
                  />
                  <FormField
                    control={form.control}
                    name="ItemCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingLabelInput
                              id="ItemCode"
                              label="Item Code"
                              {...field}
                              value={field.value ?? ""}
                              readOnly // ItemCode should not be editable directly
                              className="bg-muted/50 font-mono text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
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
                      <FloatingLabelInput 
                        id="SellPrice" 
                        label="Sell Price (Optional)" 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""}
                      />
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
                        <FloatingLabelInput 
                          id="Barcode" 
                          label="Barcode (Optional)" 
                          {...field}
                          value={field.value ?? ""}
                          className="pr-24"
                        />
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
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