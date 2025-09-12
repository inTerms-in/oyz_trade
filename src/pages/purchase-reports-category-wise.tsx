import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CategoryWisePurchasesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Category-wise Purchases</CardTitle>
          <CardDescription>View purchase data grouped by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Category-wise Purchases will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}