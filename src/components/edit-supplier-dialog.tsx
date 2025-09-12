"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Supplier } from "@/types";

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

interface EditSupplierDialogProps {
  supplier: Supplier;
  onSupplierUpdated: () => void;
}

export function EditSupplierDialog({ supplier, onSupplierUpdated }: EditSupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      SupplierName: supplier.SupplierName,
      MobileNo: supplier.MobileNo || "",
    },
  });

  useEffect(() => {
    form.reset({ 
      SupplierName: supplier.SupplierName, 
      MobileNo: supplier.MobileNo || "" 
    });
  }, [supplier, form]);

  async function onSubmit(values: SupplierFormValues) {
    setIsSubmitting(true);
    const { error } = await supabase
      .from("SupplierMaster")
      .update({ 
        SupplierName: values.SupplierName, 
        MobileNo: values.MobileNo || null,
      })
      .eq("SupplierId", supplier.SupplierId);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update supplier", {
        description: error.message,
      });
    } else {
      toast.success("Supplier updated successfully!");
      onSupplierUpdated();
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
          <DialogTitle>Edit Supplier (ID: {supplier.SupplierId})</DialogTitle>
          <DialogDescription>
            Update the details for this supplier.
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