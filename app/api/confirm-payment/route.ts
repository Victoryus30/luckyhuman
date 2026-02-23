import { NextRequest, NextResponse } from "next/server"
import { createPublicClient, http } from "viem"
import { supabase } from "../../../lib/supabase"

const worldchain = {
  id: 480,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
  },
}

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http(),
})

export async function POST(req: NextRequest) {
  const { payload, world_id, username } = await req.json()

  if (!payload || payload.status === "error") {
    return NextResponse.json({ error: "Pago cancelado o fallido" }, { status: 400 })
  }

  if (!payload.transaction_id) {
    return NextResponse.json({ error: "Sin transaction_id" }, { status: 400 })
  }

  const { data: ref, error: refError } = await supabase
    .from("payment_references")
    .select("*")
    .eq("reference", payload.reference)
    .eq("status", "pending")
    .single()

  if (refError || !ref) {
    return NextResponse.json({ error: "Referencia inválida o ya usada" }, { status: 400 })
  }

  // Obtener wallet del participante desde el blockchain
  let wallet_address = null
  try {
    const tx = await publicClient.getTransaction({
      hash: payload.transaction_id as `0x${string}`,
    })
    wallet_address = tx.from
  } catch (e) {
    console.log("No se pudo obtener wallet desde blockchain:", e)
  }

  await supabase
    .from("payment_references")
    .update({ status: "confirmed" })
    .eq("reference", payload.reference)

  const hoy = new Date().toISOString().split("T")[0]
  const { error: insertError } = await supabase.from("participantes").insert({
    world_id,
    username,
    fecha_rifa: hoy,
    transaction_id: payload.transaction_id,
    wallet_address,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}