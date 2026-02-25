"use client"

import { useWorldAuth } from "@radish-la/world-auth"
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js"
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

type Ganador = {
  fecha_rifa: string
  username: string
  participantes: number
  pool_ganador: number
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
  const [ganadores, setGanadores] = useState<Ganador[]>([])

  useEffect(() => {
    cargarParticipantes()
    cargarGanadores()
  }, [])

  useEffect(() => {
    if (user) {
      const id = (user as any).nullifier_hash || (user as any).id || user.username
      if (id) verificarParticipacion(id)
    }
  }, [user])

  async function cargarParticipantes() {
    const hoy = new Date().toISOString().split("T")[0]
    const { count } = await supabase
      .from("participantes")
      .select("*", { count: "exact", head: true })
      .eq("fecha_rifa", hoy)
    setParticipantes(count || 0)
  }

  async function cargarGanadores() {
    const { data } = await supabase
      .from("ganadores")
      .select("fecha_rifa, username, participantes, pool_ganador")
      .order("fecha_rifa", { ascending: false })
      .limit(5)
    if (data) setGanadores(data)
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
    if (!MiniKit.isInstalled()) {
      alert("Abre esta app dentro de World App")
      return
    }

    const id = (user as any)?.nullifier_hash || (user as any)?.id || user?.username
    if (!id) {
      alert("Error: no se pudo obtener tu ID")
      return
    }

    setCargando(true)

    try {
      const refRes = await fetch("/api/initiate-payment", { method: "POST" })
      const { id: reference } = await refRes.json()

      const payload: PayCommandInput = {
        reference,
        to: process.env.NEXT_PUBLIC_WALLET_ADDRESS as string,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(0.1, Tokens.WLD).toString(),
          },
        ],
        description: "Entrada LuckyHuman - Rifa diaria",
      }

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)

      const confirmRes = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: finalPayload,
          world_id: id,
          username: user?.username,
        }),
      })

      const result = await confirmRes.json()

      if (result.success) {
        setYaParticipo(true)
        setParticipantes((p) => p + 1)
      } else {
        alert("Error al confirmar pago: " + result.error)
      }
    } catch (err) {
      alert("Error inesperado: " + String(err))
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
                {cargando ? "Procesando pago..." : "Participar — 0.10 WLD"}
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={signIn} fullWidth>
            Conectar con World ID
          </Button>
        )}
      </div>

      {ganadores.length > 0 && (
        <div className="w-full max-w-sm mt-10">
          <h2 className="text-gray-400 text-sm font-semibold mb-3 text-center uppercase tracking-widest">
            Últimos ganadores
          </h2>
          <div className="flex flex-col gap-3">
            {ganadores.map((g) => (
              <div key={g.fecha_rifa} className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">@{g.username}</p>
                  <p className="text-gray-500 text-xs">{g.fecha_rifa} · {g.participantes} participantes</p>
                </div>
                <p className="text-green-400 font-bold text-sm">{g.pool_ganador.toFixed(2)} WLD</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-gray-600 text-xs mt-8 text-center max-w-xs">
        Solo 1 entrada por persona verificada. Sin bots. Sin trampa.
      </p>
    </main>
  )
}