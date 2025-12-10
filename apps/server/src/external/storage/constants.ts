export const BUCKET = process.env.GCP_BUCKET_NAME || 'lootex-imgix-dev';
export const BUCKET_PATH = 'images';
export const IMGIX_BASE_URL =
  // BUCKET === 'lootex-imgix-production'
  //   ? 'https://lootex-cdn.imgix.net'
  //   : 'https://lootex-dev-cdn.imgix.net';
  BUCKET === 'lootex-imgix-production'
    ? 'https://lootex-dev.s3.us-east-1.amazonaws.com'
    : 'https://lootex-dev.s3.us-east-1.amazonaws.com';
