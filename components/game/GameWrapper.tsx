"use client"

import { useState } from "react"
import StartScreen from "./StartScreen"
import StoryIntro from "./StoryIntro"
import EnemyGuide from "./EnemyGuide"
import SimpleGame from "./SimpleGame"

export default function GameWrapper() {
  const [currentScreen, setCurrentScreen] = useState<"start" | "story" | "enemies" | "game">("start")

  const handleStart = () => {
    setCurrentScreen("game")
  }

  const handleShowStory = () => {
    setCurrentScreen("story")
  }

  const handleShowEnemyGuide = () => {
    setCurrentScreen("enemies")
  }

  const handleCloseStory = () => {
    setCurrentScreen("start")
  }

  const handleCloseEnemyGuide = () => {
    setCurrentScreen("start")
  }

  return (
    <div className="relative w-full max-w-5xl">
      {currentScreen === "start" && (
        <StartScreen onStart={handleStart} onShowStory={handleShowStory} onShowEnemyGuide={handleShowEnemyGuide} />
      )}

      {currentScreen === "story" && <StoryIntro onClose={handleCloseStory} />}

      {currentScreen === "enemies" && <EnemyGuide onClose={handleCloseEnemyGuide} />}

      {currentScreen === "game" && <SimpleGame />}
    </div>
  )
}
