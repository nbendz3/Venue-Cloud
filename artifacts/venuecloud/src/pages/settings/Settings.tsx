import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Property Settings</h1>
        <p className="text-muted-foreground">Manage configuration for The Pines Resort.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full" defaultValue="enterprise">
            <AccordionItem value="enterprise" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 data-[state=open]:bg-muted/50 font-semibold text-lg border-b">
                Enterprise & Property
              </AccordionTrigger>
              <AccordionContent className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="propName">Property Name</Label>
                    <Input id="propName" defaultValue="The Pines Resort" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propCode">Property Code</Label>
                    <Input id="propCode" defaultValue="PINES" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" defaultValue="America/Los_Angeles" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Input id="currency" defaultValue="USD" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <Separator />
            <AccordionItem value="events" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 data-[state=open]:bg-muted/50 font-semibold text-lg border-b">
                Events & Functions
              </AccordionTrigger>
              <AccordionContent className="px-6 py-6">
                <div className="text-muted-foreground text-sm mb-4">Manage event statuses, types, and defaults.</div>
                <Button variant="outline" className="mr-2">Manage Statuses</Button>
                <Button variant="outline">Manage Event Types</Button>
              </AccordionContent>
            </AccordionItem>
            <Separator />
            <AccordionItem value="users" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 data-[state=open]:bg-muted/50 font-semibold text-lg">
                Users & Security
              </AccordionTrigger>
              <AccordionContent className="px-6 py-6">
                <div className="text-muted-foreground text-sm mb-4">Manage user roles, permissions, and access.</div>
                <Button variant="outline" className="mr-2">User Directory</Button>
                <Button variant="outline">Role Configuration</Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}