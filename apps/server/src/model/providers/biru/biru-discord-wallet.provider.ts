import { BiruDiscordWallet } from '@/model/entities/biru/biru-wallet-discord.entity';

export const biruDiscordWalletProvider = {
  provide: 'BIRU_DISCORD_WALLET_REPOSITORY',
  useValue: BiruDiscordWallet,
};
