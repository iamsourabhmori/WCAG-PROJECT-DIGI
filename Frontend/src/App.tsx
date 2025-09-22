
// App.tsx

// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Index from "./pages/Index";
// import NotFound from "./pages/NotFound";
// import "./App.css"; // ensure skip link styles are included

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       {/* Accessibility: Skip link for keyboard users */}
//       <a href="#main-content" className="skip-link">
//         Skip to main content
//       </a>

//       {/* Screen reader live region for alerts/toasts */}
//       <div aria-live="assertive" aria-atomic="true">
//         <Toaster />
//         <Sonner />
//       </div>

//       <BrowserRouter>
//         <main id="main-content" role="main" tabIndex={-1}>
//           <Routes>
//             <Route path="/" element={<Index />} aria-label="Home Page" />
//             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//             <Route path="*" element={<NotFound />} aria-label="Page Not Found" />
//           </Routes>
//         </main>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;


//-----------------------------------------------------------------------------------------------------------------------

// App.tsx

// App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "./App.css"; // ensure skip link styles are included

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Accessibility: Skip link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Screen reader live region for alerts/toasts */}
      <div aria-live="assertive" aria-atomic="true">
        <Toaster />
        <Sonner />
      </div>

      <BrowserRouter>
        <main id="main-content" role="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Index />} aria-label="Home Page" />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} aria-label="Page Not Found" />
          </Routes>
        </main>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
