import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SalesReturnPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Return</CardTitle>
          <CardDescription>Manage sales returns.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Sales Return will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}