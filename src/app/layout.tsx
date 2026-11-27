import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = { title: { default: "CoLearn", template: "%s · CoLearn" }, description: "Personalised lesson planning and learning." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="font-sans antialiased">{children}<Toaster richColors position="top-center" theme="light" /></body></html>;
}
