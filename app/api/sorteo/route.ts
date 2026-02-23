import { NextResponse } from "next/server"
import { createWalletClient, createPublicClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { supabase } from "../../../lib/supabase"

const worldchain = {
  id: 480,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
  },
}

const WLD_CONTRACT = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003"

const WLD_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

export async function GET(req: Request) {
  // Verificar clave secreta para proteger el endpoint
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const hoy = new Date().toISOString().split("T")[0]

  // Verificar que no se haya hecho el sorteo hoy ya
  const { data: ganadorExistente } = await supabase
    .from("ganadores")
    .select("id")
    .eq("fecha_rifa", hoy)
    .single()

  if (ganadorExistente) {
    return NextResponse.json({ message: "Sorteo ya realizado hoy" })
  }

  // Obtener participantes de hoy
  const { data: participantes, error } = await supabase
    .from("participantes")
    .select("*")
    .eq("fecha_rifa", hoy)

  if (error || !participantes || participantes.length === 0) {
    return NextResponse.json({ message: "Sin participantes hoy" })
  }

  // Elegir ganador al azar
  const indice = Math.floor(Math.random() * participantes.length)
  const ganador = participantes[indice]

  // Calcular pool (92% del total, 8% comisión)
  const poolGanador = participantes.length * 0.1 * 0.92

  // Transferir WLD al ganador
  const account = privateKeyToAccount(process.env.PROJECT_WALLET_PRIVATE_KEY as `0x${string}`)

  const walletClient = createWalletClient({
    account,
    chain: worldchain,
    transport: http(),
  })

  const publicClient = createPublicClient({
    chain: worldchain,
    transport: http(),
  })

  // Convertir WLD a wei (18 decimales)
  const amount = parseEther(poolGanador.toFixed(18))

  const hash = await walletClient.writeContract({
    address: WLD_CONTRACT,
    abi: WLD_ABI,
    functionName: "transfer",
    args: [ganador.world_id as `0x${string}`, amount],
  })

  // Esperar confirmación
  await publicClient.waitForTransactionReceipt({ hash })

  // Guardar ganador en base de datos
  await supabase.from("ganadores").insert({
    fecha_rifa: hoy,
    world_id: ganador.world_id,
    username: ganador.username,
    participantes: participantes.length,
    pool_ganador: poolGanador,
  })

  return NextResponse.json({
    success: true,
    ganador: ganador.username,
    pool: poolGanador,
    tx: hash,
  })
}