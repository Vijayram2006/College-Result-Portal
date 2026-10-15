import Home from "./pages/Home";
import { PasswordChangeGate } from "./components/PasswordChange";
import { ProfileEditDialog } from "./components/ProfileEdit";

export default function App() {
  return (
    <>
      <Home />
      <PasswordChangeGate />
      <ProfileEditDialog />
    </>
  );
}
