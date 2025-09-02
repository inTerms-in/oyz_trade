import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-provider"; // Import useAuth

interface RecentItem {
  ItemName: string;
  ShopName: string;
  PurchaseDate: string;
  UnitPrice: number;
}

export function RecentPurchaseItems() {
  const { user } = useAuth(); // Use useAuth
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentItems = async () => {
      if (!user?.id) { // Ensure user is logged in
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("Purchase") // Query from Purchase table
        .select(`
          PurchaseDate,
          SupplierMaster(SupplierName),
          PurchaseItem(
            UnitPrice,
            ItemMaster(ItemName)
          )
        `)
        .eq("user_id", user.id) // Added user_id filter
        .order("PurchaseDate", { ascending: false })
        .limit(10);

      if (error) {
        toast.error("Failed to fetch recent items", { description: error.message });
      } else {
        const formattedData: RecentItem[] = [];
        data.forEach((purchase: any) => {
          purchase.PurchaseItem.forEach((item: any) => {
            formattedData.push({
              ItemName: item.ItemMaster.ItemName,
              ShopName: purchase.SupplierMaster?.SupplierName || 'N/A',
              PurchaseDate: purchase.PurchaseDate,
              UnitPrice: item.UnitPrice,
            });
          });
        });
        setItems(formattedData.slice(0, 10)); // Take top 10 items across all recent purchases
      }
      setLoading(false);
    };

    fetchRecentItems();
  }, [user?.id]); // Added user.id to dependencies

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Items Purchased</CardTitle>
        <CardDescription>The last 10 items you bought.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.ItemName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.ShopName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.UnitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No items purchased yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}