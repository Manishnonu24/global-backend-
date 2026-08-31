import AuthProvider from "@/components/providers/SessionProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import SessionTimeoutHandler from "@/components/utils/SessionTimeoutHandler";
import { Suspense } from "react";
import { Toaster } from "sonner";
import "@/core/listeners";
import { headers } from "next/headers";

import { Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getLayoutData } from "@/services/layout.service";

const poppins = Poppins({
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

function getFaviconMimeType(url) {
  if (!url) return "image/x-icon";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".svg")) return "image/svg+xml";
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "image/jpeg";
  if (cleanUrl.endsWith(".gif")) return "image/gif";
  return "image/x-icon";
}

export async function generateMetadata() {
  const layout = await getLayoutData();
  const faviconUrl = layout.faviconUrl || "/images/Logo-web.webp";
  const faviconType = getFaviconMimeType(faviconUrl);

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://global-backend.ahealthplace.com";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${layout.siteName || "Global Backend"} — Admin`,
      template: `%s | ${layout.siteName || "Global Backend"} Admin`,
    },
    description: "Global Backend — Dashboard & CRM portal for ahealthplace.",
    icons: {
      icon: [{ url: faviconUrl, type: faviconType }],
      shortcut: [{ url: faviconUrl, type: faviconType }],
      apple: [{ url: faviconUrl }],
    },
  };
}

export default async function RootLayout({ children }) {
  const layout = await getLayoutData();
  const faviconUrl = layout.faviconUrl || "/images/Logo-web.webp";
  const faviconType = getFaviconMimeType(faviconUrl);

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  // In global-backend every route is a dashboard/CRM route
  const basePath = "/api/auth";

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfair.variable}`}
      suppressHydrationWarning>
      <head>
        <link rel="icon" type={faviconType} href={faviconUrl} />
        <link rel="shortcut icon" type={faviconType} href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
      </head>
      <body className="flex flex-col min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider basePath={basePath}>
            <SessionTimeoutHandler timeoutMinutes={30} />
            <div className="flex flex-col min-h-screen w-full">
              <main className="flex-grow flex flex-col w-full">
                {children}
              </main>
            </div>
            <Toaster richColors position="top-right" closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
