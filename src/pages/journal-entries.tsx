import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function JournalEntriesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>Record and view journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Journal Entries will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}