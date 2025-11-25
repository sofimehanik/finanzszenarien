import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProviderWrapper } from "@/components/AuthProviderWrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FinSim Beta",
  description: "Analysiere deine Finanzen und plane verschiedene Szenarien",
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  )
}

