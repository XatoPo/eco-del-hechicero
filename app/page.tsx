import GameWrapper from "@/components/game/GameWrapper"

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 font-mono"
      style={{
        background: "linear-gradient(135deg, #1A0F08 0%, #2C1810 50%, #1A0F08 100%)",
      }}
    >
      <GameWrapper />
    </main>
  )
}
