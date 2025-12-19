export enum SdkEnv {
  // Seaport
  PLATFORM_FEE = 'PLATFORM_FEE',
  PLATFORM_FEE_ADDRESS = 'PLATFORM_FEE_ADDRESS',

  // gp
  GP_EXCHANGE_LOOT_GP = 'GP_EXCHANGE_LOOT_GP', // loot兑换gp的汇率 eg: 5 => 1loot = 5gp
  GP_EXCHANGE_GP_USD = 'GP_EXCHANGE_GP_USD', // gp兑换usd的汇率 eg: 0.01 => 1gp = 0.01usd
  GP_PAYMASTER_ID = 'GP_PAYMASTER_ID', // gp paymaster id 地址
  EXCHANGE_FEE_RATE = 'EXCHANGE_FEE_RATE', // Platform exchange transaction fee rate, 计算推荐月交易奖励quest中使用 eg: 0.025
  EXCHANGE_REFERRAL_REBATE_RATE = 'EXCHANGE_REFERRAL_REBATE_RATE', // Referral profit rebate rate, 计算推荐月交易奖励quest中使用 eg:0.5
  GP_TOKEN_DECIMAL = 'GP_TOKEN_DECIMAL', // token 默认 decimal eg: 18

  // FIZZPOP
  FIZZPOP_WHITELIST_ENABLE = 'FIZZPOP_WHITELIST_ENABLE', //
}
