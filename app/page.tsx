"use client"

import { useWorldAuth } from "@radish-la/world-auth"
import { Button } from "@worldcoin/mini-apps-ui-kit-react"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("")
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0")
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0")
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0")
      setTimeLeft(`${h}:${m}:${s}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])
  return timeLeft
}

export default function Home() {
  const { user, isConnected, signIn } = useWorldAuth({
    onWrongEnvironment() {
      alert("LuckyHuman funciona dentro de World App")
    },
  })

  const timeLeft = useCountdown()
  const [participantes, setParticipantes] = useState(0)
  const [yaParticipo, setYaParticipo] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    cargarParticipantes()
  }, [])

  useEffect(() => {
    if (user?.nullifier_hash) verificarParticipacion(user.nullifier_hash)
  }, [user])

  async function cargarParticipantes() {
    const hoy = new Date().toISOString().split("T")[0]
    const { count } = await supabase
      .from("participantes")
      .select("*", { count: "exact", head: true })
      .eq("fecha_rifa", hoy)
    setParticipantes(count || 0)
  }

  async function verificarParticipacion(worldId: string) {
    const hoy = new Date().toISOString().split("T")[0]
    const { data } = await supabase
      .from("participantes")
      .select("id")
      .eq("world_id", worldId)
      .eq("fecha_rifa", hoy)
      .single()
    setYaParticipo(!!data)
  }

  async function participar() {
    if (!user?.nullifier_hash) return
    setCargando(true)
    const hoy = new Date().toISOString().split("T")[0]
    const { error } = await supabase.from("participantes").insert({
      world_id: user.nullifier_hash,
      username: user.username,
      fecha_rifa: hoy,
    })
    if (!error) {
      setYaParticipo(true)
      setParticipantes((p) => p + 1)
    }
    setCargando(false)
  }

  const pool = (participantes * 0.1 * 0.92).toFixed(2)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-black text-white">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🍀</div>
        <h1 className="text-4xl font-bold">LuckyHuman</h1>
        <p className="text-gray-400 mt-2">Rifa diaria solo para humanos verificados</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 mb-6 text-center">
        <p className="text-gray-400 text-sm mb-1">Pool actual</p>
        <p className="text-4xl font-bold text-green-400">${pool} USD</p>
        <p className="text-gray-500 text-xs mt-1">{participantes} participantes</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">Próximo sorteo en</p>
        <p className="text-3xl font-bold text-yellow-400">{timeLeft}</p>
        <p className="text-gray-500 text-xs mt-1">El ganador se elige cada día a medianoche</p>
      </div>

      <div className="w-full max-w-sm">
        {isConnected ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">✓ Conectado como <strong>{user?.username}</strong></p>
            {yaParticipo ? (
              <div className="bg-gray-900 rounded-2xl p-4 text-center">
                <p className="text-yellow-400 font-bold">🎟️ Ya estás participando hoy</p>
                <p className="text-gray-500 text-xs mt-1">¡Buena suerte en el sorteo!</p>
              </div>
            ) : (
              <Button onClick={participar} fullWidth disabled={cargando}>
                {cargando ? "Registrando..." : "Participar por $0.10 USD"}
              </Button>
            )}
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