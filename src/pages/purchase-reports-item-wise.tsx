import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ItemWisePurchasesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Item-wise Purchases</CardTitle>
          <CardDescription>View purchase data by individual items.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Item-wise Purchases will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}