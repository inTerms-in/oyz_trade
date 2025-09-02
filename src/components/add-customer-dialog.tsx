"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Removed useAuth import as user.id is no longer used for filtering or insert

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

const customerFormSchema = z.object({
  CustomerName: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  MobileNo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Please enter a valid mobile number (10-15 digits, optional + prefix).",
    }),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: { name?: string; mobileNo?: string } | null;
  onCustomerAdded: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, initialValue, onCustomerAdded }: AddCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed user from useAuth

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    mode: "onChange",
    defaultValues: {
      CustomerName: initialValue?.name || "",
      MobileNo: initialValue?.mobileNo || "",
    },
  });
  
  useEffect(() => {
    if (open) {
      form.reset({ 
        CustomerName: initialValue?.name || "",
        MobileNo: initialValue?.mobileNo || ""
      });
    }
  }, [open, initialValue, form]);

  const { formState: { isValid } } = form;

  async function onSubmit(values: CustomerFormValues) {
    setIsSubmitting(true);

    const { error } = await supabase
      .from("CustomerMaster")
      .insert([{ 
        CustomerName: values.CustomerName, 
        MobileNo: values.MobileNo || null,
        // Removed user_id: user.id,
      }])
      .select();

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add customer", {
        description: error.message,
      });
    } else {
      toast.success(`Customer "${values.CustomerName}" added successfully!`);
      onCustomerAdded();
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the details for the new customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
            <FormField
              control={form.control}
              name="CustomerName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput id="CustomerName" label="Customer Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="MobileNo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput id="MobileNo" label="Mobile Number (Optional)" type="tel" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? "Adding..." : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}