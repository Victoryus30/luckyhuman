import { NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

async function verificarTransaccion(transactionId: string, appId: string, apiKey: string, intentos = 5): Promise<any> {
  for (let i = 0; i < intentos; i++) {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${appId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )
    const data = await res.json()
    console.log("Intento", i + 1, "- Respuesta World:", JSON.stringify(data))
    if (data.transactionStatus === "mined") return data
    await new Promise((r) => setTimeout(r, 3000))
  }
  return null
}

export async function POST(req: NextRequest) {
  const { payload, world_id, username } = await req.json()

  if (!payload || payload.status === "error") {
    return NextResponse.json({ error: "Pago cancelado o fallido" }, { status: 400 })
  }

  const { data: ref, error: refError } = await supabase
    .from("payment_references")
    .select("*")
    .eq("reference", payload.reference)
    .eq("status", "pending")
    .single()

  if (refError || !ref) {
    return NextResponse.json({ error: "Referencia de pago inválida" }, { status: 400 })
  }

  const transaction = await verificarTransaccion(
    payload.transaction_id,
    process.env.APP_ID as string,
    process.env.DEV_PORTAL_API_KEY as string
  )

  if (!transaction) {
    return NextResponse.json({ error: "Transacción no confirmada después de varios intentos" }, { status: 400 })
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
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}