import { AccountRenameLog } from '@/model/entities';

export const accountRenameLogProvider = {
  provide: 'ACCOUNT_RENAME_LOG_REPOSITORY',
  useValue: AccountRenameLog,
};
