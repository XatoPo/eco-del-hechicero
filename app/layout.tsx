import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "regenerator-runtime/runtime"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "🧙‍♂️ Eco del Hechicero - Aventura de Voz",
  description: "Un juego retro controlado por comandos de voz",
  generator: "v0.dev",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 fontSize=%2280%22>🧙‍♂️</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 fontSize=%2280%22>🧙‍♂️</text></svg>"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
