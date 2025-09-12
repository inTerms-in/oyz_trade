import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ItemWiseSalesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Item-wise Sales Report</CardTitle>
          <CardDescription>View sales data by individual items.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Item-wise Sales Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}