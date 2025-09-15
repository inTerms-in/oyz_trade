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
import { Customer, ReceivableToSettle } from "@/types";

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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

interface ReceivableToSettle extends Receivable {
  amountToSettle: number;
  isSelected: boolean;
}

const receiptVoucherFormSchema = z.object({
  CustomerName: z.string().min(2, { message: "Customer name is required." }),
  CustomerId: z.coerce.number({ required_error: "Please select a customer." }).nullable(),
  ReceiptDate: z.date(),
  AmountReceived: z.coerce.number().min(0.01, { message: "Amount received must be greater than 0." }),
  PaymentType: z.enum(['Cash', 'Bank', 'Mixed'], { required_error: "Payment type is required." }),
  PaymentMode: z.string().optional().nullable(),
  CashAmount: z.coerce.number().optional().nullable(),
  BankAmount: z.coerce.number().optional().nullable(),
  Description: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.PaymentType === 'Mixed') {
    const totalSplit = (data.CashAmount ?? 0) + (data.BankAmount ?? 0);
    if (Math.abs(totalSplit - data.AmountReceived) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cash and Bank amounts must sum up to the total amount received.",
        path: ['CashAmount'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cash and Bank amounts must sum up to the total amount received.",
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

type ReceiptVoucherFormValues = z.infer<typeof receiptVoucherFormSchema>;

function NewReceiptVoucherPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [receivablesToSettle, setReceivablesToSettle] = useState<ReceivableToSettle[]>([]);
  const [displayCustomerName, setDisplayCustomerName] = useState("");

  const form = useForm<ReceiptVoucherFormValues>({
    resolver: zodResolver(receiptVoucherFormSchema),
    mode: "onChange",
    defaultValues: {
      CustomerName: "",
      CustomerId: null,
      ReceiptDate: new Date(),
      AmountReceived: 0,
      PaymentType: 'Cash',
      PaymentMode: '',
      CashAmount: 0,
      BankAmount: 0,
      Description: "",
    },
  });

  const watchedCustomerId = form.watch("CustomerId");
  const watchedAmountReceived = form.watch("AmountReceived");
  const watchedPaymentType = form.watch("PaymentType");
  const watchedCashAmount = form.watch("CashAmount");
  const watchedBankAmount = form.watch("BankAmount");

  const totalAllocatedAmount = receivablesToSettle
    .filter(r => r.isSelected)
    .reduce((sum, r) => sum + r.amountToSettle, 0);

  const remainingAmountToAllocate = watchedAmountReceived - totalAllocatedAmount;

  const fetchCustomerSuggestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("CustomerMaster")
      .select("CustomerId, CustomerName, MobileNo")
      .order("CustomerName");
    if (error) {
      toast.error("Failed to fetch customer suggestions", { description: error.message });
    } else {
      setCustomerSuggestions(data || []);
    }
  }, []);

  const fetchOutstandingReceivables = useCallback(async (customerId: number) => {
    const { data, error } = await supabase
      .from("Receivables")
      .select("*, Sales(ReferenceNo)")
      .eq("CustomerId", customerId)
      .neq("Status", "Paid")
      .order("DueDate", { ascending: true });

    if (error) {
      toast.error("Failed to fetch outstanding receivables", { description: error.message });
      setReceivablesToSettle([]);
    } else {
      setReceivablesToSettle(data.map(r => ({
        ...r,
        amountToSettle: 0,
        isSelected: false,
      })) || []);
    }
  }, []);

  useEffect(() => {
    fetchCustomerSuggestions();
  }, [fetchCustomerSuggestions]);

  useEffect(() => {
    if (watchedCustomerId) {
      const customer = customerSuggestions.find(c => c.CustomerId === watchedCustomerId);
      setSelectedCustomer(customer || null);
      fetchOutstandingReceivables(watchedCustomerId);
    } else {
      setSelectedCustomer(null);
      setReceivablesToSettle([]);
    }
  }, [watchedCustomerId, customerSuggestions, fetchOutstandingReceivables]);

  // Effect to update payment split amounts when AmountReceived changes
  useEffect(() => {
    if (watchedPaymentType === 'Cash') {
      form.setValue('CashAmount', watchedAmountReceived, { shouldValidate: true });
      form.setValue('BankAmount', 0, { shouldValidate: true });
    } else if (watchedPaymentType === 'Bank') {
      form.setValue('BankAmount', watchedAmountReceived, { shouldValidate: true });
      form.setValue('CashAmount', 0, { shouldValidate: true });
    } else if (watchedPaymentType === 'Mixed') {
      // If AmountReceived changes, and previous split was full, re-distribute
      const currentCash = form.getValues('CashAmount') ?? 0;
      const currentBank = form.getValues('BankAmount') ?? 0;
      const currentTotalSplit = currentCash + currentBank;

      if (Math.abs(currentTotalSplit - watchedAmountReceived) > 0.01) {
        // Simple redistribution: if one is zero, put all in the other. Otherwise, clear.
        if (currentCash === 0 && currentBank === 0) {
          form.setValue('CashAmount', watchedAmountReceived, { shouldValidate: true });
          form.setValue('BankAmount', 0, { shouldValidate: true });
        } else if (currentCash === 0) {
          form.setValue('BankAmount', watchedAmountReceived, { shouldValidate: true });
        } else if (currentBank === 0) {
          form.setValue('CashAmount', watchedAmountReceived, { shouldValidate: true });
        } else {
          // If both have values, clear them to force user input
          form.setValue('CashAmount', 0, { shouldValidate: true });
          form.setValue('BankAmount', 0, { shouldValidate: true });
        }
      }
    }
  }, [watchedAmountReceived, watchedPaymentType, form]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("CustomerName", customer.CustomerName, { shouldValidate: true });
    form.setValue("CustomerId", customer.CustomerId, { shouldValidate: true });
  };

  const handleCustomerNameChange = (name: string) => {
    form.setValue("CustomerName", name, { shouldValidate: true });
    const matchedCustomer = customerSuggestions.find(c => c.CustomerName.toLowerCase() === name.toLowerCase());
    if (!matchedCustomer || name === "") {
      form.setValue("CustomerId", null, { shouldValidate: true });
      setSelectedCustomer(null);
    }
  };

  const handleReceivableSelection = (index: number, isChecked: boolean) => {
    const updatedReceivables = [...receivablesToSettle];
    const receivable = updatedReceivables[index];
    receivable.isSelected = isChecked;
    if (!isChecked) {
      receivable.amountToSettle = 0;
    } else {
      // Automatically fill max amount if selected, or 0 if unselected
      receivable.amountToSettle = Math.min(receivable.Balance, remainingAmountToAllocate);
    }
    setReceivablesToSettle(updatedReceivables);
  };

  const handleAmountToSettleChange = (index: number, value: number) => {
    const updatedReceivables = [...receivablesToSettle];
    const receivable = updatedReceivables[index];
    const maxSettlement = receivable.Balance;
    const newAmount = Math.max(0, Math.min(value, maxSettlement));
    receivable.amountToSettle = newAmount;
    receivable.isSelected = newAmount > 0; // Select if amount is entered
    setReceivablesToSettle(updatedReceivables);
  };

  const handleReceivableAmountChange = (index: number, value: number) => {
    const updatedReceivables = [...receivablesToSettle];
    const receivable = updatedReceivables[index];
    const maxSettleable = receivable.Balance;
    const newAmount = Math.max(0, Math.min(value, maxSettleable));
    receivable.AmountToSettle = newAmount;
    setReceivablesToSettle(updatedReceivables);
  };

  const handleRemoveReceivable = (index: number) => {
    const updatedReceivables = [...receivablesToSettle];
    updatedReceivables.splice(index, 1);
    setReceivablesToSettle(updatedReceivables);
  };

  async function onSubmit(values: ReceiptVoucherFormValues) {
    if (!values.CustomerId) return toast.error("Please select a customer.");
    if (values.AmountReceived <= 0) return toast.error("Amount received must be greater than zero.");

    const settlements = receivablesToSettle.filter(r => r.isSelected && r.amountToSettle > 0);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amountToSettle, 0);

    if (Math.abs(totalSettled - values.AmountReceived) > 0.01) {
      toast.error("Total allocated amount must match amount received.", {
        description: `Amount Received: ${formatCurrency(values.AmountReceived)}, Total Allocated: ${formatCurrency(totalSettled)}`,
      });
      return;
    }

    setIsSubmitting(true);

    const { data: refNoData, error: refNoError } = await supabase.rpc('generate_receipt_voucher_reference_no');

    if (refNoError || !refNoData) {
      toast.error("Failed to generate receipt voucher reference number", { description: refNoError?.message });
      setIsSubmitting(false);
      return;
    }

    const { data: receiptVoucherData, error: voucherError } = await supabase
      .from("receipt_vouchers")
      .insert({
        CustomerId: values.CustomerId,
        ReceiptDate: values.ReceiptDate.toISOString(),
        AmountReceived: values.AmountReceived,
        PaymentType: values.PaymentType,
        PaymentMode: values.PaymentMode === '' ? null : values.PaymentMode,
        CashAmount: values.CashAmount,
        BankAmount: values.BankAmount,
        ReferenceNo: refNoData,
        Description: values.Description || null,
      })
      .select()
      .single();

    if (voucherError || !receiptVoucherData) {
      toast.error("Failed to create receipt voucher", { description: voucherError?.message });
      setIsSubmitting(false);
      return;
    }

    if (settlements.length > 0) {
      const settlementInserts = settlements.map(s => ({
        ReceiptVoucherId: receiptVoucherData.ReceiptVoucherId,
        ReceivableId: s.ReceivableId,
        AmountSettled: s.amountToSettle,
      }));

      const { error: settlementError } = await supabase
        .from("receivable_settlements")
        .insert(settlementInserts);

      if (settlementError) {
        toast.error("Failed to record receivable settlements. Rolling back voucher.", {
          description: settlementError.message || "An unknown error occurred. The receipt voucher was not saved."
        });
        await supabase.from("receipt_vouchers").delete().eq("ReceiptVoucherId", receiptVoucherData.ReceiptVoucherId);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    toast.success(`Receipt Voucher ${refNoData} created successfully!`);
    navigate("/accounts-module/receipt-vouchers");
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>New Receipt Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="CustomerName"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <Label htmlFor="customer-autocomplete">Customer Name</Label>
                      <FormControl>
                        <EntityAutocomplete<Customer>
                          id="customer-autocomplete"
                          suggestions={customerSuggestions}
                          value={field.value ?? ""}
                          onValueChange={handleCustomerNameChange}
                          onSelect={handleCustomerSelect}
                          placeholder="Search for a customer..."
                          getId={(c) => c.CustomerId}
                          getName={(c) => c.CustomerName}
                          getMobileNo={(c) => c.MobileNo}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="ReceiptDate" render={({ field }) => (
                  <FormItem>
                    <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                      <div className="relative">
                        <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Receipt Date</Label>
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
                  name="AmountReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelInput id="AmountReceived" label="Amount Received" type="number" {...field} value={field.value === 0 ? "" : field.value} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
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
                    <span>Amount Received: {formatCurrency(watchedAmountReceived)}</span>
                  </div>
                </div>
              )}

              {selectedCustomer && receivablesToSettle.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Allocate to Receivables</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Select</TableHead>
                          <TableHead>Receivable Ref No.</TableHead>
                          <TableHead className="text-right">Original Amount</TableHead>
                          <TableHead className="text-right">Outstanding Balance</TableHead>
                          <TableHead className="text-center">Amount to Settle</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receivablesToSettle.length > 0 ? (
                          receivablesToSettle.map((receivable, index) => (
                            <TableRow key={receivable.ReceivableId}>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={receivable.isSelected}
                                  onCheckedChange={(checked: boolean) => handleReceivableSelection(index, checked)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">{receivable.Sales?.ReferenceNo || 'N/A'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(receivable.Amount)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(receivable.Balance)}</TableCell>
                              <TableCell className="text-center">
                                <FloatingLabelInput
                                  id={`amount-to-settle-${index}`}
                                  label=" "
                                  type="number"
                                  value={receivable.AmountToSettle}
                                  onChange={(e) => handleReceivableAmountChange(index, e.target.valueAsNumber)}
                                  min={0}
                                  max={receivable.Balance}
                                  step="0.01"
                                  className="w-24 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveReceivable(index)} aria-label="Remove receivable">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No receivables selected for settlement.
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
                <Link to="/accounts-module/receipt-vouchers">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid || totalAllocatedAmount === 0}>
                  {isSubmitting ? "Saving..." : "Create Receipt Voucher"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default NewReceiptVoucherPage;