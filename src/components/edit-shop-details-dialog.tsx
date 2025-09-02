"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-provider";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const shopDetailsFormSchema = z.object({
  shop_name: z.string().min(2, {
    message: "Shop name must be at least 2 characters.",
  }),
  mobile_no: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Please enter a valid mobile number (10-15 digits, optional + prefix).",
    }),
  address: z.string().optional().nullable(),
});

type ShopDetailsFormValues = z.infer<typeof shopDetailsFormSchema>;

interface EditShopDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShopDetailsUpdated: () => void;
}

export function EditShopDetailsDialog({ open, onOpenChange, onShopDetailsUpdated }: EditShopDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<ShopDetailsFormValues>({
    resolver: zodResolver(shopDetailsFormSchema),
    mode: "onChange",
    defaultValues: {
      shop_name: "",
      mobile_no: "",
      address: "",
    },
  });

  const fetchShopDetails = useCallback(async () => {
    const { data, error } = await supabase
      .from("shop")
      .select("shop_name, mobile_no, address")
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      toast.error("Failed to fetch shop details", { description: error.message });
    } else if (data) {
      form.reset(data);
    } else {
      form.reset({ shop_name: "", mobile_no: "", address: "" });
    }
  }, [form]);

  useEffect(() => {
    if (open) {
      fetchShopDetails();
    }
  }, [open, fetchShopDetails]);

  const { formState: { isValid } } = form;

  async function onSubmit(values: ShopDetailsFormValues) {
    if (!user) { // Still need user for authentication, but not for data filtering
      toast.error("You must be logged in to update shop details.");
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase
      .from("shop")
      .upsert(
        { 
          shop_name: values.shop_name, 
          mobile_no: values.mobile_no || null,
          address: values.address || null,
        }, 
        { onConflict: 'id' } // Upsert based on primary key 'id'
      );

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update shop details", {
        description: error.message,
      });
    } else {
      toast.success("Shop details updated successfully!");
      onShopDetailsUpdated();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shop Details</DialogTitle>
          <DialogDescription>
            Update your shop's name, mobile number, and address.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="shop_name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput id="shop_name" label="Shop Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile_no"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput id="mobile_no" label="Mobile Number (Optional)" type="tel" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <FormControl>
                    <Textarea
                      id="address"
                      placeholder="e.g., 123 Main St, City, State, 12345"
                      className="resize-y min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}