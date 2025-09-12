import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InventoryCategoryWiseStockPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Category-wise Stock Report</CardTitle>
          <CardDescription>View stock levels grouped by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Category-wise Stock Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}