const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    },
  })
  try {
    await prisma.$connect()
    console.log('Verbindung erfolgreich!')
    
    const result = await prisma.$queryRaw`SELECT current_database()`
    console.log('Aktuelle Datenbank:', result)

    const existingTables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    console.log('Existierende Tabellen:', existingTables)
  } catch (error) {
    console.error('Verbindungsfehler:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()