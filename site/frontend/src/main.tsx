// /frontend/src/main.tsx



import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@crm/contexts/AuthContext";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { installApiNamespaceFetchInterceptor } from '@crm/api/client';

installApiNamespaceFetchInterceptor();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
