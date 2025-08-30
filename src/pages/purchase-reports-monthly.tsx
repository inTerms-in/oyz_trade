import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function MonthlyPurchaseSummaryPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Purchase Summary</CardTitle>
          <CardDescription>View purchase data summarized by month.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Monthly Purchase Summary will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}