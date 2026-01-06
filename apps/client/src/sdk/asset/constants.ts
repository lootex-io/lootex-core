type BatchTransferConfig = {
  entryPoint: `0x${string}`;
  conduit: `0x${string}`;
  conduitKey: `0x${string}`;
};

const batchTransferConfig: BatchTransferConfig = {
  entryPoint: '0x0000000000c2d145a2526bD8C716263bFeBe1A72',
  conduit: '0x1E0049783F008A0085193E00003D00cd54003c71',
  conduitKey:
    '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
};

const batchTransferConfigMantle: BatchTransferConfig = {
  entryPoint: '0x0CF7eb1eda4b053d152D6CB4E4a133018dd0aB37',
  conduit: '0x1e2672C791Db2196f49E792D14E5BFBEE1337ff9',
  conduitKey:
    '0xdae4c2f6ddfd5211994e0ad5cb299b53fe0678643b2b537152150a2f553648d7',
};

const batchTransferConfigSoneium: BatchTransferConfig = {
  entryPoint: '0x10aD7C21e5ca54E0B272F2F7B464Ce67EA2457Cc',
  conduit: '0x1B6c4950A5BB474147BFB34865bc1986702F1630',
  conduitKey:
    '0xab2bb0966c2fc71cde7a49d8679ae70b03a896165d0017b9879045e8350b3598',
};

const batchTransferConfigSoneiumMinato: BatchTransferConfig = {
  entryPoint: '0x5C7Df9e510C99854E606Fb77Dd7AA495D24eA8ff',
  conduit: '0x79b96aE03F7fBFc8457Fe80F40468dcb9488BC6f',
  conduitKey:
    '0x3d71d7dc971e9f8405f287a340e8f65a7a1d392a000000000000000000000000',
};

export const batchTransferConfigs: Record<number, BatchTransferConfig> = {
  [1]: batchTransferConfig,
  [56]: batchTransferConfig,
  [137]: batchTransferConfig,
  [43114]: batchTransferConfig,
  [42161]: batchTransferConfig,
  [5000]: batchTransferConfigMantle,
  [5001]: batchTransferConfigMantle,
  [80001]: batchTransferConfig,
  [8453]: batchTransferConfig,
  [1868]: batchTransferConfigSoneium,
  [1946]: batchTransferConfigSoneiumMinato,
};
