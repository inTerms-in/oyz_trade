"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn, generateItemCode } from "@/lib/utils";
import { Item, ItemWithCategory, Customer } from "@/types";
// Removed useAuth import as user_id is no longer used for filtering

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectItem } from "@/components/ui/select";
import { Autocomplete } from "@/components/autocomplete";
import { EntityAutocomplete } from "@/components/entity-autocomplete";
import { Label } from "@/components/ui/label";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { Calendar as CalendarIcon, Plus, PlusCircle, Trash2, Pencil, ScanBarcode } from "lucide-react";
import { AddNewItemInlineDialog } from "@/components/add-new-item-inline-dialog";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalePostSaveActionsDialog } from "@/components/sale-post-save-actions-dialog"; // New import

const saleFormSchema = z.object({
  CustomerName: z.string().optional().nullable(),
  customerMobileNo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Please enter a valid mobile number (10-15 digits, optional + prefix).",
    }),
  SaleDate: z.date(),
  AdditionalDiscount: z.coerce.number().optional().nullable(),
  DiscountPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SaleListItem {
  ItemId: number;
  ItemName: string;
  CategoryName?: string;
  Barcode?: string | null;
  ItemCode?: string | null;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  TotalPrice: number;
}

const UNITS = ["Piece", "Pack", "Box", "Dozen", "Ream", "Kg", "Gram", "Liter", "ml"];
const EMPTY_ITEM: Omit<SaleListItem, 'ItemId'> & { ItemId: number | string } = { ItemId: "", ItemName: "", CategoryName: "", Barcode: "", ItemCode: "", Qty: 1, Unit: "Piece", UnitPrice: 0, TotalPrice: 0 };

