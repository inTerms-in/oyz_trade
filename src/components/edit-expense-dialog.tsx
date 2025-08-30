"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Expense, ExpenseCategory } from "@/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { SelectItem } from "@/components/ui/select";
import { CalendarIcon, Pencil, PlusCircle } from "lucide-react";
import { AddExpenseCategoryDialog } from "./add-expense-category-dialog";

const expenseFormSchema = z.object({
  ExpenseDate: z.date({ required_error: "Expense date is required." }),
  Amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0." }),
  Description: z.string().min(3, { message: "Description must be at least 3 characters." }),
  ExpenseCategoryId: z.coerce.number({ invalid_type_error: "Please select an expense category." }).nullable(),
  ReferenceNo: z.string().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface EditExpenseDialogProps {
  expense: Expense;
  onExpenseUpdated: () => void;
}

export function EditExpenseDialog({ expense, onExpenseUpdated }: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      ExpenseDate: parseISO(expense.ExpenseDate),
      Amount: expense.Amount,
      Description: expense.Description || "",
      ExpenseCategoryId: expense.ExpenseCategoryId,
      ReferenceNo: expense.ReferenceNo || "",
    },
  });

  const fetchExpenseCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("ExpenseCategoryMaster")
      .select("*")
      .order("CategoryName");
    if (error) {
      toast.error("Failed to fetch expense categories", { description: error.message });
    } else {
      setExpenseCategories(data || []);
    }
  }, []);

  useEffect(() => {
    if (open) {
      form.reset({
        ExpenseDate: parseISO(expense.ExpenseDate),
        Amount: expense.Amount,
        Description: expense.Description || "",
        ExpenseCategoryId: expense.ExpenseCategoryId,
        ReferenceNo: expense.ReferenceNo || "",
      });
      fetchExpenseCategories();
    }
  }, [open, expense, form, fetchExpenseCategories]);

  async function onSubmit(values: ExpenseFormValues) {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("Expenses")
      .update({ 
        ExpenseDate: values.ExpenseDate.toISOString(),
        Amount: values.Amount,
        Description: values.Description || null,
        ExpenseCategoryId: values.ExpenseCategoryId,
        ReferenceNo: values.ReferenceNo || null,
      })
      .eq("ExpenseId", expense.ExpenseId);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update expense", {
        description: error.message,
      });
    } else {
      toast.success("Expense updated successfully!");
      onExpenseUpdated();
      setOpen(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense (ID: {expense.ExpenseId})</DialogTitle>
            <DialogDescription>
              Update the details for this expense.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField control={form.control} name="ExpenseDate" render={({ field }) => (
                <FormItem>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <div className="relative">
                      <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Expense Date</Label>
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
                      <Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsDatePickerOpen(false);}} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 10} toYear={new Date().getFullYear()} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="Amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingLabelInput id="Amount" label="Amount" type="number" {...field} value={field.value === 0 ? "" : field.value} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ExpenseCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="expense-category-select">Category</Label>
                      <Button type="button" variant="link" size="sm" onClick={() => setIsAddCategoryDialogOpen(true)} className="h-auto p-0 text-sm">
                        <PlusCircle className="mr-1 h-4 w-4" /> New Category
                      </Button>
                    </div>
                    <FormControl>
                      <FloatingLabelSelect 
                        label="Category" 
                        value={String(field.value || "")} 
                        onValueChange={(value) => field.onChange(Number(value))}
                        id="expense-category-select"
                      >
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.ExpenseCategoryId} value={String(category.ExpenseCategoryId)}>
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
                name="Description"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="Description">Description</Label>
                    <FormControl>
                      <Textarea
                        id="Description"
                        placeholder="e.g., Purchased new office chairs"
                        className="resize-y min-h-[80px]"
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
                name="ReferenceNo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingLabelInput id="ReferenceNo" label="Reference No. (Optional)" {...field} value={field.value ?? ""} />
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
      <AddExpenseCategoryDialog 
        open={isAddCategoryDialogOpen} 
        onOpenChange={setIsAddCategoryDialogOpen} 
        onCategoryAdded={fetchExpenseCategories} 
      />
    </>
  );
}