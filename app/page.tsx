"use client"

import { useWorldAuth } from "@radish-la/world-auth"
import { Button } from "@worldcoin/mini-apps-ui-kit-react"

export default function Home() {
  const { user, isConnected, signIn } = useWorldAuth({
    onWrongEnvironment() {
      alert("LuckyHuman funciona dentro de World App")
    },
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-black text-white">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🍀</div>
        <h1 className="text-4xl font-bold">LuckyHuman</h1>
        <p className="text-gray-400 mt-2">Rifa diaria solo para humanos verificados</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 mb-6 text-center">
        <p className="text-gray-400 text-sm mb-1">Pool actual</p>
        <p className="text-4xl font-bold text-green-400">$0.00 USD</p>
        <p className="text-gray-500 text-xs mt-1">0 participantes</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">Próximo sorteo en</p>
        <p className="text-3xl font-bold text-yellow-400">23:59:59</p>
        <p className="text-gray-500 text-xs mt-1">El ganador se elige cada día a medianoche</p>
      </div>

      <div className="w-full max-w-sm">
        {isConnected ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">✓ Conectado como <strong>{user?.username}</strong></p>
            <Button fullWidth>
              Participar por $0.10 USD
            </Button>
          </div>
        ) : (
          <Button onClick={signIn} fullWidth>
            Conectar con World ID
          </Button>
        )}
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center max-w-xs">
        Solo 1 entrada por persona verificada. Sin bots. Sin trampa.
      </p>
    </main>
  )
}