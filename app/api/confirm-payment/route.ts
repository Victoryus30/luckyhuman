import { NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

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

  // Obtener wallet desde la API de World
  let wallet_address = null
  try {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${process.env.APP_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DEV_PORTAL_API_KEY}`,
        },
      }
    )
    const txData = await res.json()
    console.log("TX DATA:", JSON.stringify(txData))
    wallet_address = txData.fromWalletAddress || txData.from || txData.wallet_address || null
  } catch (e) {
    console.log("Error obteniendo wallet:", e)
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