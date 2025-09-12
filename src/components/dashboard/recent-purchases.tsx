import { PurchaseWithItems } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Removed useAuth import as user.id is no longer used for filtering

interface RecentPurchasesProps {
  purchases: PurchaseWithItems[];
}

export function RecentPurchases({ purchases }: RecentPurchasesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Purchases</CardTitle>
        <CardDescription>Your last 10 purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.PurchaseId}>
                  <TableCell>
                    {new Date(purchase.PurchaseDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{purchase.SupplierMaster?.SupplierName || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(purchase.TotalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No recent purchases.
          </div>
        )}
      </CardContent>
    </Card>
  );
}