import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Guards against a stale dev-server singleton: when the Prisma schema gains new
 * models, `prisma db push` regenerates the client on disk, but a running dev
 * process keeps its old instance in globalThis — without the new delegates.
 * In that case a fresh client is created instead. After a normal boot this
 * check is a no-op and the usual single-instance behaviour is preserved.
 */
function isUpToDate(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    client && typeof (client as unknown as Record<string, unknown>).application === 'object',
  )
}

const activeClient = isUpToDate(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : new PrismaClient({
      log: ['query'],
    })

globalForPrisma.prisma = activeClient

export const db = activeClient
