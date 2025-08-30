import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SupplierPayablesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Payables</CardTitle>
          <CardDescription>View supplier aging and outstanding reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Supplier Payables will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}