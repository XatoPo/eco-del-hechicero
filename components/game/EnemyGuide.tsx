"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Home, Zap, Shield, Heart, Flame, Sun } from "lucide-react"

// EXACTOS: Mismos colores que en el juego
const COLORS = {
  TREE_TRUNK: "#2E2E2E",
  TREE_LEAVES: "#1B5E20",
  TREE_EYES: "#FF0000",
  SLIME_BODY: "#4A148C",
  SLIME_SHINE: "#7B1FA2",
  SLIME_TEETH: "#FFFFFF",
  GOLEM_BODY: "#263238",
  GOLEM_EYES: "#FF3D00",
  GOLEM_CRACKS: "#FF5722",
  SPIRIT_BODY: "#0D47A1",
  SPIRIT_GLOW: "#1976D2",
  SPIRIT_EYES: "#00BCD4",
  WRAITH_BODY: "#1A0A1A",
  WRAITH_GLOW: "#8E24AA",
  WRAITH_EYES: "#E91E63",
  SKELETON_BONES: "#F5F5F5",
  SKELETON_EYES: "#FF1744",
  SKELETON_JOINTS: "#BDBDBD",
  UI_BG: "#0D0D0D",
  UI_BORDER: "#FFB300",
  UI_TEXT: "#FFF8E1",
}

interface Enemy {
  id: string
  name: string
  type: string
  weakness: string
  health: number
  level: number
  rarity: "común" | "raro" | "épico" | "legendario" | "mítico"
  description: string
  abilities: string[]
  voiceCommands: string[]
  tips: string[]
  color: string
  gradientFrom: string
  gradientTo: string
}

const enemies: Enemy[] = [
  {
    id: "tree",
    name: "Árbol Siniestro",
    type: "Planta Corrupta",
    weakness: "fire",
    health: 2,
    level: 1,
    rarity: "común",
    description:
      "Un árbol ancestral corrompido por la magia oscura. Sus ramas se mueven con malicia y sus ojos brillan con sed de venganza.",
    abilities: ["Golpe de Rama", "Raíces Enredadoras", "Regeneración Lenta"],
    voiceCommands: ["FUEGO", "LLAMA", "BOLA DE FUEGO"],
    tips: ["Usa hechizos de fuego", "Mantén distancia de sus ramas", "Ataca rápido antes de que se regenere"],
    color: "#2E2E2E",
    gradientFrom: "#1B5E20",
    gradientTo: "#2E2E2E",
  },
  {
    id: "slime",
    name: "Limo Venenoso",
    type: "Criatura Gelatinosa",
    weakness: "fire",
    health: 1,
    level: 1,
    rarity: "común",
    description:
      "Una masa viscosa y tóxica que se desliza por el suelo. Su cuerpo ácido puede disolver casi cualquier material.",
    abilities: ["Salto Ácido", "División Celular", "Veneno Paralizante"],
    voiceCommands: ["FUEGO", "LLAMA", "BOLA DE FUEGO"],
    tips: ["El fuego lo evapora rápidamente", "Evita el contacto directo", "Es lento pero persistente"],
    color: "#4A148C",
    gradientFrom: "#4A148C",
    gradientTo: "#7B1FA2",
  },
  {
    id: "spirit",
    name: "Espíritu Errante",
    type: "Ente Espectral",
    weakness: "light",
    health: 2,
    level: 1,
    rarity: "raro",
    description: "El alma atormentada de un antiguo guardián del bosque. Flota etéreamente buscando paz eterna.",
    abilities: ["Atravesar Paredes", "Grito Espectral", "Posesión Temporal"],
    voiceCommands: ["LUZ", "BRILLO", "DESTELLO"],
    tips: ["Solo la luz puede purificarlo", "Puede atravesar obstáculos", "Su grito causa confusión"],
    color: "#0D47A1",
    gradientFrom: "#0D47A1",
    gradientTo: "#1976D2",
  },
  {
    id: "skeleton",
    name: "Esqueleto Guerrero",
    type: "No-Muerto",
    weakness: "light",
    health: 2,
    level: 2,
    rarity: "común",
    description:
      "Los restos reanimados de un antiguo soldado. Sus huesos blanqueados brillan siniestros en la oscuridad de la cripta.",
    abilities: ["Ataque de Espada", "Resistencia Física", "Regeneración Ósea"],
    voiceCommands: ["LUZ", "BRILLO", "DESTELLO"],
    tips: ["La luz sagrada destruye sus huesos", "Resistente a ataques físicos", "Vulnerable a magia divina"],
    color: "#F5F5F5",
    gradientFrom: "#F5F5F5",
    gradientTo: "#BDBDBD",
  },
  {
    id: "wraith",
    name: "Espectro Siniestro",
    type: "Sombra Viviente",
    weakness: "light",
    health: 3,
    level: 2,
    rarity: "raro",
    description:
      "Una manifestación de pura malevolencia. Este ser de sombras se alimenta del miedo y la desesperación.",
    abilities: ["Toque Helado", "Invisibilidad Parcial", "Aura de Terror"],
    voiceCommands: ["LUZ", "BRILLO", "DESTELLO"],
    tips: ["Solo la luz puede dañarlo", "Se vuelve semi-invisible", "Su presencia causa miedo"],
    color: "#1A0A1A",
    gradientFrom: "#1A0A1A",
    gradientTo: "#8E24AA",
  },
  {
    id: "golem",
    name: "Gólem de Piedra",
    type: "Constructo Mágico",
    weakness: "light",
    health: 3,
    level: 2,
    rarity: "épico",
    description:
      "Una criatura de roca animada por magia antigua. Su cuerpo pétreo es casi indestructible, pero la luz puede deshacer su encantamiento.",
    abilities: ["Puño Sísmico", "Armadura Pétrea", "Regeneración Mineral"],
    voiceCommands: ["LUZ", "BRILLO", "DESTELLO"],
    tips: ["La luz debilita su magia", "Sus ataques son lentos pero devastadores", "Busca las grietas en su armadura"],
    color: "#263238",
    gradientFrom: "#263238",
    gradientTo: "#37474F",
  },
]

