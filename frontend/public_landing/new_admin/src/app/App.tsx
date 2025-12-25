import { Routes, Route, Navigate } from "react-router-dom";
import { AccountPage } from "../../pages/account/AccountPage";
import { LoginPage } from "../../pages/login/LoginPage";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "next-themes";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="size-full">
        <Routes>
          <Route path="/" element={<Navigate to="/account" replace />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}