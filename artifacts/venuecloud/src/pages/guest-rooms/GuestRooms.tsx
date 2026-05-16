import { Card, CardContent } from "@/components/ui/card";

export default function GuestRooms() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guest Rooms Control</h1>
          <p className="text-muted-foreground">Manage room blocks and inventory.</p>
        </div>
      </div>

      <Card className="flex-1 flex items-center justify-center border-dashed border-2">
        <CardContent className="text-center p-12">
          <h3 className="text-lg font-semibold mb-2">Guest Room Inventory View</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This module displays a complex grid of room inventory across dates, event blocks, and locations. 
            Select an event to manage its specific room blocks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}