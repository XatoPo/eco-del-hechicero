"use client"

import { useEffect, useState } from "react"

interface HUDProps {
  health: number
  mana: number
  maxMana: number
  lastCommand: string
  level: number
  enemiesDefeated: number
  totalEnemies: number
  healUses: number
  transcript: string
  isListening: boolean
  commandCount: number
}

export default function HUD({
  health,
  mana,
  maxMana,
  lastCommand,
  level,
  enemiesDefeated,
  totalEnemies,
  healUses,
  transcript,
  isListening,
  commandCount,
}: HUDProps) {
  const [commandValid, setCommandValid] = useState<boolean | null>(null)
  const validCommands = ["fuego", "escudo", "luz", "curar", "saltar", "atrás", "adelante"]

  useEffect(() => {
    if (lastCommand) {
      const normalizedCommand = lastCommand.toLowerCase().trim()
      const isValid = validCommands.some((cmd) => normalizedCommand.includes(cmd))
      setCommandValid(isValid)
    }
  }, [lastCommand])

  const getLevelName = (level: number) => {
    const names = [
      "Bosque de los Susurros",
      "Cripta de la Voz Dormida",
      "Montañas Volcánicas",
      "Reino de las Sombras",
      "Ciudadela Demoníaca",
      "Cavernas de Cristal",
      "Santuario del Fénix",
      "Nexo del Vacío",
    ]
    return names[level - 1] || `Nivel ${level}`
  }

  return (
    <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/90 to-transparent p-1 sm:p-2 md:p-4">
      {/* Level indicator - Mobile Responsive */}
      <div className="mb-1 sm:mb-2 md:mb-3 rounded-b-lg bg-amber-800/90 px-2 sm:px-4 py-1 sm:py-2 text-center text-amber-100 shadow-lg">
        <h2 className="text-xs sm:text-sm md:text-lg font-bold">
          Nivel {level}: <span className="hidden sm:inline">{getLevelName(level)}</span>
          <span className="sm:hidden">L{level}</span>
        </h2>
      </div>

      <div className="flex w-full justify-between flex-col lg:flex-row gap-1 sm:gap-2">
        {/* Left side - Health, Mana, Stats */}
        <div className="flex w-full lg:w-1/2 flex-col gap-1 sm:gap-2">
          {/* Health Bar */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="w-4 sm:w-6 md:w-8 text-xs sm:text-sm font-bold text-red-400">HP:</span>
            <div className="h-2 sm:h-3 md:h-4 w-full rounded-full bg-gray-800 border border-red-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
                style={{ width: `${health}%` }}
              ></div>
            </div>
            <span className="text-xs sm:text-sm text-white font-mono min-w-[40px] sm:min-w-[50px]">{health}/100</span>
          </div>

          {/* Mana Bar */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="w-4 sm:w-6 md:w-8 text-xs sm:text-sm font-bold text-blue-400">MP:</span>
            <div className="h-2 sm:h-3 md:h-4 w-full rounded-full bg-gray-800 border border-blue-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-300"
                style={{ width: `${(mana / maxMana) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs sm:text-sm text-white font-mono min-w-[50px] sm:min-w-[60px]">
              {Math.round(mana)}/{maxMana}
            </span>
          </div>

          {/* Game Stats */}
          <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-amber-200">
            <span>
              🎯 <span className="hidden sm:inline">Enemigos: </span>
              {totalEnemies - enemiesDefeated}/{totalEnemies}
            </span>
            <span>
              💚 <span className="hidden sm:inline">Curaciones: </span>
              {healUses}/3
            </span>
          </div>
        </div>

        {/* Right side - Voice Recognition */}
        <div className="w-full lg:w-1/2 lg:pl-4">
          <div className="rounded-lg bg-gray-900/80 border border-amber-600 p-1 sm:p-2 md:p-3">
            {/* Voice Status */}
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm font-bold text-amber-400">
                🎤 <span className="hidden sm:inline">Reconocimiento de Voz</span>
                <span className="sm:hidden">Voz</span>
              </span>
              <span className={`text-xs px-1 sm:px-2 py-1 rounded ${isListening ? "bg-green-600" : "bg-red-600"}`}>
                {isListening ? "ON" : "OFF"}
              </span>
            </div>

            {/* Live Transcript */}
            <div className="mb-1 sm:mb-2">
              <div className="text-xs text-gray-400 mb-1">
                <span className="hidden sm:inline">Escuchando:</span>
                <span className="sm:hidden">Audio:</span>
              </div>
              <div className="bg-black/50 rounded p-1 sm:p-2 min-h-[12px] sm:min-h-[16px] md:min-h-[20px] text-xs sm:text-sm text-white font-mono overflow-hidden">
                <div className="truncate">{transcript || "..."}</div>
              </div>
            </div>

            {/* Last Command */}
            <div className="mb-1 sm:mb-2">
              <div className="text-xs text-gray-400 mb-1">
                <span className="hidden sm:inline">Último comando:</span>
                <span className="sm:hidden">Comando:</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span
                  className={`font-bold text-xs sm:text-sm truncate flex-1 ${
                    commandValid ? "text-green-400" : commandValid === false ? "text-red-400" : "text-amber-300"
                  }`}
                >
                  {lastCommand || "ninguno"}
                </span>
                {lastCommand && commandValid !== null && (
                  <span
                    className={`text-xs px-1 rounded flex-shrink-0 ${
                      commandValid ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {commandValid ? "✓" : "✗"}
                  </span>
                )}
              </div>
            </div>

            {/* Command Counter */}
            <div className="text-xs text-gray-400">
              <span className="hidden sm:inline">Comandos ejecutados: </span>
              <span className="sm:hidden">Total: </span>
              <span className="text-amber-400 font-bold">{commandCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