const rarityColors = {
  común: "bg-gray-500",
  raro: "bg-blue-500",
  épico: "bg-purple-500",
  legendario: "bg-orange-500",
  mítico: "bg-red-500",
}

const weaknessIcons = {
  fire: <Flame className="w-4 h-4" />,
  light: <Sun className="w-4 h-4" />,
}

interface EnemyGuideProps {
  onClose: () => void
}

// EXACTO: Función para renderizar enemigos idénticos al juego
const renderEnemyToCanvas = (enemyType: string, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const size = 128
  canvas.width = size
  canvas.height = size

  const x = size / 2 - 12
  const y = size / 2 - 12

  ctx.save()

  switch (enemyType) {
    case "tree":
      // EXACTO: Mismo diseño que en el juego
      ctx.fillStyle = COLORS.TREE_TRUNK
      ctx.fillRect(x + 6, y + 8, 12, 16)
      ctx.fillRect(x + 2, y + 12, 4, 8)
      ctx.fillRect(x + 18, y + 12, 4, 8)
      ctx.fillStyle = COLORS.TREE_LEAVES
      ctx.beginPath()
      ctx.arc(x + 12, y + 6, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.TREE_EYES
      ctx.fillRect(x + 8, y + 10, 2, 2)
      ctx.fillRect(x + 14, y + 10, 2, 2)
      break

    case "slime":
      // EXACTO: Mismo diseño que en el juego
      ctx.fillStyle = COLORS.SLIME_BODY
      ctx.beginPath()
      ctx.ellipse(x + 12, y + 16, 12, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.SLIME_SHINE
      ctx.beginPath()
      ctx.ellipse(x + 8, y + 12, 4, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.SLIME_TEETH
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 6 + i * 4, y + 14, 2, 3)
      }
      break

    case "spirit":
      // EXACTO: Mismo diseño que en el juego
      ctx.globalAlpha = 0.8
      ctx.fillStyle = COLORS.SPIRIT_BODY
      ctx.beginPath()
      ctx.arc(x + 12, y + 12, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.SPIRIT_GLOW
      ctx.beginPath()
      ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = COLORS.SPIRIT_EYES
      ctx.fillRect(x + 8, y + 8, 2, 2)
      ctx.fillRect(x + 14, y + 8, 2, 2)
      break

    case "skeleton":
      // EXACTO: Mismo diseño que en el juego
      ctx.fillStyle = COLORS.SKELETON_BONES
      ctx.fillRect(x + 8, y + 6, 8, 12)
      ctx.fillRect(x + 6, y + 18, 12, 6)
      ctx.fillRect(x + 4, y + 8, 4, 2)
      ctx.fillRect(x + 16, y + 8, 4, 2)
      ctx.beginPath()
      ctx.arc(x + 12, y + 4, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.SKELETON_EYES
      ctx.fillRect(x + 10, y + 2, 1, 2)
      ctx.fillRect(x + 14, y + 2, 1, 2)
      break

    case "wraith":
      // EXACTO: Mismo diseño que en el juego
      ctx.globalAlpha = 0.7
      ctx.fillStyle = COLORS.WRAITH_BODY
      ctx.beginPath()
      ctx.arc(x + 12, y + 12, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.WRAITH_GLOW
      ctx.beginPath()
      ctx.arc(x + 12, y + 12, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = COLORS.WRAITH_EYES
      ctx.fillRect(x + 8, y + 8, 3, 3)
      ctx.fillRect(x + 13, y + 8, 3, 3)
      break

    case "golem":
      // EXACTO: Mismo diseño que en el juego
      ctx.fillStyle = COLORS.GOLEM_BODY
      ctx.fillRect(x + 4, y + 4, 16, 20)
      ctx.fillStyle = COLORS.GOLEM_CRACKS
      ctx.fillRect(x + 8, y + 8, 1, 8)
      ctx.fillRect(x + 12, y + 12, 1, 6)
      ctx.fillRect(x + 15, y + 10, 1, 4)
      ctx.fillStyle = COLORS.GOLEM_EYES
      ctx.fillRect(x + 8, y + 8, 2, 2)
      ctx.fillRect(x + 14, y + 8, 2, 2)
      break
  }

  ctx.restore()
}

export default function EnemyGuide({ onClose }: EnemyGuideProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentEnemy = enemies[currentIndex]

  useEffect(() => {
    if (canvasRef.current) {
      renderEnemyToCanvas(currentEnemy.id, canvasRef.current)
    }
  }, [currentIndex, currentEnemy.id])

  const nextEnemy = () => {
    setCurrentIndex((prev) => (prev + 1) % enemies.length)
  }

  const prevEnemy = () => {
    setCurrentIndex((prev) => (prev - 1 + enemies.length) % enemies.length)
  }

  const handleBackToStart = () => {
    console.log("🏠 Recargando página desde bestiario...")
    window.location.reload()
  }

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, 
          ${COLORS.UI_BG} 0%, 
          #1A0F08 25%, 
          #2C1810 50%, 
          #1A0F08 75%, 
          ${COLORS.UI_BG} 100%)`,
      }}
    >
      {/* Mystical background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
      </div>

      <div className="relative z-10 p-2 sm:p-4 lg:p-6">
        {/* Enhanced Header */}
        <div
          className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 px-3 sm:px-6 py-3 sm:py-4 rounded-xl border-2 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${COLORS.UI_BG}E6 0%, #1A0F08E6 50%, ${COLORS.UI_BG}E6 100%)`,
            borderColor: COLORS.UI_BORDER,
            boxShadow: `0 0 30px ${COLORS.UI_BORDER}40, inset 0 0 20px ${COLORS.UI_BG}80`,
          }}
        >
          <Button
            onClick={handleBackToStart}
            variant="outline"
            className="bg-amber-600/90 hover:bg-amber-700 text-white border-amber-500 mb-2 sm:mb-0"
            style={{
              boxShadow: `0 0 15px ${COLORS.UI_BORDER}40`,
            }}
          >
            <Home className="w-4 h-4 mr-2" />
            VOLVER AL INICIO
          </Button>

          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center tracking-wider"
            style={{
              color: COLORS.UI_BORDER,
              textShadow: `0 0 20px ${COLORS.UI_BORDER}, 0 0 40px ${COLORS.UI_BORDER}80`,
            }}
          >
            ⚔️ BESTIARIO MÁGICO ⚔️
          </h1>

          <div className="w-32 sm:w-40" />
        </div>

        {/* Navigation */}
        <div className="flex justify-center items-center gap-4 mb-4 sm:mb-6">
          <Button
            onClick={prevEnemy}
            variant="outline"
            size="lg"
            className="bg-amber-600/90 hover:bg-amber-700 text-white border-amber-500"
            style={{
              boxShadow: `0 0 15px ${COLORS.UI_BORDER}40`,
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="flex gap-2">
            {enemies.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? "bg-amber-400 scale-125" : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextEnemy}
            variant="outline"
            size="lg"
            className="bg-amber-600/90 hover:bg-amber-700 text-white border-amber-500"
            style={{
              boxShadow: `0 0 15px ${COLORS.UI_BORDER}40`,
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Enemy Card */}
        <div className="max-w-6xl mx-auto">
          <Card
            className="border-4 shadow-2xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${COLORS.UI_BG}E6 0%, #1A0F08E6 50%, ${COLORS.UI_BG}E6 100%)`,
              borderColor: COLORS.UI_BORDER,
              boxShadow: `0 0 50px ${COLORS.UI_BORDER}60, inset 0 0 30px ${COLORS.UI_BG}40`,
            }}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center items-center gap-4 mb-2">
                <Badge className={`${rarityColors[currentEnemy.rarity]} text-white px-3 py-1`}>
                  {currentEnemy.rarity.toUpperCase()}
                </Badge>
                <Badge variant="outline" style={{ color: COLORS.UI_BORDER, borderColor: COLORS.UI_BORDER }}>
                  NIVEL {currentEnemy.level}
                </Badge>
              </div>
              <CardTitle
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2"
                style={{
                  color: COLORS.UI_BORDER,
                  textShadow: `0 0 20px ${COLORS.UI_BORDER}`,
                }}
              >
                {currentEnemy.name}
              </CardTitle>
              <p className="text-lg sm:text-xl" style={{ color: COLORS.UI_TEXT }}>
                {currentEnemy.type}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Enemy Visual - EXACTO al juego */}
              <div className="flex justify-center">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="border-4 rounded-lg"
                    style={{
                      borderColor: COLORS.UI_BORDER,
                      backgroundColor: "#1a1a1a",
                      imageRendering: "pixelated",
                      width: "160px",
                      height: "160px",
                      boxShadow: `0 0 30px ${COLORS.UI_BORDER}40`,
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-lg opacity-20"
                    style={{
                      background: `radial-gradient(circle, ${currentEnemy.color}40, transparent)`,
                    }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backgroundColor: `${COLORS.UI_BG}80`,
                    borderColor: "#F44336",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span className="text-red-400 font-semibold">VIDA</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{currentEnemy.health}</div>
                </div>

                <div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backgroundColor: `${COLORS.UI_BG}80`,
                    borderColor: "#FFD93D",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-400 font-semibold">DEBILIDAD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {weaknessIcons[currentEnemy.weakness as keyof typeof weaknessIcons]}
                    <span className="text-xl font-bold text-white capitalize">
                      {currentEnemy.weakness === "fire" ? "FUEGO" : "LUZ"}
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backgroundColor: `${COLORS.UI_BG}80`,
                    borderColor: "#2196F3",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-400 font-semibold">APARECE EN</span>
                  </div>
                  <div className="text-2xl font-bold text-white">NIVEL {currentEnemy.level}</div>
                </div>
              </div>

              {/* Description */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: `${COLORS.UI_BG}80`,
                  borderColor: COLORS.UI_BORDER,
                }}
              >
                <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.UI_BORDER }}>
                  DESCRIPCIÓN
                </h3>
                <p className="leading-relaxed" style={{ color: COLORS.UI_TEXT }}>
                  {currentEnemy.description}
                </p>
              </div>

              {/* Abilities */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: `${COLORS.UI_BG}80`,
                  borderColor: "#9C27B0",
                }}
              >
                <h3 className="text-lg font-semibold text-purple-400 mb-3">HABILIDADES</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {currentEnemy.abilities.map((ability, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-purple-300 border-purple-500 justify-center py-2"
                    >
                      {ability}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Voice Commands */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: `${COLORS.UI_BG}80`,
                  borderColor: "#4CAF50",
                }}
              >
                <h3 className="text-lg font-semibold text-green-400 mb-3">COMANDOS DE VOZ EFECTIVOS</h3>
                <div className="flex flex-wrap gap-2">
                  {currentEnemy.voiceCommands.map((command, index) => (
                    <Badge key={index} className="bg-green-600 text-white px-4 py-2 text-lg">
                      "{command}"
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Combat Tips */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: `${COLORS.UI_BG}80`,
                  borderColor: "#FF9800",
                }}
              >
                <h3 className="text-lg font-semibold text-orange-400 mb-3">ESTRATEGIAS DE COMBATE</h3>
                <ul className="space-y-2">
                  {currentEnemy.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2" style={{ color: COLORS.UI_TEXT }}>
                      <span className="text-orange-400 font-bold">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8" style={{ color: COLORS.UI_TEXT }}>
          <p className="text-lg">
            Enemigo {currentIndex + 1} de {enemies.length}
          </p>
          <p className="text-sm mt-2">Usa las flechas o los comandos de voz para navegar</p>
        </div>
      </div>
    </div>
  )
}
