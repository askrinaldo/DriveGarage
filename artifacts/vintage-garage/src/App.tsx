import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/contexts/theme";
import { ClerkProvider, useAuth, useSession } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { nbNO } from "@clerk/localizations";
import { lazy, Suspense } from "react";
import { setClerkTokenGetter } from "@workspace/api-client-react";
import { PageSkeleton } from "@/components/ui-states";
import { CookieNotice } from "@/components/cookie-notice";

// ── Lazy-loaded pages ─────────────────────────────────────────
// Each becomes its own JS chunk; only downloaded when first navigated to.
const LandingPage      = lazy(() => import("@/pages/landing"));
const Dashboard        = lazy(() => import("@/pages/dashboard"));
const VehicleList      = lazy(() => import("@/pages/vehicle-list"));
const VehicleForm      = lazy(() => import("@/pages/vehicle-form"));
const VehicleDetail    = lazy(() => import("@/pages/vehicle-detail"));
const ServiceForm      = lazy(() => import("@/pages/service-form"));
const ReceiptForm      = lazy(() => import("@/pages/receipt-form"));
const TripForm         = lazy(() => import("@/pages/trip-form"));
const ClubsList        = lazy(() => import("@/pages/clubs-list"));
const ClubForm         = lazy(() => import("@/pages/club-form"));
const ClubDetail       = lazy(() => import("@/pages/club-detail"));
const ClubInvite       = lazy(() => import("@/pages/club-invite"));
const ClubGarage       = lazy(() => import("@/pages/club-garage"));
const ClubForum        = lazy(() => import("@/pages/club-forum"));
const ClubForumPost    = lazy(() => import("@/pages/club-forum-post"));
const ClubAuditLog     = lazy(() => import("@/pages/club-audit-log"));
const ClubDashboard    = lazy(() => import("@/pages/club-dashboard"));
const ClubEvents       = lazy(() => import("@/pages/club-events"));
const ClubEventForm    = lazy(() => import("@/pages/club-event-form"));
const ClubEventDetail  = lazy(() => import("@/pages/club-event-detail"));
const ClubMarketplace  = lazy(() => import("@/pages/club-marketplace"));
const VehicleReminders = lazy(() => import("@/pages/vehicle-reminders"));
const VehiclePrint     = lazy(() => import("@/pages/vehicle-print"));
const VehicleAiAdvice  = lazy(() => import("@/pages/vehicle-ai-advice"));
const Admin            = lazy(() => import("@/pages/admin"));
const Help             = lazy(() => import("@/pages/help"));
const VehicleTransfer  = lazy(() => import("@/pages/vehicle-transfer"));
const MembershipCard   = lazy(() => import("@/pages/membership-card"));
const Profile          = lazy(() => import("@/pages/profile"));
const SignInPage        = lazy(() => import("@/pages/sign-in"));
const SignUpPage        = lazy(() => import("@/pages/sign-up"));
const PublicGarage     = lazy(() => import("@/pages/public-garage"));
const PrivacyPage      = lazy(() => import("@/pages/privacy"));
const TermsPage        = lazy(() => import("@/pages/terms"));
const CookiesPage      = lazy(() => import("@/pages/cookies"));
const ContactPage      = lazy(() => import("@/pages/contact"));
const PricingPage      = lazy(() => import("@/pages/pricing"));
const Billing          = lazy(() => import("@/pages/billing"));
const SettingsPage     = lazy(() => import("@/pages/settings"));
const NotFound         = lazy(() => import("@/pages/not-found"));

// ── React Query client ────────────────────────────────────────
// staleTime: 60 s → cached data is considered fresh for 60 s, eliminating
//   duplicate network requests when navigating back to a page.
// gcTime: 10 min → keeps inactive cache entries in memory across navigations,
//   so returning to a page restores data instantly.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 10 * 60_000,
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

const STANDALONE_ROUTES = [
  "/vehicle-transfer", "/",
  "/sign-in", "/sign-up", "/privacy", "/terms", "/cookies", "/contact", "/pricing",
];

function AppRoutes() {
  const [location] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  const isStandalone =
    location === "/" ||
    STANDALONE_ROUTES.filter((r) => r !== "/").some(
      (r) => location === r || location.startsWith(r + "/"),
    );

  if (isStandalone) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/vehicle-transfer/:token" component={VehicleTransfer} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/cookies" component={CookiesPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/">
            {isLoaded && isSignedIn ? <Redirect to="/dashboard" /> : <LandingPage />}
          </Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
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
          <Route path="/admin" component={Admin} />
          <Route path="/membership-card" component={MembershipCard} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/help" component={Help} />
          <Route path="/billing" component={Billing} />
          <Route path="/garage/:username" component={PublicGarage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
      localization={{
          ...nbNO,
          signIn: {
            ...(nbNO.signIn as Record<string, unknown>),
            start: {
              ...((nbNO.signIn as Record<string, Record<string, unknown>>)?.start),
              subtitle: "for å fortsette til DriveGarage",
            },
          },
          signUp: {
            ...(nbNO.signUp as Record<string, unknown>),
            start: {
              ...((nbNO.signUp as Record<string, Record<string, unknown>>)?.start),
              subtitle: "for å fortsette til DriveGarage",
            },
          },
        }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={`${basePath}/`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        baseTheme: dark,
        cssLayerName: "clerk",
        layout: {
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
          logoLinkUrl: `${window.location.origin}${basePath}/`,
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "blockButton",
          privacyPageUrl: `${window.location.origin}${basePath}/privacy`,
          termsPageUrl: `${window.location.origin}${basePath}/terms`,
        },
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0d0f1a",
          colorInput: "rgba(255,255,255,0.05)",
          colorInputForeground: "#f8fafc",
          colorForeground: "#f8fafc",
          colorNeutral: "#94a3b8",
          fontFamily: "Inter, sans-serif",
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
      <CookieNotice />
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
