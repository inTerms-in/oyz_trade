import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FastSlowMovingItemsPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Fast-moving vs Slow-moving Items</CardTitle>
          <CardDescription>Analyze item movement to identify fast and slow sellers.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Fast-moving vs Slow-moving Items will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}