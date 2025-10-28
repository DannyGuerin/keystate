import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import ThankYou from "./pages/ThankYou";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminCoupons from "./pages/AdminCoupons";
import CampaignBuilder from "./pages/CampaignBuilder";
import Order from "./pages/Order";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/campaigns" element={<AdminCampaigns />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/campaigns/new" element={<CampaignBuilder />} />
          <Route path="/admin/campaigns/:id" element={<CampaignBuilder />} />
          <Route path="/order/:code" element={<Order />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
