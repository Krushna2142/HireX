import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
// ts-api/src/database/datbase.module.ts
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}