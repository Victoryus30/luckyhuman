import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { supabase } from "../../../lib/supabase"

export async function POST() {
  const reference = uuidv4()

  const { error } = await supabase
    .from("payment_references")
    .insert({ reference, status: "pending" })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: reference })
}