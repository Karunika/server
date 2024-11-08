import express, { Router } from 'express'
import HandlersService from './handlers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import bodyParser from 'body-parser'
import ConfigService from './config'
import QueryService from './queries'
import RouterService from './router'
import { PgScope } from './database'


PgScope((pgClient) => {
    const QueryLiveService = QueryService({ pgClient })

    const HandlersLiveService = HandlersService({
        QueryLiveService,
        ConfigService,
        jwtService: jwt,
        bcryptService: bcrypt
    })

    const app = express()

    const RouterServiceLive = RouterService({ HandlersLiveService })

    app.use(bodyParser.json())
    app.use('/api', RouterServiceLive)

    app.listen(3000, () => {
        console.log('listening on port 3000')
    })
})

