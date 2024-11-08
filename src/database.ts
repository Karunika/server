import pg from 'pg'

const { Client } = pg


export type Workflow = (client: any) => void

export const PgScope = async (workflow: Workflow) => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    })
    await client.connect()

    workflow(client)

    // await client.end()
}
