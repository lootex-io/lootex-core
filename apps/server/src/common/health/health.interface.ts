import { ModuleMetadata } from '@nestjs/common/interfaces';

export const HEALTH_MODULE_OPTIONS = 'HealthModuleOptions';

export type HealthModuleOptions = {
  db?: {
    enabled?: boolean;
  };
  redis?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    password?: string;
  };
};

export interface HealthModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory?: (
    ...args: any[]
  ) => HealthModuleOptions | Promise<HealthModuleOptions>;
}
