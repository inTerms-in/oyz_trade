import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SupplierWisePayablesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier-wise Payables</CardTitle>
          <CardDescription>View outstanding amounts to suppliers.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Supplier-wise Payables will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}