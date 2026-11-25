import { Opening } from "@/components/opening/Opening";
import { Landing, StickyCta } from "@/components/landing/Landing";
import { LoginRedirect } from "@/components/ui/GoogleButton";

export default function Home() {
  return (
    <main>
      <LoginRedirect />
      <Opening />
      <Landing />
      <StickyCta />
    </main>
  );
}
