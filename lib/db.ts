import sql from "mssql";

const useWindowsAuth = process.env.DB_WINDOWS_AUTH === "true";
const useNamedPipe = process.env.DB_USE_NAMED_PIPE === "true";
const rawHost = process.env.DB_HOST ?? "localhost";
const [rawServer, instanceName] = rawHost.includes("\\") ? rawHost.split("\\", 2) : [rawHost, undefined];
const serverName = rawServer === "." ? "localhost" : rawServer;
const baseOptions = {
  encrypt: process.env.DB_ENCRYPT === "true",
  trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === "true",
  ...(instanceName ? { instanceName } : {}),
  ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
};

const config: sql.config = useNamedPipe
  ? {
      server: serverName,
      options: {
        ...baseOptions,
        instanceName,
        enableArithAbort: true,
      },
    }
  : useWindowsAuth
    ? {
        server: serverName,
        database: process.env.DB_NAME ?? "USPProd_Sandbox",
        authentication: {
          type: "ntlm",
          options: {
            userName: process.env.DB_USER ?? "",
            password: process.env.DB_PASSWORD ?? "",
            domain: process.env.DB_DOMAIN ?? "",
          },
        },
        options: baseOptions,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: serverName,
        database: process.env.DB_NAME ?? "USPProd_Sandbox",
        options: baseOptions,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      };

let pool: sql.ConnectionPool | null = null;

export async function getPool() {
  if (pool) return pool;
  pool = await new sql.ConnectionPool(config).connect();
  return pool;
}

export { sql };
