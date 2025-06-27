import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "regenerator-runtime/runtime"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Eco del Hechicero - Aventura de Voz",
  description: "Un juego retro controlado por comandos de voz",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='55' font-size='80' text-anchor='middle' dominant-baseline='middle'>🧙‍♂️</text></svg>",
  },
    generator: 'v0.dev'
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
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='55' font-size='80' text-anchor='middle' dominant-baseline='middle'>🧙‍♂️</text></svg>"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
