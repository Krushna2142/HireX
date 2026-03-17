// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import databaseConfig from './database.config';

/**
 * @Global() — registers DatabaseService as a singleton available
 * across the entire application without re-importing this module.
 *
 * Import once in AppModule. That's it.
 *
 * ConfigModule.forFeature() scopes the 'database' namespace config
 * (DATABASE_URL, DIRECT_URL) to this module so DatabaseService
 * can resolve config.get('database.connectionString') correctly.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig), // Registers the 'database' namespace
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}