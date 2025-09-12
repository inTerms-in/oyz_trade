"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Customer } from "@/types";

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

interface EditCustomerDialogProps {
  customer: Customer;
  onCustomerUpdated: () => void;
}

export function EditCustomerDialog({ customer, onCustomerUpdated }: EditCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      CustomerName: customer.CustomerName,
      MobileNo: customer.MobileNo || "",
    },
  });

  useEffect(() => {
    form.reset({ 
      CustomerName: customer.CustomerName, 
      MobileNo: customer.MobileNo || "" 
    });
  }, [customer, form]);

  async function onSubmit(values: CustomerFormValues) {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("CustomerMaster")
      .update({ 
        CustomerName: values.CustomerName, 
        MobileNo: values.MobileNo || null,
      })
      .eq("CustomerId", customer.CustomerId);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update customer", {
        description: error.message,
      });
    } else {
      toast.success("Customer updated successfully!");
      onCustomerUpdated();
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
          <DialogTitle>Edit Customer (ID: {customer.CustomerId})</DialogTitle>
          <DialogDescription>
            Update the details for this customer.
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