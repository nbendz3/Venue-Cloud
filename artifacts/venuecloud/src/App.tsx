import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import EventsList from "@/pages/events/EventsList";
import EventCalendar from "@/pages/events/EventCalendar";
import EventDetail from "@/pages/events/EventDetail";
import LeadsList from "@/pages/leads/LeadsList";
import LeadDetail from "@/pages/leads/LeadDetail";
import AccountsList from "@/pages/accounts/AccountsList";
import AccountDetail from "@/pages/accounts/AccountDetail";
import ContactsList from "@/pages/contacts/ContactsList";
import ContactDetail from "@/pages/contacts/ContactDetail";
import TasksList from "@/pages/tasks/TasksList";
import GuestRooms from "@/pages/guest-rooms/GuestRooms";
import Reports from "@/pages/reports/Reports";
import Settings from "@/pages/settings/Settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        <Route path="/events" component={EventsList} />
        <Route path="/events/calendar" component={EventCalendar} />
        <Route path="/events/:id" component={EventDetail} />
        
        <Route path="/leads" component={LeadsList} />
        <Route path="/leads/:id" component={LeadDetail} />
        
        <Route path="/accounts" component={AccountsList} />
        <Route path="/accounts/:id" component={AccountDetail} />
        
        <Route path="/contacts" component={ContactsList} />
        <Route path="/contacts/:id" component={ContactDetail} />
        
        <Route path="/tasks" component={TasksList} />
        
        <Route path="/guest-rooms" component={GuestRooms} />
        
        <Route path="/reports" component={Reports} />
        
        <Route path="/settings" component={Settings} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
