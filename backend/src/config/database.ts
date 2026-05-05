import pgPromise, { IDatabase, IInitOptions } from 'pg-promise';

// ==========================================
// Database Configuration
// ==========================================

const initOptions: IInitOptions<{}> = {
  capSQL: true,
  error: (error, context) => {
    console.error('Database Error:', {
      message: error.message,
      context: context
    });
  }
};

const pgp = pgPromise(initOptions);

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mitaneko_db',
  user: process.env.DB_USER || 'mitaneko_user',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

const db: IDatabase<{}> = pgp(dbConfig);

// Test connection
export async function testConnection(): Promise<void> {
  try {
    const result = await db.one('SELECT NOW() as now');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export { db, pgp };
