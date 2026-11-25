import { DynamicModule, Global, Module } from '@nestjs/common';
import { AppConfig } from './env';

export const CONFIG = Symbol('CONFIG');

/** Makes the validated configuration available to every module. */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return { module: ConfigModule, providers: [{ provide: CONFIG, useValue: config }], exports: [CONFIG] };
  }
}
