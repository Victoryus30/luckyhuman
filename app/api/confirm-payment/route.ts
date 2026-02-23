import { NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

export async function POST(req: NextRequest) {
  const { payload, payload_debug, world_id, username } = await req.json()

  // Log para ver qué contiene el payload
  console.log("PAYLOAD COMPLETO:", payload_debug)

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
    wallet_address: null,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}