function NewSalePage() {
  const navigate = useNavigate();
  // Removed user from useAuth
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState<ItemWithCategory[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [currentItem, setCurrentItem] = useState(EMPTY_ITEM);
  const [addedItems, setAddedItems] = useState<SaleListItem[]>([]);
  
  const [isCreateItemOpen, setCreateItemOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastDiscountChangeSource, setLastDiscountChangeSource] = useState<'amount' | 'percentage' | null>(null);

  const [isPostSaveActionsDialogOpen, setIsPostSaveActionsDialogOpen] = useState(false); // New state
  const [newlyCreatedSaleId, setNewlyCreatedSaleId] = useState<number | null>(null); // New state

  const itemInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    mode: "onChange",
    defaultValues: { CustomerName: "", customerMobileNo: "", SaleDate: new Date(), AdditionalDiscount: 0, DiscountPercentage: 0 },
  });

  const watchedAdditionalDiscount = form.watch("AdditionalDiscount");
  const watchedDiscountPercentage = form.watch("DiscountPercentage");
  const { formState: { isValid } } = form;

  const itemsTotal = addedItems.reduce((sum: number, item: SaleListItem) => sum + item.TotalPrice, 0);

  // Synchronize AdditionalDiscount and DiscountPercentage
  useEffect(() => {
    const currentAdditionalDiscount = form.getValues("AdditionalDiscount") ?? 0;
    const currentDiscountPercentage = form.getValues("DiscountPercentage") ?? 0;

    if (itemsTotal === 0) {
      if (currentAdditionalDiscount !== 0) {
        form.setValue("AdditionalDiscount", 0, { shouldValidate: true });
      }
      if (currentDiscountPercentage !== 0) {
        form.setValue("DiscountPercentage", 0, { shouldValidate: true });
      }
      return;
    }

    if (lastDiscountChangeSource === 'amount') {
      const discount = watchedAdditionalDiscount ?? 0;
      const calculatedPercentage = (discount / itemsTotal) * 100;
      const newPercentage = parseFloat(calculatedPercentage.toFixed(2));
      if (currentDiscountPercentage !== newPercentage) {
        form.setValue("DiscountPercentage", newPercentage, { shouldValidate: true });
      }
      setLastDiscountChangeSource(null);
    } else if (lastDiscountChangeSource === 'percentage') {
      const percentage = watchedDiscountPercentage ?? 0;
      const calculatedDiscount = (percentage / 100) * itemsTotal;
      const newDiscount = parseFloat(calculatedDiscount.toFixed(2));
      if (currentAdditionalDiscount !== newDiscount) {
        form.setValue("AdditionalDiscount", newDiscount, { shouldValidate: true });
      }
      setLastDiscountChangeSource(null);
    }
  }, [watchedAdditionalDiscount, watchedDiscountPercentage, itemsTotal, form, lastDiscountChangeSource]);


  useEffect(() => {
    async function fetchData() {
      const { data: itemsData, error: itemsError } = await supabase
        .from("ItemMaster").select("*, CategoryMaster(*)")
        // Removed .eq("user_id", user.id) filter
        .order("ItemName");
      if (itemsError) toast.error("Failed to fetch items", { description: itemsError.message });
      else setItemSuggestions(itemsData as ItemWithCategory[]);

      const { data: customersData, error: customersError } = await supabase.from("CustomerMaster").select("CustomerId, CustomerName, MobileNo"); // Removed user_id
      if (customersError) toast.error("Failed to fetch customers", { description: customersError.message });
      else setCustomerSuggestions(customersData || []);
    }
    fetchData();
  }, []); // Removed user.id from dependencies

  // Effect to update mobile number when customer is selected from autocomplete
  useEffect(() => {
    const currentMobileNo = form.getValues("customerMobileNo");
    if (selectedCustomer) {
      const newMobileNo = selectedCustomer.MobileNo || "";
      if (currentMobileNo !== newMobileNo) {
        form.setValue("customerMobileNo", newMobileNo, { shouldValidate: true });
      }
    } else {
      if (!form.formState.dirtyFields.customerMobileNo && currentMobileNo !== "") {
        form.setValue("customerMobileNo", "", { shouldValidate: true });
      }
    }
  }, [selectedCustomer, form]);

  // Effect to clear selectedCustomer if CustomerName input changes and no longer matches
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "CustomerName") {
        const currentCustomerName = value.CustomerName;
        if (selectedCustomer && currentCustomerName?.toLowerCase() !== selectedCustomer.CustomerName.toLowerCase()) {
          setSelectedCustomer(null);
        } else if (!currentCustomerName) {
          setSelectedCustomer(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, selectedCustomer]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("CustomerName", customer.CustomerName, { shouldValidate: true });
  };

  const handleCustomerNameChange = (name: string) => {
    form.setValue("CustomerName", name, { shouldValidate: true });
  };

  const handleCurrentItemChange = (field: keyof typeof currentItem, value: string | number) => {
    const updatedItem = { ...currentItem, [field]: value };
    if (field === "ItemName") {
      const selected = itemSuggestions.find((i: ItemWithCategory) => (i.ItemName ?? '').toLowerCase() === String(value).toLowerCase());
      updatedItem.ItemId = selected ? selected.ItemId : "";
      updatedItem.CategoryName = selected ? selected.CategoryMaster?.CategoryName : "";
      updatedItem.Barcode = selected ? selected.Barcode : "";
      updatedItem.ItemCode = selected ? selected.ItemCode : "";
      updatedItem.UnitPrice = selected?.SellPrice || 0;
    }
    if (field === "Qty" || field === "UnitPrice") {
      const qty = field === "Qty" ? Number(value) : updatedItem.Qty;
      const price = field === "UnitPrice" ? Number(value) : updatedItem.UnitPrice;
      updatedItem.TotalPrice = parseFloat((qty * price).toFixed(2));
    }
    if (field === "TotalPrice") {
      const total = Number(value);
      if (updatedItem.Qty > 0) {
        updatedItem.UnitPrice = parseFloat((total / updatedItem.Qty).toFixed(2));
      }
    }
    setCurrentItem(updatedItem);
  };

  const handleItemSelect = (selectedItem: ItemWithCategory) => {
    setCurrentItem({ 
      ...EMPTY_ITEM, 
      ItemId: selectedItem.ItemId, 
      ItemName: selectedItem.ItemName ?? '',
      CategoryName: selectedItem.CategoryMaster?.CategoryName,
      Barcode: selectedItem.Barcode,
      ItemCode: selectedItem.ItemCode,
      Qty: 1,
      Unit: "Piece",
      UnitPrice: selectedItem.SellPrice || 0,
      TotalPrice: selectedItem.SellPrice || 0,
    });
    qtyInputRef.current?.focus();
  };

  const handleAddItem = () => {
    if (!currentItem.ItemId || typeof currentItem.ItemId !== 'number') {
      toast.error("Please select a valid item.");
      return;
    }
    if (currentItem.Qty <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (currentItem.UnitPrice <= 0) {
      toast.error("Unit price must be greater than zero.");
      return;
    }

    const existingItemIndex = addedItems.findIndex(
      (item) =>
        item.ItemId === currentItem.ItemId &&
        item.Unit === currentItem.Unit &&
        item.UnitPrice === currentItem.UnitPrice
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...addedItems];
      const existingItem = updatedItems[existingItemIndex];
      existingItem.Qty += currentItem.Qty;
      existingItem.TotalPrice = parseFloat((existingItem.Qty * existingItem.UnitPrice).toFixed(2));
      setAddedItems(updatedItems);
      toast.success(`Quantity for "${currentItem.ItemName}" updated.`);
    } else {
      setAddedItems([...addedItems, currentItem as SaleListItem]);
      toast.success(`Item "${currentItem.ItemName}" added.`);
    }
    
    setCurrentItem(EMPTY_ITEM);
    itemInputRef.current?.focus();
  };

  const handleEditItem = (index: number) => {
    const itemToEdit = addedItems[index];
    const newAddedItems = addedItems.filter((_: SaleListItem, i: number) => i !== index);
    setAddedItems(newAddedItems);
    setCurrentItem(itemToEdit);
    itemInputRef.current?.focus();
  };

  const handleItemCreated = (newItem: Item) => {
    const newSuggestion = { ...newItem, CategoryMaster: null };
    setItemSuggestions([...itemSuggestions, newSuggestion]);
    setCurrentItem({ 
      ...EMPTY_ITEM, 
      ItemId: newItem.ItemId, 
      ItemName: newItem.ItemName ?? '',
      Barcode: newItem.Barcode, 
      ItemCode: newItem.ItemCode, 
      UnitPrice: newItem.SellPrice || 0,
      Qty: 1,
      Unit: "Piece",
      TotalPrice: newItem.SellPrice || 0,
    });
    // Automatically add the newly created item to the list
    setTimeout(() => { // Use a timeout to ensure state updates are processed
      handleAddItem();
    }, 0);
  };

  const handleScan = (barcode: string) => {
    const foundItem = itemSuggestions.find((item: ItemWithCategory) => item.Barcode === barcode);
    if (foundItem) {
      handleItemSelect(foundItem);
      toast.success(`Found item: ${foundItem.ItemName}`);
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    } else {
      toast.error("Item not found", { description: "No item in your master list matches this barcode." });
    }
    setIsScannerOpen(false);
  };

  const isCurrentItemNew = currentItem.ItemName && !itemSuggestions.some((i: ItemWithCategory) => (i.ItemName ?? '').toLowerCase() === (currentItem.ItemName ?? '').toLowerCase());

  async function onSubmit(values: SaleFormValues) {
    if (addedItems.length === 0) return toast.error("Please add at least one item.");
    // Removed user_id check
    
    setIsSubmitting(true);

    let finalCustomerId: number | null = null;
    let customerToUpdate: Customer | null = null;

    if (values.CustomerName) {
      const existingCustomer = customerSuggestions.find((c: Customer) => c.CustomerName.toLowerCase() === values.CustomerName!.toLowerCase());

      if (existingCustomer) {
        finalCustomerId = existingCustomer.CustomerId;
        customerToUpdate = existingCustomer;
      } else {
        const { data: newCustomer, error: createCustomerError } = await supabase
          .from("CustomerMaster")
          .insert([{ CustomerName: values.CustomerName, MobileNo: values.customerMobileNo || null }]) // Removed user_id
          .select()
          .single();

        if (createCustomerError || !newCustomer) {
          toast.error("Failed to create new customer", { description: createCustomerError?.message });
          setIsSubmitting(false);
          return;
        }
        finalCustomerId = newCustomer.CustomerId;
        customerToUpdate = newCustomer;
        toast.success(`New customer "${newCustomer.CustomerName}" added.`);
      }

      if (customerToUpdate && customerToUpdate.CustomerId && customerToUpdate.MobileNo !== values.customerMobileNo) {
        const { error: updateMobileError } = await supabase
          .from("CustomerMaster")
          .update({ MobileNo: values.customerMobileNo || null })
          .eq("CustomerId", customerToUpdate.CustomerId); // Removed user_id filter
        if (updateMobileError) {
          toast.error("Failed to update customer mobile number", { description: updateMobileError.message });
          setIsSubmitting(false);
          return;
        }
      }
    }

    const { data: refNoData, error: refNoError } = await supabase.rpc('generate_sale_reference_no'); // Removed p_user_id

    if (refNoError || !refNoData) {
      toast.error("Failed to generate sale reference number", { description: refNoError?.message });
      setIsSubmitting(false);
      return;
    }
    
    const additionalDiscount = values.AdditionalDiscount || 0;
    const discountPercentage = values.DiscountPercentage || 0;
    
    const { data: saleData, error: saleError } = await supabase
      .from("Sales").insert({ 
        CustomerId: finalCustomerId,
        SaleDate: values.SaleDate.toISOString(),
        TotalAmount: itemsTotal - additionalDiscount,
        AdditionalDiscount: additionalDiscount,
        DiscountPercentage: discountPercentage,
        ReferenceNo: refNoData,
        // Removed user_id
      }).select().single();

    if (saleError || !saleData) {
      toast.error("Failed to create sale", { description: saleError?.message });
      setIsSubmitting(false);
      return;
    }

    const saleItems = addedItems.map((item: SaleListItem) => ({
      SaleId: saleData.SaleId,
      ItemId: item.ItemId,
      Qty: item.Qty,
      Unit: item.Unit,
      UnitPrice: item.UnitPrice,
      // Removed user_id
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("SalesItem")
      .insert(saleItems)
      .select();

    if (itemsError || !insertedItems || insertedItems.length !== saleItems.length) {
      toast.error("Failed to save sale items. Rolling back.", { 
        description: itemsError?.message || "An unknown error occurred. The sale was not saved." 
      });
      await supabase.from("Sales").delete().eq("SaleId", saleData.SaleId); // Removed user_id filter
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    toast.success(`Sale ${refNoData} added successfully!`);
    setNewlyCreatedSaleId(saleData.SaleId); // Store the new sale ID
    setIsPostSaveActionsDialogOpen(true); // Open the dialog
    form.reset(); // Reset form after successful submission
    setAddedItems([]); // Clear added items
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  const grandTotal = itemsTotal - (watchedAdditionalDiscount || 0);

  // Handlers for the post-save dialog
  const handleSendWhatsAppFromDialog = (saleId: number) => {
    // This page doesn't have shop details or the full saleData to generate a rich message.
    // For a new sale, we'd need to fetch the full saleData again.
    // For simplicity, we'll navigate to the edit page and let it handle WhatsApp.
    navigate(`/sales-module/sales-invoice/edit/${saleId}`, { state: { action: 'send-whatsapp' } });
  };

  const handlePrintFromDialog = (saleId: number) => {
    navigate(`/sales-module/sales-invoice/edit/${saleId}`, { state: { action: 'print-invoice' } });
  };

  const handleReturnToListFromDialog = () => {
    navigate("/sales-module/sales-invoice");
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name="CustomerName"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <EntityAutocomplete<Customer>
                            id="customer-name"
                            label="Customer Name (Optional)"
                            suggestions={customerSuggestions}
                            value={field.value ?? ""}
                            onValueChange={handleCustomerNameChange}
                            onSelect={handleCustomerSelect}
                            getId={(c) => c.CustomerId}
                            getName={(c) => c.CustomerName}
                            getMobileNo={(c) => c.MobileNo}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerMobileNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingLabelInput id="customerMobileNo" label="Customer Mobile No. (Optional)" type="tel" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FormField control={form.control} name="SaleDate" render={({ field }) => (
                    <FormItem>
                      <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                        <div className="relative">
                          <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Sale Date</Label>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full justify-start pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}>
                                <span className="flex items-center">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  <span>{field.value ? format(field.value, "PPP") : ""}</span>
                                </span>
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                        </div>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setDatePickerOpen(false);}} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 10} toYear={new Date().getFullYear()} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="AdditionalDiscount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput 
                              id="AdditionalDiscount" 
                              label="Additional Discount" 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={(e) => {
                                field.onChange(e);
                                setLastDiscountChangeSource('amount');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="DiscountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput 
                              id="DiscountPercentage" 
                              label="Discount Percentage (%)" 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={(e) => {
                                field.onChange(e);
                                setLastDiscountChangeSource('percentage');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add Items</Label>
                  <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                    <span className="flex items-center">
                      <ScanBarcode className="mr-2 h-4 w-4" />
                      <span>Scan Item</span>
                    </span>
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg">
                  <div className="flex-1 min-w-[80px]"><FloatingLabelInput value={currentItem.ItemCode || (typeof currentItem.ItemId === 'number' ? generateItemCode(currentItem.CategoryName, currentItem.ItemId) : "")} label="Code" id="current_item_code" readOnly className="bg-muted/50 font-mono text-xs" /></div>
                  <div className="relative flex-1 min-w-[250px]">
                    <Autocomplete<ItemWithCategory> ref={itemInputRef} suggestions={itemSuggestions} value={currentItem.ItemName} onValueChange={(v: string) => handleCurrentItemChange("ItemName", v)} onSelect={handleItemSelect} label="Item Name" id="current_item" className={cn(isCurrentItemNew && "pr-24")} 
                      getId={(item) => item.ItemId}
                      getName={(item) => item.ItemName || ''}
                      getItemCode={(item) => item.ItemCode}
                    />
                    {isCurrentItemNew && <Button type="button" size="sm" onClick={() => setCreateItemOpen(true)} className="absolute right-1 top-1/2 -translate-y-1/2 h-8" aria-label="Create new item">
                      <span className="flex items-center">
                        <PlusCircle className="mr-1 h-4 w-4" />
                        <span>Create</span>
                      </span>
                    </Button>}
                  </div>
                  <div className="flex-1 min-w-[150px]"><FloatingLabelInput value={currentItem.Barcode || ""} label="Barcode" id="current_item_barcode" readOnly className="bg-muted/50 font-mono text-xs" /></div>
                  <div className="flex-1 min-w-[90px]"><FloatingLabelSelect label="Unit" value={currentItem.Unit} onValueChange={(v) => handleCurrentItemChange("Unit", v)} id="current_unit_select">{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</FloatingLabelSelect></div>
                  <div className="flex-1 min-w-[70px]"><FloatingLabelInput ref={qtyInputRef} type="number" value={currentItem.Qty} onChange={(e) => handleCurrentItemChange("Qty", e.target.valueAsNumber)} label="Qty" id="current_qty" /></div>
                  <div className="flex-1 min-w-[90px]"><FloatingLabelInput type="number" value={currentItem.UnitPrice} onChange={(e) => handleCurrentItemChange("UnitPrice", e.target.valueAsNumber)} label="Unit Price" id="current_unit_price" /></div>
                  <div className="flex-1 min-w-[90px]"><FloatingLabelInput type="number" value={currentItem.TotalPrice} onChange={(e) => handleCurrentItemChange("TotalPrice", e.target.valueAsNumber)} label="Total" id="current_total" /></div>
                  <div><Button type="button" onClick={handleAddItem} className="self-center h-10 w-full" aria-label="Add item"><Plus className="h-4 w-4" /></Button></div>
                </div>
              </div>

              {addedItems.length > 0 && (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {addedItems.map((item: SaleListItem, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.ItemName}</TableCell>
                          <TableCell className="text-right">{item.Qty}</TableCell>
                          <TableCell>{item.Unit}</TableCell>
                          <TableCell className="text-right">{item.UnitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.TotalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleEditItem(index)} aria-label="Edit item"><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => { const newItems = [...addedItems]; newItems.splice(index, 1); setAddedItems(newItems); }} aria-label="Delete item"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4 pt-4">
                <div className="flex space-x-2 w-full sm:w-auto">
                  <Link to="/sales" className="flex-1 sm:flex-none"><Button type="button" variant="outline" className="w-full">Cancel</Button></Link>
                  <Button type="submit" disabled={isSubmitting || !isValid || addedItems.length === 0} className="flex-1 sm:flex-none">{isSubmitting ? "Saving..." : "Save Sale"}</Button>
                </div>
                <div className="w-full sm:w-auto sm:max-w-xs space-y-1 text-sm self-end">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Items Total</span>
                        <span>{formatCurrency(itemsTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span>- {formatCurrency(watchedAdditionalDiscount || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base">
                        <span>Grand Total</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <AddNewItemInlineDialog open={isCreateItemOpen} onOpenChange={setCreateItemOpen} initialItemName={currentItem.ItemName} onItemAdded={handleItemCreated} />
      <BarcodeScannerDialog open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScan} />
      <SalePostSaveActionsDialog
        open={isPostSaveActionsDialogOpen}
        onOpenChange={setIsPostSaveActionsDialogOpen}
        saleId={newlyCreatedSaleId}
        onSendWhatsApp={handleSendWhatsAppFromDialog}
        onPrint={handlePrintFromDialog}
        onReturnToList={handleReturnToListFromDialog}
      />
    </div>
  );
}

export default NewSalePage;