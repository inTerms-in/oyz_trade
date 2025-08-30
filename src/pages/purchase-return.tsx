import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PurchaseReturnPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Return</CardTitle>
          <CardDescription>Manage purchase returns.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Purchase Return will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}