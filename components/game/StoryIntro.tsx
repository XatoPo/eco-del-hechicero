"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface StoryIntroProps {
  onClose: () => void
}

const COLORS = {
  UI_BG: "#0D0D0D",
  UI_BORDER: "#FFB300",
  UI_TEXT: "#FFF8E1",
  ACCENT: "#FF8F00",
}

export default function StoryIntro({ onClose }: StoryIntroProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const storyPages = [
    {
      title: "El Reino de Eldoria",
      text: "En las tierras místicas de Eldoria, donde la magia fluye como ríos de luz, vivía Kael, el último Hechicero Guardián del reino. Su poder era legendario, capaz de controlar los elementos con su voz.",
      icon: "🏰",
    },
    {
      title: "La Gran Batalla",
      text: "Cuando el Señor Oscuro amenazó con sumir el mundo en tinieblas eternas, Kael se enfrentó a él en una batalla épica. El combate duró tres días y tres noches, sacudiendo los cimientos del reino.",
      icon: "⚔️",
    },
    {
      title: "El Sacrificio",
      text: "Para sellar al enemigo para siempre, Kael sacrificó su propia voz, el origen de su poder mágico. El Señor Oscuro fue derrotado, pero el hechicero quedó mudo y sin magia.",
      icon: "🔮",
    },
    {
      title: "El Eco Ancestral",
      text: "Los antiguos pergaminos hablan del 'Eco del Hechicero': un ritual donde una voz externa puede canalizar la magia perdida. Tú eres esa voz, el eco que Kael necesita.",
      icon: "📜",
    },
    {
      title: "El Sello Roto",
      text: "Pero el sello se debilita. Las criaturas oscuras han comenzado a escapar, y solo recuperando los poderes de Kael se puede restaurar el equilibrio antes de que sea demasiado tarde.",
      icon: "🌟",
    },
    {
      title: "Tu Misión",
      text: "Atraviesa los 8 reinos corrompidos: desde el Bosque de los Susurros hasta el Nexo del Vacío. Usa tu voz para guiar a Kael a través de cada desafío, ayúdalo a recuperar su magia y salva Eldoria de la oscuridad eterna.",
      icon: "🎯",
    },
  ]

  const handleNext = () => {
    if (currentPage < storyPages.length - 1) {
      setCurrentPage(currentPage + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono"
      style={{ backgroundColor: `${COLORS.UI_BG}F0` }}
    >
      <div
        className="relative w-full max-w-4xl h-[80vh] rounded-xl border-4 p-8 overflow-hidden"
        style={{
          backgroundColor: COLORS.UI_BG,
          borderColor: COLORS.UI_BORDER,
          background: `linear-gradient(135deg, ${COLORS.UI_BG} 0%, #1A0F08 50%, ${COLORS.UI_BG} 100%)`,
        }}
      >
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4 z-10 hover:opacity-80"
          style={{ color: COLORS.UI_BORDER }}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="text-center mb-8">
          <h2
            className="text-4xl font-bold mb-2"
            style={{
              color: COLORS.UI_BORDER,
              textShadow: `0 0 10px ${COLORS.UI_BORDER}`,
            }}
          >
            📖 LA LEYENDA DEL ECO
          </h2>
          <p style={{ color: COLORS.ACCENT }}>Historia del Hechicero Silencioso</p>
        </div>

        <div className="flex items-center justify-center h-[60%]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl"
            >
              <div className="mb-8">
                <div
                  className="text-8xl mb-6"
                  style={{
                    filter: `drop-shadow(0 0 20px ${COLORS.ACCENT})`,
                  }}
                >
                  {storyPages[currentPage].icon}
                </div>
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.UI_BORDER }}>
                  {storyPages[currentPage].title}
                </h3>
                <p className="text-lg leading-relaxed" style={{ color: COLORS.UI_TEXT }}>
                  {storyPages[currentPage].text}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrev}
              disabled={currentPage === 0}
              className="border-2 hover:opacity-80 transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: "transparent",
                borderColor: COLORS.UI_BORDER,
                color: COLORS.UI_BORDER,
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              ANTERIOR
            </Button>

            <div className="flex space-x-3">
              {storyPages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className="w-3 h-3 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: index === currentPage ? COLORS.UI_BORDER : `${COLORS.UI_BORDER}40`,
                    boxShadow: index === currentPage ? `0 0 10px ${COLORS.UI_BORDER}` : "none",
                  }}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="border-2 hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: COLORS.UI_BORDER,
                borderColor: COLORS.ACCENT,
                color: COLORS.UI_BG,
              }}
            >
              {currentPage === storyPages.length - 1 ? "COMENZAR" : "SIGUIENTE"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
