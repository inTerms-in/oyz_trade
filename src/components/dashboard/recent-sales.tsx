import { SaleWithItems } from "@/types";
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

interface RecentSalesProps {
  sales: SaleWithItems[];
}

export function RecentSales({ sales }: RecentSalesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>Your last 10 sales.</CardDescription>
      </CardHeader>
      <CardContent>
        {sales.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.SaleId}>
                  <TableCell>
                    {new Date(sale.SaleDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.CustomerMaster?.CustomerName || 'Walk-in Customer'}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(sale.TotalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No recent sales.
          </div>
        )}
      </CardContent>
    </Card>
  );
}