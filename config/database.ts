export default ({ env }) => ({
  connection: env('NODE_ENV') === 'production'
    ? {
        client: 'postgres',
        connection: {
          host: env('PGHOST'),
          port: env.int('PGPORT', 5432),
          database: env('PGDATABASE'),
          user: env('PGUSER'),
          password: env('PGPASSWORD'),
          ssl: env.bool('PGSSL', true) ? {
            rejectUnauthorized: false
          } : false,
        },
        debug: false,
      }
    : {
        client: 'sqlite',
        connection: {
          filename: env('DATABASE_FILENAME', '.tmp/data.db'),
        },
        useNullAsDefault: true,
      },
});
