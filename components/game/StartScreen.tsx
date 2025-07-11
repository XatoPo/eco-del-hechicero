"use client"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Book, Copyright, Play, Scroll, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { DialogDescription } from "@radix-ui/react-dialog"
import { Badge } from "../ui/badge"
import { Separator } from "@radix-ui/react-context-menu"

interface StartScreenProps {
  onStart: () => void
  onShowStory: () => void
  onShowEnemyGuide: () => void
}

const COLORS = {
  UI_BG: "#0D0D0D",
  UI_BORDER: "#FFB300",
  UI_TEXT: "#FFF8E1",
  ACCENT: "#FF8F00",
}

export default function StartScreen({ onStart, onShowStory, onShowEnemyGuide }: StartScreenProps) {
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null)
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)

  useEffect(() => {
    // Create and play background music
    const audio = new Audio("/sounds/menu-music.mp3")
    audio.loop = true
    audio.volume = 0.3

    const playMusic = async () => {
      try {
        await audio.play()
        setBackgroundMusic(audio)
      } catch (error) {
        console.log("Could not play background music:", error)
      }
    }

    playMusic()

    return () => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [])

  const handleStart = () => {
    if (backgroundMusic) {
      backgroundMusic.pause()
      backgroundMusic.currentTime = 0
    }
    onStart()
  }

  return (
    <div
      className="flex min-h-[400px] sm:min-h-[600px] w-full flex-col items-center justify-center rounded-lg border-4 p-4 sm:p-8 text-center font-mono"
      style={{
        backgroundColor: COLORS.UI_BG,
        borderColor: COLORS.UI_BORDER,
        color: COLORS.UI_TEXT,
        background: `linear-gradient(135deg, ${COLORS.UI_BG} 0%, #1A0F08 50%, ${COLORS.UI_BG} 100%)`,
      }}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="mb-4 sm:mb-8"
      >
        <h1
          className="mb-2 sm:mb-4 text-3xl sm:text-6xl font-bold tracking-wider"
          style={{
            color: COLORS.UI_BORDER,
            textShadow: `0 0 20px ${COLORS.UI_BORDER}, 0 0 40px ${COLORS.ACCENT}`,
          }}
        >
          ⚡ ECO DEL HECHICERO ⚡
        </h1>
        <p className="text-lg sm:text-xl" style={{ color: COLORS.ACCENT }}>
          🎮 AVENTURA RETRO DE MAGIA Y VOZ 🎮
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mb-4 sm:mb-8 max-w-2xl px-4"
      >
        <p className="mb-4 sm:mb-6 text-base sm:text-lg leading-relaxed">
          En las tierras místicas de Eldoria, Kael el Hechicero ha perdido su voz tras sellar al Señor Oscuro.
          <br />
          <span style={{ color: COLORS.ACCENT }}>TÚ eres su nueva voz.</span>
          <br />
          Usa comandos de voz para ayudarlo a recuperar sus poderes y salvar el reino.
        </p>

        <div
          className="mb-4 sm:mb-6 rounded-lg border-2 p-3 sm:p-4"
          style={{
            borderColor: COLORS.ACCENT,
            backgroundColor: `${COLORS.UI_BG}CC`,
          }}
        >
          <p className="mb-2 font-bold text-sm sm:text-base" style={{ color: COLORS.UI_BORDER }}>
            🎤 REQUISITOS:
          </p>
          <p className="text-xs sm:text-sm">
            Este juego requiere acceso a tu micrófono para los comandos de voz.
            <br />
            Asegúrate de permitir el acceso cuando se solicite.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center"
      >
        <Button
          onClick={handleStart}
          className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold border-2 hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: COLORS.UI_BORDER,
            borderColor: COLORS.ACCENT,
            color: COLORS.UI_BG,
          }}
        >
          <Play className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          COMENZAR AVENTURA
        </Button>

        <Button
          onClick={onShowStory}
          variant="outline"
          className="px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-bold border-2 hover:opacity-80 transition-opacity bg-transparent"
          style={{
            backgroundColor: "transparent",
            borderColor: COLORS.UI_BORDER,
            color: COLORS.UI_BORDER,
          }}
        >
          <Scroll className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          HISTORIA
        </Button>

        <Button
          onClick={onShowEnemyGuide}
          variant="outline"
          className="px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-bold border-2 hover:opacity-80 transition-opacity bg-transparent"
          style={{
            backgroundColor: "transparent",
            borderColor: COLORS.UI_BORDER,
            color: COLORS.UI_BORDER,
          }}
        >
          <Book className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          BESTIARIO
        </Button>

        {/* Credits button */}
        <Dialog open={isCreditsOpen} onOpenChange={setIsCreditsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-bold border-2 hover:opacity-80 transition-opacity bg-transparent"
              style={{
                backgroundColor: "transparent",
                borderColor: COLORS.UI_BORDER,
                color: COLORS.UI_BORDER,
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Créditos
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-amber-500/50 text-amber-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-amber-400 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Créditos del Juego
              </DialogTitle>
              <DialogDescription className="text-amber-200/80">
                Información sobre los desarrolladores y licencias
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Developers */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                  👨‍💻 Desarrolladores
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/50 text-amber-200">
                      Lead Developer
                    </Badge>
                    <span>Flavio Sebastian Villanueva Medina</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/50 text-amber-200">
                      Co-Developer
                    </Badge>
                    <span>Gerardo Daniel Aldana Leiva</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-amber-500/30" />

              {/* Technologies */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                  🛠️ Tecnologías Utilizadas
                </h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-200">
                    Next.js
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-200">
                    React
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-200">
                    TypeScript
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-200">
                    Tailwind CSS
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-200">
                    Web Speech API
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-200">
                    Canvas API
                  </Badge>
                </div>
              </div>

              <Separator className="bg-amber-500/30" />

              {/* Copyright */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                  <Copyright className="w-4 h-4" />
                  Derechos de Autor
                </h3>
                <div className="text-xs text-amber-200/80 space-y-1">
                  <p>© 2025 Flavio Sebastian Villanueva Medina & Gerardo Daniel Aldana Leiva</p>
                  <p>Todos los derechos reservados.</p>
                  <p className="mt-2 text-amber-300">
                    Este proyecto fue desarrollado con fines educativos y de demostración tecnológica.
                  </p>
                </div>
              </div>

              <Separator className="bg-amber-500/30" />

              {/* License */}
              <div>
                <h3 className="text-amber-400 font-semibold mb-2">📄 Licencia</h3>
                <div className="text-xs text-amber-200/80 space-y-1">
                  <p>Este software se distribuye bajo una licencia educativa.</p>
                  <p>El uso comercial requiere autorización expresa de los autores.</p>
                  <p className="mt-2 font-medium text-amber-300">
                    Para consultas sobre licenciamiento, contactar a los desarrolladores.
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-4 sm:mt-8 text-xs sm:text-sm opacity-75 px-4"
      >
        <p>Usa las flechas ← → para moverte, ESPACIO para saltar</p>
        <p>Comandos de voz: "FUEGO", "LUZ", "ESCUDO", "CURAR", "SALTAR", "ATRÁS", "ADELANTE"</p>
      </motion.div>
    </div>
  )
}
