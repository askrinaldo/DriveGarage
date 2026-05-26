import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
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
        <Route path="/clubs" component={ClubsList} />
        <Route path="/clubs/invite/:code" component={ClubInvite} />
        <Route path="/clubs/new" component={ClubForm} />
        <Route path="/clubs/:id/garage" component={ClubGarage} />
        <Route path="/clubs/:id/edit" component={ClubForm} />
        <Route path="/clubs/:id" component={ClubDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
