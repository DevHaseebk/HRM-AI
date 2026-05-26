import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "nprogress/nprogress.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/shared/toast-provider";
import { NProgressProvider } from "@/components/shared/nprogress-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HRFlow | HR Management",
  description: "Human Resource Management System for Pakistan-based organizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geistSans.variable)}
      suppressHydrationWarning
    >
      <body className={`${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <NProgressProvider />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
