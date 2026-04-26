import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ToastProvider } from "@/components/ui/Toast"
import "./globals.css"

export const metadata: Metadata = {
  title: "TimeRide — Taxis en Siguatepeque",
  description:
    "Pedí taxi en Siguatepeque y mirá quién viene en tiempo real. Foto del taxista, placa y color del vehículo, ETA en vivo.",
  manifest: "/manifest.json",
  openGraph: {
    title: "TimeRide",
    description: "Taxis en tiempo real en Siguatepeque, Honduras.",
    type: "website",
    locale: "es_HN",
    siteName: "TimeRide",
  },
  twitter: {
    card: "summary",
    title: "TimeRide — Taxis en Siguatepeque",
    description: "Pedí taxi y mirá quién viene en tiempo real.",
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
  themeColor: "#08080b",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
