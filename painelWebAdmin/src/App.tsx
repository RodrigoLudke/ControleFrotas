import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import RegistrarVeiculos from "./pages/RegistrarVeiculos.tsx";
import RegistrarMotoristas from "./pages/RegistrarMotoristas.tsx";
import Veiculos from "./pages/Veiculos.tsx";
import Motoristas from "./pages/Motoristas.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/index" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          <Route path="/registrarveiculos" element={<RegistrarVeiculos />} />
          <Route path="/registrarveiculos/:id" element={<RegistrarVeiculos />} />
          <Route path="/registrarmotoristas" element={<RegistrarMotoristas />} />
          <Route path="/registrarmotoristas/:id" element={<RegistrarMotoristas />} />
          <Route path="/veiculos" element={<Veiculos />} />
          <Route path="/motoristas" element={<Motoristas />} />


        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
