import type { Metadata, Viewport } from "next"
import { ToastProvider } from "@/components/ui/Toast"
import "./globals.css"

export const metadata: Metadata = {
  title: "TimeRide — Transporte en Siguatepeque",
  description:
    "Conecta con conductores de taxi, microbús y bus en Siguatepeque en tiempo real. Pide rides o publica tu ruta.",
  manifest: "/manifest.json",
  openGraph: {
    title: "TimeRide",
    description: "Transporte en tiempo real en Siguatepeque, Honduras.",
    type: "website",
    locale: "es_HN",
    siteName: "TimeRide",
  },
  twitter: {
    card: "summary",
    title: "TimeRide — Transporte en Siguatepeque",
    description: "Conecta con conductores de taxi, microbús y bus en tiempo real.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
