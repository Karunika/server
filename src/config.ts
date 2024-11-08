
const ConfigService = {
    getAccessToken: () => process.env.ACCESS_TOKEN_SECRET,
    getDatabaseUrl: () => process.env.DATABASE_URL
}

export default ConfigService
