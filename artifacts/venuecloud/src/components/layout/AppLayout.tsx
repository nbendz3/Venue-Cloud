import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  CalendarDays, 
  Users, 
  CheckSquare, 
  Building2, 
  Contact2, 
  FileText, 
  BedDouble, 
  Settings,
  Search,
  HelpCircle,
  MoreHorizontal,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: CalendarDays, label: "Events", href: "/events" },
  { icon: Users, label: "Event Leads", href: "/leads" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: Building2, label: "Accounts", href: "/accounts" },
  { icon: Contact2, label: "Contacts", href: "/contacts" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: BedDouble, label: "Guest Rooms", href: "/guest-rooms" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col text-sidebar-foreground">
        <div className="h-14 flex items-center px-4 font-bold text-lg border-b border-sidebar-border shadow-sm">
          The Pines Resort
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shadow-sm z-10 flex-shrink-0">
          <div className="font-semibold text-lg">VenueCloud</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Search className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MessageSquare className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><HelpCircle className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
            <Avatar className="h-8 w-8 ml-2">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">JS</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Recent Items Bar */}
        <div className="h-8 bg-muted/50 border-b flex items-center px-4 gap-4 text-xs overflow-x-auto flex-shrink-0">
          <span className="text-muted-foreground font-medium flex-shrink-0">Recent:</span>
          {/* Placeholder for recent items */}
          <Link href="/events/1" className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors whitespace-nowrap">
            <CalendarDays className="h-3 w-3 text-blue-500" />
            Acme Corp Retreat
          </Link>
          <Link href="/leads/5" className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors whitespace-nowrap">
            <Users className="h-3 w-3 text-amber-500" />
            Tech Summit 2025
          </Link>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
