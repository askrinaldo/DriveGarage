import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme";
import { AiChatWidget } from "@/components/ai-chat-widget";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import VehicleList from "@/pages/vehicle-list";
import VehicleForm from "@/pages/vehicle-form";
import VehicleDetail from "@/pages/vehicle-detail";
import ServiceForm from "@/pages/service-form";
import ReceiptForm from "@/pages/receipt-form";
import TripForm from "@/pages/trip-form";
import ClubsList from "@/pages/clubs-list";
import ClubForm from "@/pages/club-form";
import ClubDetail from "@/pages/club-detail";
import ClubInvite from "@/pages/club-invite";
import ClubGarage from "@/pages/club-garage";
import ClubForum from "@/pages/club-forum";
import ClubForumPost from "@/pages/club-forum-post";
import ClubAuditLog from "@/pages/club-audit-log";
import ClubDashboard from "@/pages/club-dashboard";
import ClubEvents from "@/pages/club-events";
import ClubEventForm from "@/pages/club-event-form";
import ClubEventDetail from "@/pages/club-event-detail";
import ClubMarketplace from "@/pages/club-marketplace";
import VehicleReminders from "@/pages/vehicle-reminders";
import VehiclePrint from "@/pages/vehicle-print";
import VehicleAiAdvice from "@/pages/vehicle-ai-advice";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Admin from "@/pages/admin";
import Help from "@/pages/help";
import VehicleTransfer from "@/pages/vehicle-transfer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const STANDALONE_ROUTES = ["/login", "/register", "/vehicle-transfer"];

function AppRoutes() {
  const [location] = useLocation();
  const isStandalone = STANDALONE_ROUTES.some((r) => location === r || location.startsWith(r + "/"));

  if (isStandalone) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/vehicle-transfer/:token" component={VehicleTransfer} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/vehicles" component={VehicleList} />
        <Route path="/vehicles/new" component={VehicleForm} />
        <Route path="/vehicles/:id" component={VehicleDetail} />
        <Route path="/vehicles/:id/edit" component={VehicleForm} />
        <Route path="/vehicles/:id/service/new" component={ServiceForm} />
        <Route path="/vehicles/:id/service/:serviceId/edit" component={ServiceForm} />
        <Route path="/vehicles/:id/receipts/new" component={ReceiptForm} />
        <Route path="/vehicles/:id/trips/new" component={TripForm} />
        <Route path="/vehicles/:id/trips/:tripId/edit" component={TripForm} />
        <Route path="/vehicles/:id/reminders" component={VehicleReminders} />
        <Route path="/vehicles/:id/print" component={VehiclePrint} />
        <Route path="/vehicles/:id/ai-advice" component={VehicleAiAdvice} />
        <Route path="/clubs" component={ClubsList} />
        <Route path="/clubs/invite/:code" component={ClubInvite} />
        <Route path="/clubs/new" component={ClubForm} />
        <Route path="/clubs/:id/garage" component={ClubGarage} />
        <Route path="/clubs/:id/forum/:postId" component={ClubForumPost} />
        <Route path="/clubs/:id/forum" component={ClubForum} />
        <Route path="/clubs/:id/dashboard" component={ClubDashboard} />
        <Route path="/clubs/:id/events/new" component={ClubEventForm} />
        <Route path="/clubs/:id/events/:eventId/edit" component={ClubEventForm} />
        <Route path="/clubs/:id/events/:eventId" component={ClubEventDetail} />
        <Route path="/clubs/:id/events" component={ClubEvents} />
        <Route path="/clubs/:id/marketplace" component={ClubMarketplace} />
        <Route path="/clubs/:id/audit-log" component={ClubAuditLog} />
        <Route path="/clubs/:id/edit" component={ClubForm} />
        <Route path="/clubs/:id" component={ClubDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/help" component={Help} />
        <Route path="/vehicle-transfer/:token" component={VehicleTransfer} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
            <AiChatWidget />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
