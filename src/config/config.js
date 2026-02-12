require('dotenv').config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL, NODE_ENV } = process.env;

const baseCommon = {
  dialect: 'postgres',
  logging: false
};

const sslCommon = {
  ...baseCommon,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
};

const needSSL = Boolean(DATABASE_URL) || NODE_ENV === 'production';

const common = needSSL ? sslCommon : baseCommon;

module.exports = {
  development: DATABASE_URL ? {
    url: DATABASE_URL,
    ...common
  } : {
    username: DB_USER || 'postgres',
    password: DB_PASSWORD || 'postgres',
    database: DB_NAME || 'esi_edt',
    host: DB_HOST || '127.0.0.1',
    port: DB_PORT || 5432,
    ...common
  },
  test: {
    username: DB_USER || 'postgres',
    password: DB_PASSWORD || 'postgres',
    database: (DB_NAME || 'esi_edt') + '_test',
    host: DB_HOST || '127.0.0.1',
    port: DB_PORT || 5432,
    ...common
  },
  production: DATABASE_URL ? {
    url: DATABASE_URL,
    ...common
  } : {
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
    ...common
  }
};
