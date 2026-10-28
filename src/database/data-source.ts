import { DataSource } from 'typeorm';
import { databaseUrlSchema } from '../config/env.schema.js';
import { createCliDatabaseOptions } from './database.config.js';

const databaseUrl = databaseUrlSchema.parse(process.env.DATABASE_URL);

export default new DataSource(createCliDatabaseOptions(databaseUrl));
