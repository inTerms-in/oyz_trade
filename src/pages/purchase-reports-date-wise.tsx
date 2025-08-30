import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DateWisePurchasePage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Date-wise Purchase Report</CardTitle>
          <CardDescription>View purchase data by date.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Date-wise Purchase Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}