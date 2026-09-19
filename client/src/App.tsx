import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AccessRequest from "./pages/AccessRequest";
import PendingAccess from "./pages/PendingAccess";
import Dashboard from "./pages/Dashboard";
import AdminApprovals from "./pages/AdminApprovals";
import Trends from "./pages/Trends";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";

function Splash() { return <div className="app-splash"><div className="splash-mark"><i /><i /><i /></div><b>trip ping</b><span>INSIGHT PORTAL</span></div>; }

function Entry() { return <Landing />; }

// /b2b/auth/me already tells us everything we need (type + org status), so
// there's no separate "access status" call anymore like the old trpc version.
function ApprovedGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(); const [, navigate] = useLocation();
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    if (user.type === "admin") { navigate("/admin"); return; }
    if (user.status !== "APPROVED") navigate("/pending");
  }, [loading, user, navigate]);
  if (loading || !user || user.type === "admin" || user.status !== "APPROVED") return <Splash />; return <>{children}</>;
}

function AdminRoute() { const { user, loading } = useAuth(); const [, navigate] = useLocation(); useEffect(() => { if (!loading && (!user || user.type !== "admin")) navigate("/"); }, [loading, user, navigate]); if (loading || !user || user.type !== "admin") return <Splash />; return <AdminApprovals />; }

function Router() { return <Switch>
  <Route path="/" component={Entry} />
  <Route path="/login" component={Login} />
  <Route path="/apply" component={AccessRequest} />
  <Route path="/pending" component={PendingAccess} />
  <Route path="/dashboard"><ApprovedGate><Dashboard /></ApprovedGate></Route>
  <Route path="/trends"><ApprovedGate><Trends /></ApprovedGate></Route>
  <Route path="/products/:id"><ApprovedGate><ProductDetail /></ApprovedGate></Route>
  <Route path="/products"><ApprovedGate><Products /></ApprovedGate></Route>
  <Route path="/reports"><ApprovedGate><Reports /></ApprovedGate></Route>
  <Route path="/settings"><ApprovedGate><Settings /></ApprovedGate></Route>
  <Route path="/admin" component={AdminRoute} />
  <Route path="/404" component={NotFound} />
  <Route><Redirect to="/" /></Route>
</Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster position="bottom-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
