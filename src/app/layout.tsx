import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "RialTycoon — Trade real-world assets as a game",
  description:
    "RialTycoon is a GameFi tycoon game about trading tokenized real-world assets, designed for Rialo. All prices are simulated.",
  metadataBase: new URL("https://rialtycoon.rialo.app"),
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
