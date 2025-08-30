"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ItemWithStock, StockAdjustment as StockAdjustmentType } from "@/types";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-provider";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Autocomplete } from "@/components/autocomplete";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, MinusCircle, History } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // New import

const stockAdjustmentFormSchema = z.object({
  ItemName: z.string().min(1, { message: "Please select an item." }),
  ItemId: z.coerce.number({ invalid_type_error: "Please select an item." }).optional(),
  AdjustmentType: z.enum(["in", "out"], { required_error: "Please select an adjustment type." }),
  Quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  Reason: z.string().min(3, { message: "Reason must be at least 3 characters." }),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>;

function StockAdjustmentPage() {
  const [itemSuggestions, setItemSuggestions] = useState<ItemWithStock[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemWithStock | null>(null);
  const [recentAdjustments, setRecentAdjustments] = useState<StockAdjustmentType[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: {
      ItemName: "",
      ItemId: undefined,
      AdjustmentType: "in",
      Quantity: 1,
      Reason: "",
    },
  });

  const watchedItemId = form.watch("ItemId");

  const fetchItemSuggestions = useCallback(async () => {
    if (!user) return;
    setLoadingSuggestions(true);
    const { data, error } = await supabase
      .from("item_stock_details")
      .select("ItemId, ItemName, ItemCode, current_stock")
      .eq("user_id", user.id); // Filter by user_id
    if (error) {
      toast.error("Failed to fetch items", { description: error.message });
    } else {
      setItemSuggestions(data as ItemWithStock[]);
    }
    setLoadingSuggestions(false);
  }, [user]);

  const fetchRecentAdjustments = useCallback(async (itemId: number) => {
    if (!user) return;
    setLoadingAdjustments(true);
    const { data, error } = await supabase
      .from("StockAdjustment")
      .select("*, ItemMaster(ItemName, ItemCode)")
      .eq("ItemId", itemId)
      .eq("user_id", user.id) // Filter by user_id
      .order("AdjustmentDate", { ascending: false })
      .limit(5);
    if (error) {
      toast.error("Failed to fetch recent adjustments", { description: error.message });
      setRecentAdjustments([]);
    } else {
      setRecentAdjustments(data as StockAdjustmentType[]);
    }
    setLoadingAdjustments(false);
  }, [user]);

  useEffect(() => {
    fetchItemSuggestions();
  }, [fetchItemSuggestions]);

  useEffect(() => {
    if (watchedItemId) {
      const item = itemSuggestions.find(i => i.ItemId === watchedItemId);
      setSelectedItem(item || null);
      fetchRecentAdjustments(watchedItemId);
    } else {
      setSelectedItem(null);
      setRecentAdjustments([]);
    }
  }, [watchedItemId, itemSuggestions, fetchRecentAdjustments]);

  const handleItemSelect = (item: ItemWithStock) => {
    form.setValue("ItemName", item.ItemName || "", { shouldValidate: true });
    form.setValue("ItemId", item.ItemId, { shouldValidate: true });
    setSelectedItem(item);
  };

  const handleItemNameChange = (name: string) => {
    form.setValue("ItemName", name, { shouldValidate: true });
    // Clear ItemId and selectedItem if the name is empty or no longer matches a selected item
    const matchedItem = itemSuggestions.find(i => i.ItemName?.toLowerCase() === name.toLowerCase());
    if (!matchedItem || name === "") { 
      form.setValue("ItemId", undefined, { shouldValidate: true });
      setSelectedItem(null); 
    }
  };

  async function onSubmit(values: StockAdjustmentFormValues) {
    if (!user) {
      toast.error("You must be logged in to record a stock adjustment.");
      return;
    }
    setIsSubmitting(true);

    // Ensure ItemId is a number before inserting
    if (values.ItemId === undefined) {
      toast.error("Please select a valid item before submitting.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("StockAdjustment")
      .insert({
        ItemId: values.ItemId,
        AdjustmentType: values.AdjustmentType,
        Quantity: values.Quantity,
        Reason: values.Reason,
        user_id: user.id, // Added user_id
      });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to record stock adjustment", { description: error.message });
    } else {
      toast.success("Stock adjustment recorded successfully!");
      form.reset({
        ItemName: "",
        ItemId: undefined,
        AdjustmentType: "in",
        Quantity: 1,
        Reason: "",
      });
      setSelectedItem(null); // Clear selected item
      setRecentAdjustments([]); // Clear recent adjustments
      fetchItemSuggestions(); // Refresh item suggestions to get updated stock
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Stock Adjustment</CardTitle>
          <CardDescription>Manually adjust the stock levels of your items.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ItemName"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="item-autocomplete">Item Name</Label>
                    <FormControl>
                      <Autocomplete<ItemWithStock>
                        id="item-autocomplete"
                        suggestions={itemSuggestions}
                        value={field.value}
                        onValueChange={handleItemNameChange}
                        onSelect={handleItemSelect}
                        placeholder="Search for an item..."
                        disabled={loadingSuggestions}
                        getId={(item) => item.ItemId}
                        getName={(item) => item.ItemName || ''}
                        getItemCode={(item) => item.ItemCode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedItem && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50 text-sm">
                  <p className="font-medium">Current Stock:</p>
                  <p className="font-bold text-lg">{selectedItem.current_stock} units</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="AdjustmentType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label>Adjustment Type</Label>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="in" />
                            </FormControl>
                            <Label className="font-normal flex items-center">
                              <PlusCircle className="mr-2 h-4 w-4 text-green-500" /> Stock In
                            </Label>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="out" />
                            </FormControl>
                            <Label className="font-normal flex items-center">
                              <MinusCircle className="mr-2 h-4 w-4 text-red-500" /> Stock Out
                            </Label>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Quantity"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="quantity">Quantity</Label>
                      <FormControl>
                        <FloatingLabelInput
                          id="quantity"
                          label=" " // Label is handled by <Label> above
                          type="number"
                          min={1}
                          {...field}
                          value={field.value === 0 ? "" : field.value} // Display empty string for 0
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="Reason"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="reason">Reason for Adjustment</Label>
                    <FormControl>
                      <Textarea
                        id="reason"
                        placeholder="e.g., Damaged stock, inventory count discrepancy, return from customer, etc."
                        className="resize-y min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid || !watchedItemId}>
                {isSubmitting ? "Saving Adjustment..." : "Record Adjustment"}
              </Button>
            </form>
          </Form>

          {watchedItemId && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5" /> Recent Adjustments
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAdjustments ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : recentAdjustments.length > 0 ? (
                      recentAdjustments.map((adj) => (
                        <TableRow key={adj.StockAdjustmentId}>
                          <TableCell>{format(new Date(adj.AdjustmentDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${adj.AdjustmentType === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                              {adj.AdjustmentType === 'in' ? 'Stock In' : 'Stock Out'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{adj.Quantity}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{adj.Reason || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No recent adjustments for this item.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StockAdjustmentPage;