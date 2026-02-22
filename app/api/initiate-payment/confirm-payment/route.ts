import { NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

export async function POST(req: NextRequest) {
  const { payload, world_id, username } = await req.json()

  if (!payload || payload.status === "error") {
    return NextResponse.json({ error: "Pago cancelado o fallido" }, { status: 400 })
  }

  // 1. Verificar que el reference existe y está pendiente
  const { data: ref, error: refError } = await supabase
    .from("payment_references")
    .select("*")
    .eq("reference", payload.reference)
    .eq("status", "pending")
    .single()

  if (refError || !ref) {
    return NextResponse.json({ error: "Referencia de pago inválida" }, { status: 400 })
  }

  // 2. Verificar el pago con World
  const verifyRes = await fetch(
    `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${process.env.APP_ID}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.DEV_PORTAL_API_KEY}`,
      },
    }
  )

  const transaction = await verifyRes.json()

  if (transaction.transactionStatus !== "mined") {
    return NextResponse.json({ error: "Transacción no confirmada aún" }, { status: 400 })
  }

  // 3. Marcar reference como usado
  await supabase
    .from("payment_references")
    .update({ status: "confirmed" })
    .eq("reference", payload.reference)

  // 4. Registrar participante
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