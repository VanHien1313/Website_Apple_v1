import sql from 'mssql';
import { createRequire } from 'node:module';
export interface SqlClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(statement: string, values?: unknown[]): Promise<{ rows: T[] }>;
  exec(statement: string): Promise<void>;
}
export interface Database extends SqlClient {
  transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export interface DatabaseConfig {
  server: string; database: string; authentication: 'windows' | 'sql';
  user?: string; password?: string; port?: number; encrypt: boolean; trustServerCertificate: boolean;
}
export function createDatabase(config: DatabaseConfig): Database {
  const driver: typeof sql = config.authentication === 'windows' ? createRequire(import.meta.url)('mssql/msnodesqlv8') : sql;
  const quoted = (value: string) => `{${value.replace(/}/g, '}}')}}`;
  const pool = new driver.ConnectionPool({
    server: config.server, database: config.database, user: config.user, password: config.password,
    ...(config.port ? { port: config.port } : {}),
    connectionTimeout: 5000, requestTimeout: 15000, pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: config.encrypt, trustServerCertificate: config.trustServerCertificate, useUTC: true,
      ...(config.authentication === 'windows' ? { trustedConnection: true } : {}) },
    ...(config.authentication === 'windows' ? { connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${quoted(config.server + (config.port ? ',' + config.port : ''))};Database=${quoted(config.database)};Trusted_Connection=Yes;Encrypt=${config.encrypt ? 'Yes' : 'No'};TrustServerCertificate=${config.trustServerCertificate ? 'Yes' : 'No'};` } : {}),
  });
  pool.on('error', () => console.error(JSON.stringify({ event: 'database_pool_error' })));
  function client(target: sql.ConnectionPool | sql.Transaction): SqlClient {
    return {
      async query<T extends Record<string, unknown>>(statement: string, values: unknown[] = []) {
        const request = target.request();
        values.forEach((value, index) => {
          if (typeof value === 'number') {
            if (!Number.isSafeInteger(value)) throw new Error('SQL numeric parameters must be safe integers');
            request.input(`arg${index+1}`, driver.BigInt, value);
          } else if (Buffer.isBuffer(value)) request.input(`arg${index+1}`, driver.VarBinary(driver.MAX), value);
          else if (typeof value === 'boolean') request.input(`arg${index+1}`, driver.Bit, value);
          else if (value === null || value === undefined || typeof value === 'string') request.input(`arg${index+1}`, driver.NVarChar(driver.MAX), value ?? null);
          else throw new Error('Unsupported SQL parameter');
        });
        const result = await request.query<T>(statement);
        return { rows: result.recordset ?? [] };
      },
      async exec(statement) { await target.request().batch(statement); },
    };
  }
  return {
    async query(statement, values) { await pool.connect(); return client(pool).query(statement, values); },
    async exec(statement) { await pool.connect(); await client(pool).exec(statement); },
    async transaction(work) {
      await pool.connect(); const tx = new driver.Transaction(pool); let rolledBack = false;
      tx.on('rollback', () => { rolledBack = true; });
      await tx.begin(driver.ISOLATION_LEVEL.SERIALIZABLE);
      try { const result = await work(client(tx)); await tx.commit(); return result; }
      catch (error) { if (!rolledBack) { try { await tx.rollback(); } catch { /* preserve original error */ } } throw error; }
    },
    async close() { await pool.close(); },
  };
}
export async function lockTransaction(tx: SqlClient, resource: string) {
  await tx.query(`DECLARE @result int;
    EXEC @result=sys.sp_getapplock @Resource=@arg1,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
    IF @result < 0 THROW 51000, 'Could not acquire application lock', 1;`, [resource]);
}
