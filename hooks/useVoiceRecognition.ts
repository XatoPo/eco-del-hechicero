"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"

export function useVoiceRecognition() {
  const [lastCommand, setLastCommand] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [commandCount, setCommandCount] = useState(0)
  const [lastTranscript, setLastTranscript] = useState("")
  const commandBuffer = useRef<string[]>([])
  const processingRef = useRef(false)
  const lastProcessedRef = useRef<string>("")
  const confidenceThreshold = useRef(0.7)

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition()

  // SUPER MEJORADO: Análisis inteligente de oraciones completas con IA
  useEffect(() => {
    if (transcript && transcript !== lastTranscript && transcript.trim().length > 1 && !processingRef.current) {
      // Evitar procesar el mismo transcript múltiples veces
      if (transcript === lastProcessedRef.current) return

      processingRef.current = true
      lastProcessedRef.current = transcript

      console.log("🎤 ANALIZANDO CON IA:", transcript)
      setLastTranscript(transcript)

      const text = transcript.toLowerCase().trim()
      let foundCommand = ""
      let maxConfidence = 0

      console.log("🧠 Procesamiento inteligente de:", text)

      // SUPER MEJORADO: Sistema de IA con análisis contextual
      const commandPatterns = [
        {
          command: "escudo",
          patterns: [
            "escudo",
            "shield",
            "protección",
            "proteccion",
            "defensa",
            "barrera",
            "proteger",
            "defenderse",
            "protegerse",
            "seguridad",
            "amparo",
            "resguardo",
            "cobertura",
            "quiero escudo",
            "necesito protección",
            "activa defensa",
            "pon barrera",
          ],
          contextWords: ["proteger", "defender", "seguro", "amparo", "resguardo"],
          priority: 8,
        },
        {
          command: "fuego",
          patterns: [
            "fuego",
            "fire",
            "llama",
            "bola de fuego",
            "flama",
            "quemar",
            "incendio",
            "ardor",
            "flamazo",
            "combustión",
            "ignición",
            "candela",
            "hoguera",
            "brasas",
            "calor",
            "lanza fuego",
            "dispara llama",
            "ataque de fuego",
            "bola ígnea",
            "proyectil ardiente",
          ],
          contextWords: ["quemar", "arder", "caliente", "rojo", "naranja", "calor"],
          priority: 7,
        },
        {
          command: "luz",
          patterns: [
            "luz",
            "light",
            "brillo",
            "destello",
            "rayo",
            "flash",
            "iluminar",
            "claridad",
            "resplandor",
            "luminosidad",
            "fulgor",
            "radiancia",
            "centella",
            "chispa",
            "haz de luz",
            "rayo de luz",
            "destello brillante",
            "luz sagrada",
            "iluminación",
          ],
          contextWords: ["brillar", "iluminar", "claro", "blanco", "dorado", "sagrado"],
          priority: 7,
        },
        {
          command: "curar",
          patterns: [
            "curar",
            "heal",
            "vida",
            "sanar",
            "salud",
            "recuperar",
            "medicina",
            "cura",
            "curación",
            "sanación",
            "restaurar",
            "reparar",
            "regenerar",
            "revitalizar",
            "recupera vida",
            "sana heridas",
            "restaura salud",
            "cura daño",
            "regenera vida",
          ],
          contextWords: ["salud", "vida", "herida", "daño", "dolor", "enfermo"],
          priority: 6,
        },
        {
          command: "saltar",
          patterns: [
            "saltar",
            "jump",
            "brincar",
            "salto",
            "volar",
            "impulso",
            "super salto",
            "elevarse",
            "ascender",
            "alzarse",
            "levantarse",
            "propulsarse",
            "salta alto",
            "super impulso",
            "salto mágico",
            "vuela alto",
            "elévate",
          ],
          contextWords: ["alto", "arriba", "elevar", "subir", "ascender"],
          priority: 4,
        },
        {
          command: "atrás",
          patterns: [
            "atrás",
            "atras",
            "izquierda",
            "left",
            "retroceder",
            "regresar",
            "hacia atrás",
            "retrocede",
            "vuelve",
            "regresa",
            "muévete atrás",
            "ve hacia atrás",
            "camina atrás",
            "dirígete atrás",
            "retorna",
            "reversa",
          ],
          contextWords: ["atrás", "izquierda", "retroceder", "volver", "regresar"],
          priority: 3,
        },
        {
          command: "adelante",
          patterns: [
            "adelante",
            "derecha",
            "right",
            "avanzar",
            "seguir",
            "hacia adelante",
            "avanza",
            "continúa",
            "prosigue",
            "muévete adelante",
            "ve hacia adelante",
            "camina adelante",
            "dirígete adelante",
            "progresa",
            "sigue",
          ],
          contextWords: ["adelante", "derecha", "avanzar", "seguir", "continuar"],
          priority: 3,
        },
      ]

      // NUEVO: Análisis contextual inteligente
      for (const commandData of commandPatterns) {
        let confidence = 0
        let patternMatches = 0
        let contextMatches = 0

        // Buscar patrones exactos
        for (const pattern of commandData.patterns) {
          if (text.includes(pattern)) {
            patternMatches++
            confidence += commandData.priority + pattern.length / 10

            // Bonus por patrones más específicos
            if (pattern.includes(" ")) {
              confidence += 2 // Bonus por frases completas
            }
          }
        }

        // Buscar palabras de contexto
        for (const contextWord of commandData.contextWords) {
          if (text.includes(contextWord)) {
            contextMatches++
            confidence += 1
          }
        }

        // Bonus por múltiples coincidencias
        if (patternMatches > 1) {
          confidence += patternMatches * 0.5
        }
        if (contextMatches > 0) {
          confidence += contextMatches * 0.3
        }

        // Bonus por longitud de oración (más contexto)
        if (text.length > 10) {
          confidence += 0.5
        }

        // Penalty por palabras confusas
        const confusingWords = ["no", "nunca", "jamás", "stop", "para", "detente"]
        for (const confusing of confusingWords) {
          if (text.includes(confusing)) {
            confidence -= 3
          }
        }

        if (confidence > maxConfidence && confidence > confidenceThreshold.current) {
          foundCommand = commandData.command
          maxConfidence = confidence
        }
      }

      console.log("🎯 Comando detectado:", foundCommand, "Confianza:", maxConfidence.toFixed(2))

      if (foundCommand && maxConfidence > confidenceThreshold.current) {
        console.log(
          `✅ COMANDO VALIDADO: "${foundCommand}" en "${transcript}" (Confianza: ${maxConfidence.toFixed(2)})`,
        )

        const timestamp = Date.now()
        setLastCommand(`${foundCommand}_${timestamp}`)
        setCommandCount((prev) => prev + 1)

        // Ajustar umbral dinámicamente
        if (maxConfidence > 5) {
          confidenceThreshold.current = Math.max(0.5, confidenceThreshold.current - 0.1)
        } else {
          confidenceThreshold.current = Math.min(1.0, confidenceThreshold.current + 0.05)
        }

        // Reset más rápido para mejor responsividad
        setTimeout(() => {
          resetTranscript()
          setLastTranscript("")
          processingRef.current = false
          lastProcessedRef.current = ""
        }, 300)
      } else {
        console.log(
          `❌ Confianza insuficiente (${maxConfidence.toFixed(2)} < ${confidenceThreshold.current.toFixed(2)}) en: "${transcript}"`,
        )
        setTimeout(() => {
          processingRef.current = false
        }, 200)
      }
    }
  }, [transcript, lastTranscript, resetTranscript])

  const startListening = useCallback(async () => {
    if (!browserSupportsSpeechRecognition) {
      console.log("❌ Navegador no compatible")
      return false
    }

    if (!isMicrophoneAvailable) {
      console.log("❌ Micrófono no disponible")
      return false
    }

    try {
      await SpeechRecognition.startListening({
        continuous: true,
        language: "es-ES",
        interimResults: true, // Habilitado para análisis en tiempo real
      })
      console.log("🎤 Reconocimiento IA iniciado")
      return true
    } catch (error: any) {
      console.log("❌ Error:", error.message)
      return false
    }
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable])

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening()
    console.log("🔇 Reconocimiento detenido")
  }, [])

  useEffect(() => {
    setIsListening(listening)
  }, [listening])

  useEffect(() => {
    if (browserSupportsSpeechRecognition && isMicrophoneAvailable) {
      const startTimer = setTimeout(() => {
        startListening()
      }, 500)

      const restartTimer = setInterval(() => {
        if (!listening && isListening) {
          console.log("🔄 Reiniciando reconocimiento IA...")
          startListening()
        }
      }, 2500)

      return () => {
        clearTimeout(startTimer)
        clearInterval(restartTimer)
      }
    }
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, startListening, listening, isListening])

  return {
    lastCommand,
    isListening,
    startListening,
    stopListening,
    commandCount,
    transcript,
    isSupported: browserSupportsSpeechRecognition,
    hasPermission: isMicrophoneAvailable,
  }
}
