import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme";
import { AiChatWidget } from "@/components/ai-chat-widget";
import NotFound from "@/pages/not-found";
import { ClerkProvider, useAuth, useSession } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { useEffect } from "react";
import { setClerkTokenGetter } from "@workspace/api-client-react";

import LandingPage from "@/pages/landing";
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
import Billing from "@/pages/billing";
import MembershipCard from "@/pages/membership-card";
import TenantSettings from "@/pages/tenant-settings";
import TenantInvite from "@/pages/tenant-invite";
import TenantNew from "@/pages/tenant-new";
import Profile from "@/pages/profile";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import PublicGarage from "@/pages/public-garage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// REQUIRED — resolves key from hostname so same build serves multiple Clerk domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — undefined in dev (empty string must become undefined). Auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;

// Clerk passes full paths; wouter's setLocation prepends base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const STANDALONE_ROUTES = ["/login", "/register", "/vehicle-transfer", "/", "/sign-in", "/sign-up"];

function AppRoutes() {
  const [location] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  const isStandalone =
    location === "/" ||
    STANDALONE_ROUTES.filter((r) => r !== "/").some(
      (r) => location === r || location.startsWith(r + "/")
    );

  if (isStandalone) {
    return (
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/vehicle-transfer/:token" component={VehicleTransfer} />
        <Route path="/">
          {isLoaded && isSignedIn ? <Redirect to="/dashboard" /> : <LandingPage />}
        </Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
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
        <Route path="/billing" component={Billing} />
        <Route path="/admin" component={Admin} />
        <Route path="/membership-card" component={MembershipCard} />
        <Route path="/org/settings" component={TenantSettings} />
        <Route path="/tenant-invite/:code" component={TenantInvite} />
        <Route path="/tenant-new" component={TenantNew} />
        <Route path="/profile" component={Profile} />
        <Route path="/help" component={Help} />
        <Route path="/garage/:username" component={PublicGarage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function ClerkTokenInjector() {
  const { session } = useSession();
  // Register synchronously on every render so the getter is always current.
  // customFetch awaits this before every API call, so no race condition.
  if (session) {
    setClerkTokenGetter(() => session.getToken());
  } else {
    setClerkTokenGetter(null);
  }
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={`${basePath}/`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        baseTheme: dark,
        cssLayerName: "clerk",
        options: {
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
          logoLinkUrl: `${basePath}/`,
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "iconButton",
        },
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0d0f1a",
          colorInput: "rgba(255,255,255,0.05)",
          colorInputForeground: "#f8fafc",
          colorForeground: "#f8fafc",
          colorNeutral: "#94a3b8",
          fontFamily: "Outfit, sans-serif",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "shadow-2xl border border-white/10",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold",
        },
      }}
    >
      <ClerkTokenInjector />
      <AppRoutes />
      <AiChatWidget />
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
