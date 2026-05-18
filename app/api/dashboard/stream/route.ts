import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * FIX #4: SSE ARCHITECTURE & TRADE-OFF EXPLANATION
 * 
 * This file implements Server-Sent Events (SSE) via polling (setInterval).
 * 
 * Why this approach was chosen:
 * - Simplicity: Does not require external infrastructure like Redis.
 * - Statelessness: Works natively over standard HTTP connections.
 * - Directionality: The dashboard only needs to receive one-way updates from the server.
 * 
 * Scalability limitations of Polling SSE:
 * - Repeated database queries every 3 seconds per connected client.
 * - In a serverless environment (like Vercel functions), long-lived connections 
 *   can time out or incur higher execution duration costs.
 * 
 * Future Production Scaling Paths:
 * 1. PostgreSQL LISTEN/NOTIFY: Use DB triggers to push events rather than polling.
 * 2. Redis Pub/Sub: Maintain a centralized event bus across multiple server instances.
 * 3. WebSockets / Socket.io: Better for bidirectional real-time communication if 
 *    providers need to interact (e.g. accepting/rejecting leads live).
 */

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const providers = await prisma.provider.findMany({
            include: {
              assignments: {
                include: {
                  lead: { include: { service: true } }
                },
                orderBy: { assignedAt: 'desc' }
              }
            },
            orderBy: { id: 'asc' }
          })
          const data = `data: ${JSON.stringify(providers)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (e) {
          console.error('[SSE stream error]', e)
        }
      }

      // Send immediately on connect
      send()

      // Then poll database every 3 seconds
      const interval = setInterval(send, 3000)

      // Clean up interval when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
