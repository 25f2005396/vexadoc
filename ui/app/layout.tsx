import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "Vexadoc",
  description: "Enterprise RAG Platform for Intelligent Document Conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved theme before the page becomes visible. */}
        <Script
          id="vexadoc-theme-bootstrap"
          strategy="beforeInteractive"
        >{`
          (function () {
            try {
              var savedTheme = localStorage.getItem("vexadoc-theme");
              var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              var shouldUseDark =
                savedTheme === "dark" ||
                (savedTheme !== "light" && prefersDark);

              document.documentElement.classList.toggle("dark", shouldUseDark);
            } catch (error) {
              // Ignore localStorage or matchMedia errors.
            }
          })();
        `}</Script>
      </head>

      <body className="min-h-full flex flex-col">
        {children}

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            success: {
              style: {
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                fontSize: "14px",
                padding: "12px 16px",
              },
              iconTheme: {
                primary: "#16a34a",
                secondary: "#f0fdf4",
              },
            },
            error: {
              style: {
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                fontSize: "14px",
                padding: "12px 16px",
              },
              iconTheme: {
                primary: "#dc2626",
                secondary: "#fef2f2",
              },
            },
          }}
        />
      </body>
    </html>
  );
}