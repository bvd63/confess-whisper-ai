import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { InstagramBottomNav } from "./components/InstagramBottomNav";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Bookmarks from "./pages/Bookmarks";
import Following from "./pages/Following";
import SearchUsers from "./pages/SearchUsers";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";
import Compose from "./pages/Compose";
import Auth from "./pages/Auth";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <AnalyticsProvider>
        <Sonner />
        <BrowserRouter>
          <div className="relative pb-16">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/u/:handle" element={<UserProfile />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/following" element={<Following />} />
              <Route path="/search-users" element={<SearchUsers />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-canceled" element={<PaymentCanceled />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <InstagramBottomNav />
          </div>
        </BrowserRouter>
      </AnalyticsProvider>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
