import { Opening } from "@/components/opening/Opening";
import { Landing, StickyCta } from "@/components/landing/Landing";
import { LoginRedirect } from "@/components/ui/GoogleButton";
import { LiveMarketProvider } from "@/lib/market/LiveMarketContext";

export default function Home() {
  return (
    <main>
      <LoginRedirect />
      <LiveMarketProvider>
        <Opening />
        <Landing />
      </LiveMarketProvider>
      <StickyCta />
    </main>
  );
}
