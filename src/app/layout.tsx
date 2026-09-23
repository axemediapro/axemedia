import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "AXEmedia - Menaxhim Biznesi",
  description: "Platform moderne për menaxhim klientësh, faturash dhe postimesh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 pb-20 md:pb-6 overflow-x-hidden">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>

    </html>
  );
}
