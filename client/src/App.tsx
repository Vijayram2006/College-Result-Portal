import Home from "./pages/Home";
import { PasswordChangeGate } from "./components/PasswordChange";
import { ProfileEditDialog } from "./components/ProfileEdit";
import { ServerWakeBanner } from "./components/ServerWake";
import ErrorBoundary, { installGlobalErrorReporting } from "./components/ErrorBoundary";

installGlobalErrorReporting();

export default function App() {
  return (
    <ErrorBoundary>
      <Home />
      <PasswordChangeGate />
      <ProfileEditDialog />
      <ServerWakeBanner />
    </ErrorBoundary>
  );
}
