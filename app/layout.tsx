import type { Metadata } from "next";
import "@/styles/globals.scss";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "Forge",
  description: "Learn, understand, build, and share.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
