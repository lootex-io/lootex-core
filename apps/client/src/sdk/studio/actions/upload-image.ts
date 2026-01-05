import { createApiClient } from '../../api/api-client';
import type { Client } from '../../client/index';

export const uploadImage = async ({
  imageFile,
  assetName,
  client,
}: {
  imageFile: File | Buffer;
  assetName: string;
  client: Client;
}) => {
  const apiClient = createApiClient({
    client,
  });

  try {
    const file =
      imageFile instanceof Buffer
        ? new File([Buffer.from(imageFile)], `${assetName}.png`, {
            type: 'image/png',
          })
        : imageFile;

    const image = await apiClient.studio.uploadBlindBoxImage(file as File);

    if (!image?.url) {
      throw new Error('Failed to upload image');
    }

    return image.url;
  } catch (error) {
    throw new Error('Failed to upload image');
  }
};
