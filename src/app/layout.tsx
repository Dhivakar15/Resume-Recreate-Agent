import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resume Recreate Agent AI — Build an ATS-Friendly Resume with AI",
  description:
    "Create, recreate and optimize professional, ATS-friendly resumes with AI. Multi-step builder, live preview, ATS score, job description matching, PDF and LaTeX export.",
  keywords: ["resume builder", "ATS resume", "AI resume", "resume recreation", "job match", "LaTeX resume"],
  authors: [{ name: "Resume Recreate Agent AI" }],
  openGraph: {
    title: "Resume Recreate Agent AI",
    description: "Build an ATS-Friendly Resume with AI",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
