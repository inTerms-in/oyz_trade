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

const supplierFormSchema = z.object({
  SupplierName: z.string().min(2, {
    message: "Supplier name must be at least 2 characters.",
  }),
  MobileNo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Please enter a valid mobile number (10-15 digits, optional + prefix).",
    }),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: { name?: string; mobileNo?: string } | null;
  onSupplierAdded: () => void;
}

export function AddSupplierDialog({ open, onOpenChange, initialValue, onSupplierAdded }: AddSupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed user from useAuth

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    mode: "onChange",
    defaultValues: {
      SupplierName: initialValue?.name || "",
      MobileNo: initialValue?.mobileNo || "",
    },
  });
  
  useEffect(() => {
    if (open) {
      form.reset({ 
        SupplierName: initialValue?.name || "",
        MobileNo: initialValue?.mobileNo || ""
      });
    }
  }, [open, initialValue, form]);

  const { formState: { isValid } } = form;

  async function onSubmit(values: SupplierFormValues) {
    setIsSubmitting(true);

    const { error } = await supabase
      .from("SupplierMaster")
      .insert([{ 
        SupplierName: values.SupplierName, 
        MobileNo: values.MobileNo || null,
      }])
      .select();

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add supplier", {
        description: error.message,
      });
    } else {
      toast.success(`Supplier "${values.SupplierName}" added successfully!`);
      onSupplierAdded();
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Enter the details for the new supplier.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
            <FormField
              control={form.control}
              name="SupplierName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput id="SupplierName" label="Supplier Name" {...field} />
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
                {isSubmitting ? "Adding..." : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}