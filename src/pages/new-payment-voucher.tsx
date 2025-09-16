"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Supplier, Payable, Purchase } from "@/types"; // Import Payable and Purchase

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectItem } from "@/components/ui/select";
import { EntityAutocomplete } from "@/components/entity-autocomplete";
import { Label } from "@/components/ui/label";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } => "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

interface PayableToSettle extends Payable {
  amountToSettle: number;
  isSelected: boolean;
  Purchase?: Purchase | null; // Add Purchase property for joined data
}

const paymentVoucherFormSchema = z.object({
  SupplierName: z.string().min(2, { message: "Supplier name is required." }),
  SupplierId: z.coerce.number({ required_error: "Please select a supplier." }).nullable(),
  PaymentDate: z.date(),
  AmountPaid: z.coerce.number().min(0.01, { message: "Amount paid must be greater than 0." }),
  PaymentType: z.enum(['Cash', 'Bank', 'Mixed'], { required_error: "Payment type is required." }),
  PaymentMode: z.string().optional().nullable(),
  CashAmount: z.coerce.number().optional().nullable(),
  BankAmount: z.coerce.number().optional().nullable(),
  Description: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.PaymentType === 'Mixed') {
    const totalSplit = (data.CashAmount ?? 0) + (data.BankAmount ?? 0);
    if (Math.abs(totalSplit - data.AmountPaid) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cash and Bank amounts must sum up to the total amount paid.",
        path: ['CashAmount'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cash and Bank amounts must sum up to the total amount paid.",
        path: ['BankAmount'],
      });
    }
  }
  if (data.PaymentType === 'Bank' && !data.PaymentMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment mode is required for Bank payments.",
      path: ['PaymentMode'],
    });
  }
  if (data.PaymentType === 'Mixed' && (data.BankAmount ?? 0) > 0 && !data.PaymentMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment mode is required for Bank portion of Mixed payments.",
      path: ['PaymentMode'],
    });
  }
});

type PaymentVoucherFormValues = z.infer<typeof paymentVoucherFormSchema>;

function NewPaymentVoucherPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [payablesToSettle, setPayablesToSettle] = useState<PayableToSettle[]>([]);
  // Removed displaySupplierName as it was unused

  const form = useForm<PaymentVoucherFormValues>({
    resolver: zodResolver(paymentVoucherFormSchema),
    mode: "onChange",
    defaultValues: {
      SupplierName: "",
      SupplierId: null,
      PaymentDate: new Date(),
      AmountPaid: 0,
      PaymentType: 'Cash',
      PaymentMode: '',
      CashAmount: 0,
      BankAmount: 0,
      Description: "",
    },
  });

  const watchedSupplierId = form.watch("SupplierId");
  const watchedAmountPaid = form.watch("AmountPaid");
  const watchedPaymentType = form.watch("PaymentType");
  const watchedCashAmount = form.watch("CashAmount");
  const watchedBankAmount = form.watch("BankAmount");

  const totalAllocatedAmount = payablesToSettle
    .filter(r => r.isSelected)
    .reduce((sum, r) => sum + r.amountToSettle, 0);

  const remainingAmountToAllocate = watchedAmountPaid - totalAllocatedAmount;

  const fetchSupplierSuggestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("SupplierMaster")
      .select("SupplierId, SupplierName, MobileNo")
      .order("SupplierName");
    if (error) {
      toast.error("Failed to fetch supplier suggestions", { description: error.message });
    } else {
      setSupplierSuggestions(data || []);
    }
  }, []);

  const fetchOutstandingPayables = useCallback(async (supplierId: number) => {
    const { data, error } = await supabase
      .from("Payables")
      .select("*, Purchase(ReferenceNo)")
      .eq("SupplierId", supplierId)
      .neq("Status", "Paid")
      .order("DueDate", { ascending: true });

    if (error) {
      toast.error("Failed to fetch outstanding payables", { description: error.message });
      setPayablesToSettle([]);
    } else {
      setPayablesToSettle(data.map(r => ({
        ...r,
        amountToSettle: 0,
        isSelected: false,
      })) || []);
    }
  }, []);

  useEffect(() => {
    fetchSupplierSuggestions();
  }, [fetchSupplierSuggestions]);

  useEffect(() => {
    if (watchedSupplierId) {
      const supplier = supplierSuggestions.find(c => c.SupplierId === watchedSupplierId);
      setSelectedSupplier(supplier || null);
      // Removed setDisplaySupplierName
      fetchOutstandingPayables(watchedSupplierId);
    } else {
      setSelectedSupplier(null);
      // Removed setDisplaySupplierName
      setPayablesToSettle([]);
    }
  }, [watchedSupplierId, supplierSuggestions, fetchOutstandingPayables]);

  // Effect to update payment split amounts when AmountPaid changes
  useEffect(() => {
    if (watchedPaymentType === 'Cash') {
      form.setValue('CashAmount', watchedAmountPaid, { shouldValidate: true });
      form.setValue('BankAmount', 0, { shouldValidate: true });
    } else if (watchedPaymentType === 'Bank') {
      form.setValue('BankAmount', watchedAmountPaid, { shouldValidate: true });
      form.setValue('CashAmount', 0, { shouldValidate: true });
    } else if (watchedPaymentType === 'Mixed') {
      // If AmountPaid changes, and previous split was full, re-distribute
      const currentCash = form.getValues('CashAmount') ?? 0;
      const currentBank = form.getValues('BankAmount') ?? 0;
      const currentTotalSplit = currentCash + currentBank;

      if (Math.abs(currentTotalSplit - watchedAmountPaid) > 0.01) {
        // Simple redistribution: if one is zero, put all in the other. Otherwise, clear.
        if (currentCash === 0 && currentBank === 0) {
          form.setValue('CashAmount', watchedAmountPaid, { shouldValidate: true });
          form.setValue('BankAmount', 0, { shouldValidate: true });
        } else if (currentCash === 0) {
          form.setValue('BankAmount', watchedAmountPaid, { shouldValidate: true });
        } else if (currentBank === 0) {
          form.setValue('CashAmount', watchedAmountPaid, { shouldValidate: true });
        } else {
          // If both have values, clear them to force user input
          form.setValue('CashAmount', 0, { shouldValidate: true });
          form.setValue('BankAmount', 0, { shouldValidate: true });
        }
      }
    }
  }, [watchedAmountPaid, watchedPaymentType, form]);

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    form.setValue("SupplierName", supplier.SupplierName, { shouldValidate: true });
    form.setValue("SupplierId", supplier.SupplierId, { shouldValidate: true });
  };

  const handleSupplierNameChange = (name: string) => {
    form.setValue("SupplierName", name, { shouldValidate: true });
    const matchedSupplier = supplierSuggestions.find(c => c.SupplierName.toLowerCase() === name.toLowerCase());
    if (!matchedSupplier || name === "") {
      form.setValue("SupplierId", null, { shouldValidate: true });
      setSelectedSupplier(null);
      // Removed setDisplaySupplierName
    } else {
      // Removed setDisplaySupplierName
    }
  };

  const handlePayableSelection = (index: number, isChecked: boolean) => {
    const updatedPayables = [...payablesToSettle];
    const payable = updatedPayables[index];
    payable.isSelected = isChecked;
    if (!isChecked) {
      payable.amountToSettle = 0;
    } else {
      // Automatically fill max amount if selected, or 0 if unselected
      payable.amountToSettle = Math.min(payable.Balance, remainingAmountToAllocate);
    }
    setPayablesToSettle(updatedPayables);
  };

  const handlePayableAmountChange = (index: number, value: number) => {
    const updatedPayables = [...payablesToSettle];
    const payable = updatedPayables[index];
    const maxSettleable = payable.Balance;
    const newAmount = Math.max(0, Math.min(value, maxSettleable));
    payable.amountToSettle = newAmount; // Corrected property name
    payable.isSelected = newAmount > 0; // Select if amount is entered
    setPayablesToSettle(updatedPayables);
  };

  const handleRemovePayable = (index: number) => {
    const updatedPayables = [...payablesToSettle];
    updatedPayables.splice(index, 1);
    setPayablesToSettle(updatedPayables);
  };

  async function onSubmit(values: PaymentVoucherFormValues) {
    if (!values.SupplierId) return toast.error("Please select a supplier.");
    if (values.AmountPaid <= 0) return toast.error("Amount paid must be greater than zero.");

    const settlements = payablesToSettle.filter(r => r.isSelected && r.amountToSettle > 0);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amountToSettle, 0);

    if (Math.abs(totalSettled - values.AmountPaid) > 0.01) {
      toast.error("Total allocated amount must match amount paid.", {
        description: `Amount Paid: ${formatCurrency(values.AmountPaid)}, Total Allocated: ${formatCurrency(totalSettled)}`,
      });
      return;
    }

    setIsSubmitting(true);

    const { data: refNoData, error: refNoError } = await supabase.rpc('generate_payment_voucher_reference_no');

    if (refNoError || !refNoData) {
      toast.error("Failed to generate payment voucher reference number", { description: refNoError?.message });
      setIsSubmitting(false);
      return;
    }

    const { data: paymentVoucherData, error: voucherError } = await supabase
      .from("payment_vouchers")
      .insert({
        SupplierId: values.SupplierId,
        PaymentDate: values.PaymentDate.toISOString(),
        AmountPaid: values.AmountPaid,
        PaymentType: values.PaymentType,
        PaymentMode: values.PaymentMode === '' ? null : values.PaymentMode,
        CashAmount: values.CashAmount,
        BankAmount: values.BankAmount,
        ReferenceNo: refNoData,
        Description: values.Description || null,
      })
      .select()
      .single();

    if (voucherError || !paymentVoucherData) {
      toast.error("Failed to create payment voucher", { description: voucherError?.message });
      setIsSubmitting(false);
      return;
    }

    if (settlements.length > 0) {
      const settlementInserts = settlements.map(s => ({
        PaymentVoucherId: paymentVoucherData.PaymentVoucherId,
        PayableId: s.PayableId,
        AmountSettled: s.amountToSettle,
      }));

      const { error: settlementError } = await supabase
        .from("payable_settlements")
        .insert(settlementInserts);

      if (settlementError) {
        toast.error("Failed to record payable settlements. Rolling back voucher.", {
          description: settlementError.message || "An unknown error occurred. The payment voucher was not saved."
        });
        await supabase.from("payment_vouchers").delete().eq("PaymentVoucherId", paymentVoucherData.PaymentVoucherId);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    toast.success(`Payment Voucher ${refNoData} created successfully!`);
    navigate("/accounts-module/payment-vouchers");
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>New Payment Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="SupplierName"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <Label htmlFor="supplier-autocomplete">Supplier Name</Label>
                      <FormControl>
                        <EntityAutocomplete<Supplier>
                          id="supplier-autocomplete"
                          suggestions={supplierSuggestions}
                          value={field.value ?? ""}
                          onValueChange={handleSupplierNameChange}
                          onSelect={handleSupplierSelect}
                          placeholder="Search for a supplier..."
                          getId={(s) => s.SupplierId}
                          getName={(s) => s.SupplierName}
                          getMobileNo={(s) => s.MobileNo}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="PaymentDate" render={({ field }) => (
                  <FormItem>
                    <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                      <div className="relative">
                        <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Payment Date</Label>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="AmountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelInput id="AmountPaid" label="Amount Paid" type="number" {...field} value={field.value === 0 ? "" : field.value} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="PaymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelSelect
                          label="Payment Type"
                          value={field.value}
                          onValueChange={field.onChange}
                          id="payment-type-select"
                        >
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                        </FloatingLabelSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(watchedPaymentType === 'Bank' || watchedPaymentType === 'Mixed') && (
                <FormField
                  control={form.control}
                  name="PaymentMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelInput id="payment-mode" label="Payment Mode (UPI/Transfer/Cheque)" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedPaymentType === 'Mixed' && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <h3 className="font-semibold text-lg">Payment Split Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="CashAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput id="cash-amount" label="Cash Amount" type="number" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="BankAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput id="bank-amount" label="Bank Amount" type="number" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span>Total Split: {formatCurrency((watchedCashAmount ?? 0) + (watchedBankAmount ?? 0))}</span>
                    <span>Amount Paid: {formatCurrency(watchedAmountPaid)}</span>
                  </div>
                </div>
              )}

              {selectedSupplier && payablesToSettle.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Allocate to Payables</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Select</TableHead>
                          <TableHead>Payable Ref No.</TableHead>
                          <TableHead className="text-right">Original Amount</TableHead>
                          <TableHead className="text-right">Outstanding Balance</TableHead>
                          <TableHead className="text-center">Amount to Settle</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payablesToSettle.length > 0 ? (
                          payablesToSettle.map((payable, index) => (
                            <TableRow key={payable.PayableId}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={payable.isSelected}
                                  onCheckedChange={(checked: boolean) => handlePayableSelection(index, checked)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">{payable.Purchase?.ReferenceNo || 'N/A'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(payable.Amount)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(payable.Balance)}</TableCell>
                              <TableCell className="text-center">
                                <FloatingLabelInput
                                  id={`amount-to-settle-${index}`}
                                  label=" "
                                  type="number"
                                  value={payable.amountToSettle}
                                  onChange={(e) => handlePayableAmountChange(index, e.target.valueAsNumber)}
                                  min={0}
                                  max={payable.Balance}
                                  step="0.01"
                                  className="w-24 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemovePayable(index)} aria-label="Remove payable">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No payables selected for settlement.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end text-sm font-medium pt-2">
                    <span>Total Allocated: {formatCurrency(totalAllocatedAmount)}</span>
                  </div>
                  <div className="flex justify-end text-sm font-medium pt-2">
                    <span>Remaining Amount to Allocate: {formatCurrency(remainingAmountToAllocate)}</span>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="Description"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="Description">Description (Optional)</Label>
                    <FormControl>
                      <Textarea
                        id="Description"
                        placeholder="e.g., Payment for multiple invoices, advance payment"
                        className="resize-y min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Link to="/accounts-module/payment-vouchers">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid || totalAllocatedAmount === 0}>
                  {isSubmitting ? "Saving..." : "Create Payment Voucher"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default NewPaymentVoucherPage;