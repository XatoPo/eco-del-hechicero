"use client"

import { create } from "zustand"

interface GameState {
  health: number
  mana: number
  currentLevel: number
  lastCommand: string
  setHealth: (health: number) => void
  setMana: (mana: number) => void
  setCurrentLevel: (level: number) => void
  setCommand: (command: string) => void
}

export const useGameStore = create<GameState>((set) => ({
  health: 100,
  mana: 100,
  currentLevel: 1,
  lastCommand: "",
  setHealth: (health) => set({ health }),
  setMana: (mana) => set({ mana }),
  setCurrentLevel: (currentLevel) => set({ currentLevel }),
  setCommand: (lastCommand) => set({ lastCommand }),
}))
