import { useState } from "react";
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
import EventEdit from "@/pages/events/EventEdit";
import EventFinancials from "@/pages/events/EventFinancials";
import FunctionServices from "@/pages/events/FunctionServices";
import FunctionFinancials from "@/pages/events/FunctionFinancials";
import FunctionDetail from "@/pages/events/FunctionDetail";
import FunctionEdit from "@/pages/events/FunctionEdit";
import FunctionMenuEdit from "@/pages/events/FunctionMenuEdit";

import LeadsList from "@/pages/leads/LeadsList";
import LeadDetail from "@/pages/leads/LeadDetail";
import LeadEdit from "@/pages/leads/LeadEdit";

import AccountsList from "@/pages/accounts/AccountsList";
import AccountDetail from "@/pages/accounts/AccountDetail";
import AccountEdit from "@/pages/accounts/AccountEdit";

import ContactsList from "@/pages/contacts/ContactsList";
import ContactDetail from "@/pages/contacts/ContactDetail";
import ContactEdit from "@/pages/contacts/ContactEdit";

import TasksList from "@/pages/tasks/TasksList";
import TaskEdit from "@/pages/tasks/TaskEdit";

import AppointmentEdit from "@/pages/AppointmentEdit";

import GuestRooms from "@/pages/guest-rooms/GuestRooms";

import Reports from "@/pages/reports/Reports";
import ReportEdit from "@/pages/ReportEdit";
import ReportRun from "@/pages/ReportRun";
import ReportScheduledJobs from "@/pages/reports/ReportScheduledJobs";
import ReportNew from "@/pages/reports/ReportNew";

import MasterEvents from "@/pages/MasterEvents";
import MasterEventDetail from "@/pages/MasterEventDetail";
import MasterEventEdit from "@/pages/master-events/MasterEventEdit";

import GenerateDocuments from "@/pages/communication/GenerateDocuments";
import ComposeEmail from "@/pages/communication/ComposeEmail";

import Settings from "@/pages/settings/Settings";

import { QuickEntryModal } from "@/components/QuickEntryModal";
import { RecentRecordsProvider } from "@/components/RecentRecords";

const queryClient = new QueryClient();

function Router() {
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  return (
    <AppLayout onQuickEntry={() => setQuickEntryOpen(true)}>
      <Switch>
        <Route path="/" component={Dashboard} />

        {/* Events */}
        <Route path="/events/new" component={EventEdit} />
        <Route path="/events/calendar" component={EventCalendar} />
        <Route path="/events/:id/edit" component={EventEdit} />
        <Route path="/events/:id/financials" component={EventFinancials} />
        <Route path="/events/:id/functions/new" component={FunctionEdit} />
        <Route path="/events/:id/functions/:functionId/menus/:menuId/edit" component={FunctionMenuEdit} />
        <Route path="/events/:id/functions/:functionId/services" component={FunctionServices} />
        <Route path="/events/:id/functions/:functionId/financials" component={FunctionFinancials} />
        <Route path="/events/:id/functions/:functionId/edit" component={FunctionEdit} />
        <Route path="/events/:id/functions/:functionId" component={FunctionDetail} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/events" component={EventsList} />

        {/* Leads */}
        <Route path="/leads/new" component={LeadEdit} />
        <Route path="/leads/:id/edit" component={LeadEdit} />
        <Route path="/leads/:id" component={LeadDetail} />
        <Route path="/leads" component={LeadsList} />

        {/* Accounts */}
        <Route path="/accounts/new" component={AccountEdit} />
        <Route path="/accounts/:id/edit" component={AccountEdit} />
        <Route path="/accounts/:id" component={AccountDetail} />
        <Route path="/accounts" component={AccountsList} />

        {/* Contacts */}
        <Route path="/contacts/new" component={ContactEdit} />
        <Route path="/contacts/:id/edit" component={ContactEdit} />
        <Route path="/contacts/:id" component={ContactDetail} />
        <Route path="/contacts" component={ContactsList} />

        {/* Tasks */}
        <Route path="/tasks/new" component={TaskEdit} />
        <Route path="/tasks/:id/edit" component={TaskEdit} />
        <Route path="/tasks" component={TasksList} />

        {/* Appointments */}
        <Route path="/appointments/new" component={AppointmentEdit} />
        <Route path="/appointments/:id/edit" component={AppointmentEdit} />

        {/* Guest Rooms */}
        <Route path="/guest-rooms" component={GuestRooms} />

        {/* Reports */}
        <Route path="/reports/scheduled-jobs" component={ReportScheduledJobs} />
        <Route path="/reports/new" component={ReportNew} />
        <Route path="/reports/:id/edit" component={ReportEdit} />
        <Route path="/reports/:id/run" component={ReportRun} />
        <Route path="/reports" component={Reports} />

        {/* Master Events */}
        <Route path="/master-events/new" component={MasterEventEdit} />
        <Route path="/master-events/:id/edit" component={MasterEventEdit} />
        <Route path="/master-events/:id" component={MasterEventDetail} />
        <Route path="/master-events" component={MasterEvents} />

        {/* Communication */}
        <Route path="/communication/generate-documents/:eventId" component={GenerateDocuments} />
        <Route path="/communication/compose-email/:eventId" component={ComposeEmail} />

        {/* Settings */}
        <Route path="/settings" component={Settings} />

        <Route component={NotFound} />
      </Switch>

      <QuickEntryModal open={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} />
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RecentRecordsProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </RecentRecordsProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
