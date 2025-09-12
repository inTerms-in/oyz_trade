import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CategoryWiseSalesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Category-wise Sales Report</CardTitle>
          <CardDescription>View sales data grouped by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Category-wise Sales Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}