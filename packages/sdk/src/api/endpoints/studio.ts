import type { AssetTrait } from '../../asset/types.js';
import type { LootexCollection } from '../../collection/types.js';
import type { createRequest } from '../request.js';
import {
  type PaginatedParams,
  type PaginatedResponse,
  fileToFormData,
} from './utils.js';

export type StudioContractMode = 'Normal' | 'Badge';

export type StudioContractStatus =
  | 'Unpublished'
  | 'Publishing'
  | 'Published'
  | 'Sale'
  | 'SaleEnd'
  | null;

export type StudioContract = {
  address: `0x${string}`;
  id: string;
  chainId: number;
  schemaName: 'ERC721';
  name: string;
  description: string;
  status: StudioContractStatus;
  symbol: string;
  logoImageUrl: string | null;
  isBlindbox: boolean;
  blindboxUrl: string | null;
  blindboxName: string | null;
  blindboxDescription: string | null;
  blindboxTraits: AssetTrait[] | null;
  blindboxKey: string;
  isVisible: boolean;
  creatorAddress: string | null;
  ownerAddress: string | null;
  dropFeeInfo: Record<`0x${string}`, number> | null;
  creatorFee: string;
  creatorFeeAddress: `0x${string}` | null;
  isCreatorFee: boolean;
  isStartDrop: boolean;
  dropName: string | null;
  dropDescription: string | null;
  dropUrls: string[] | null;
  isRevealed: boolean;
  mode: StudioContractMode;
  drops?: ClaimCondition[];
};

export type CreateStudioContractParams = {
  schemaName: 'ERC721';
  chainId: number | string;
  name: string;
  symbol: string;
  logoImageUrl?: string;
  mode: StudioContractMode;
};
export type CreateStudioContractResponse = StudioContract;

export type GetCraetedContractsParams = PaginatedParams;
export type GetCraetedContractsResponse = PaginatedResponse<
  StudioContract,
  'contracts'
>;

export type GetCraetedContractParams = {
  contractId: string;
};
export type GetCraetedContractResponse = StudioContract;

export type UploadedItem = {
  contractId: string;
  createdAt: string;
  description: string;
  fileKey: string;
  fileName: string;
  id: string;
  index: number;
  name: string;
  status: number;
  tokenId: string;
  tokenUri: string;
  traits: AssetTrait[] | null;
  updatedAt: string;
  uploadS3At: string;
  imageUrl: string;
};
export type GetUploadedItemsParams = PaginatedParams<{
  contractId: string;
  keyword?: string;
}>;
export type GetUploadedItemsResponse = PaginatedResponse<UploadedItem, 'items'>;

export type FileListItem = {
  fileName: string;
  index?: number;
};
export type UploadFileListPrams = {
  contractId: string;
  fileList: FileListItem[];
};

export type GetS3PreSignedUrlPrams = {
  contractId: string;
  fileNames: string[];
};
export type GetS3PreSignedUrlResponse = {
  signedUrl: string;
  fileKey: string;
  upload: boolean;
}[];

export type UploadFilesCallbackPrams = {
  contractId: string;
  items: {
    fileName: string;
    fileCID: string;
  }[];
};
export type UploadFilesCallbackResponse = {
  updatedCount: number;
};

export type DeleteUploadedItemsPrams = {
  contractId: string;
  all?: boolean;
  ids?: string[];
};
export type DeleteUploadedItemsResponse = {
  deletedCount: number;
};

export type UpdateMetadataParams = {
  contractId: string;
  name: string;
  description?: string;
  ids?: (string | number)[];
  mode: 'all' | 'batch';
};
export type UpdateMetadataResponse = {
  updateCount: number;
};

export type GetCSVTemplateParams = {
  contractId: string;
};

export type UploadMetadataCSVParams = {
  contractId: string;
  file: File;
};

export type GetContractStatusParams = {
  contractId: string;
};
export type GetContractStatusResponse = {
  status: 'Init' | 'S3Done' | 'IpfsDone';
  minIndex: number;
  metadataDone: boolean;
  s3Progress: number;
  ipfsProgress: number;
};

export type ClaimCondition = {
  id: string;
  studioContractId: string;
  allowlist: string | null;
  amount: string;
  price: string;
  currency: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
  limitPerWallet: string;
  startTime: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  merkleRoot: `0x${string}` | null;
  merkleProof: `0x${string}`[] | null;
};
export type GetClaimConditionsParams = {
  contractId: string;
};
export type GetClaimConditionsResponse = ClaimCondition[];

export type BlindBoxTrait = {
  trait_type: string;
  value: string;
};
export type UpdateBlindBoxParams = {
  contractId: string;
  isBlindbox: boolean;
  blindboxUrl: string;
  blindboxName: string;
  blindboxDescription?: string;
  blindboxTraits?: BlindBoxTrait[];
};
export type UpdateBlindBoxResponse = StudioContract;

export type UpdateContractParams = {
  contractId: string;
  dropFeeInfo?: Record<`0x${string}`, number>;
  dropName?: string;
  dropDescription?: string;
  dropUrls?: string[];
  creatorFeeAddress?: `0x${string}` | null;
  isCreatorFee?: boolean;
};
export type UpdateContractResponse = {
  updateCount: number;
};

export type CreateClaimConditionParams = {
  contractId: string;
  allowlist: string;
  amount: string;
  price: string;
  currencyAddress: `0x${string}`;
  startTime: Date;
  limitPerWallet: string;
};
export type CreateClaimConditionResponse = StudioContract;

export type UpdateClaimConditionParams = CreateClaimConditionParams & {
  dropId: string;
};
export type UpdateClaimConditionResponse = StudioContract;

export type DeleteClaimConditionParams = {
  contractId: string;
  dropId: string;
};
export type DeleteClaimConditionResponse = {
  id: string;
  name: string;
  deletedDrop: number;
};

export type SyncDeployedContractParams = {
  contractId: string;
  txHash: string;
};
export type SyncDeployedContractResponse = {
  success: string;
  contractAddress: `0x${string}`;
};

export type SyncIPFSParams = {
  contractId: string;
};
export type SyncIPFSResponse = {
  progress: number;
  startTime: number;
  endTime: number;
  contractId: string;
};

export type SyncTokenURIParams = {
  contractId: string;
  sync?: boolean;
};
export type SyncTokenURIResponse = {
  status: 'pending' | 'success' | 'fail';
  baseUri?: string;
};

export type SyncBlindBoxParams = {
  contractId: string;
};
export type SyncBlindBoxResponse = {
  imageUri: string;
  tokenUri: string;
  blindboxKey: string;
};

export type DeleteContractParams = {
  contractId: string;
};
export type DeleteContractResponse = {
  id: string;
  name: string;
  deletedDrop: number;
  deletedAssets: number;
  deletedContract: number;
};

export type GetPostPublishOverviewParams = {
  contractId: string;
  force?: boolean;
};
export type GetPostPublishOverviewResponse = {
  collection: Partial<LootexCollection>;
  contract: StudioContract;
};

export type GetSalesOverviewParams = {
  contractId: string;
};
export type GetSalesOverviewResponse = {
  totalSales: number;
  owner: number;
  minted: number;
};

export type UpdateDropVisibilityParams = {
  contractId: string;
  visibility: boolean;
};
export type UpdateDropVisibilityResponse = StudioContract;

export type GetWhitelistProofParams = {
  contractId: string;
  dropId: string;
  walletAddress: `0x${string}`;
  tokenId?: number;
};
export type GetWhitelistProofResponse = {
  isWhitelisted: boolean;
  address: `0x${string}`;
  limitAmount: string;
  value: string;
  merkleProof: `0x${string}`[];
};

export type SyncContractStatusParams = {
  contractId: string;
};
export type SyncContractStatusResponse = {
  success: boolean;
  debug: string;
};

export type LaunchpadContract = {
  id: string;
  chainId: number;
  address: `0x${string}`;
  currencyAddress: `0x${string}`;
  name: string;
  dropUrls: string[];
  collection: LootexCollection;
  price: string;
  priceSymbol: string;
  totalSupply: string;
  maxSupply: string;
  startTime: string;
  status: string;
  schemaName: string;
  tokenId: string | null;
};

export type GetLaunchpadParams = PaginatedParams<{
  chainId: number;
  type: 'current' | 'past';
  addresses?: `0x${string}`[];
}>;

export type GetLaunchpadResponse = PaginatedResponse<
  LaunchpadContract,
  'contracts'
>;

export const createStudioEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  createContract: (params: CreateStudioContractParams) => {
    return request<CreateStudioContractResponse>({
      method: 'POST',
      path: '/v3/studio/contracts',
      body: params,
    });
  },
  getCraetedContract: (params: GetCraetedContractParams) => {
    return request<GetCraetedContractResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/${params.contractId}`,
    });
  },
  getCraetedContracts: (params: GetCraetedContractsParams) => {
    return request<GetCraetedContractsResponse>({
      method: 'GET',
      path: '/v3/studio/contracts',
      query: params,
    });
  },
  getUploadedItems: (params: GetUploadedItemsParams) => {
    const { contractId, ...restParams } = params;
    return request<GetUploadedItemsResponse>({
      method: 'GET',
      path: `/v3/studio/upload/contracts/${contractId}/item`,
      query: restParams,
    });
  },
  uploadFileList: (params: UploadFileListPrams) => {
    const { contractId, fileList } = params;
    return request({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${contractId}/item`,
      body: fileList,
    });
  },
  getS3PreSignedUrl: (params: GetS3PreSignedUrlPrams) => {
    return request<GetS3PreSignedUrlResponse>({
      method: 'POST',
      path: '/v3/studio/upload/presigned-url',
      body: params,
    });
  },
  uploadFilesCallback: (params: UploadFilesCallbackPrams) => {
    return request<UploadFilesCallbackResponse>({
      method: 'POST',
      path: '/v3/studio/upload/contract-item/callback',
      body: params,
    });
  },
  deleteUploadedItems: (params: DeleteUploadedItemsPrams) => {
    const { contractId, ...restParams } = params;
    return request<DeleteUploadedItemsResponse>({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${contractId}/delete-item`,
      body: restParams,
    });
  },
  updateMetadata: (params: UpdateMetadataParams) => {
    const { contractId, ...restParams } = params;
    return request<UpdateMetadataResponse>({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${contractId}/update-item`,
      body: restParams,
    });
  },
  getCSVTemplate: (params: GetCSVTemplateParams) => {
    const { contractId } = params;
    return request<boolean>({
      method: 'GET',
      path: `/v3/studio/upload/contracts/${contractId}/template`,
      overrideResponseHandler: async <T>(response: Response) => {
        const blob = await response.blob();

        if (response.ok) {
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', 'metadata_template.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return Promise.resolve(true as T);
        }
        throw new Error('Failed to download template');
      },
    });
  },
  uploadMetadataCSV: (params: UploadMetadataCSVParams) => {
    const { contractId, file } = params;
    return request({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${contractId}/upload-csv`,
      body: fileToFormData(file),
    });
  },
  getContractStatus: (params: GetContractStatusParams) => {
    const { contractId } = params;
    return request<GetContractStatusResponse>({
      method: 'GET',
      path: `/v3/studio/upload/contracts/${contractId}/status`,
    });
  },
  uploadLogoImage: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/studio/upload/contracts/upload-logo',
      body: fileToFormData(file),
    });
  },
  getClaimConditions: (params: GetClaimConditionsParams) => {
    const { contractId } = params;
    return request<GetClaimConditionsResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/${contractId}/drop`,
    });
  },
  createClaimCondition: (params: CreateClaimConditionParams) => {
    const { contractId, ...restParams } = params;
    return request<CreateClaimConditionResponse>({
      method: 'POST',
      path: `/v3/studio/contracts/${contractId}/drop`,
      body: restParams,
    });
  },
  updateClaimCondition: (params: UpdateClaimConditionParams) => {
    const { contractId, dropId, ...restParams } = params;
    return request<UpdateClaimConditionResponse>({
      method: 'PUT',
      path: `/v3/studio/contracts/${contractId}/drop/${dropId}`,
      body: restParams,
    });
  },
  deleteClaimCondition: (params: DeleteClaimConditionParams) => {
    const { contractId, dropId } = params;
    return request<DeleteClaimConditionResponse>({
      method: 'DELETE',
      path: `/v3/studio/contracts/${contractId}/drop/${dropId}`,
    });
  },
  uploadBlindBoxImage: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/studio/upload/contracts/blind-box-image',
      body: fileToFormData(file),
    });
  },
  updateBlindBox: (params: UpdateBlindBoxParams) => {
    const { contractId, ...restParams } = params;
    return request<UpdateBlindBoxResponse>({
      method: 'POST',
      path: `/v3/studio/contracts/${contractId}/blind-box`,
      body: restParams,
    });
  },
  updateContract: (params: UpdateContractParams) => {
    const { contractId, ...restParams } = params;
    return request<UpdateContractResponse>({
      method: 'PUT',
      path: `/v3/studio/contracts/${contractId}`,
      body: restParams,
    });
  },
  syncDeployedContract: (params: SyncDeployedContractParams) => {
    const { contractId, ...restParams } = params;
    return request<SyncDeployedContractResponse>({
      method: 'PUT',
      path: `/v3/studio/contracts/${contractId}/deploy`,
      query: restParams,
    });
  },
  syncIPFS: (params: SyncIPFSParams) => {
    return request<SyncIPFSResponse>({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${params?.contractId}/sync-ipfs`,
    });
  },
  syncTokenURI: (params: SyncTokenURIParams) => {
    const { contractId, ...restParams } = params;
    return request<SyncTokenURIResponse>({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${contractId}/sync-tokenUri`,
      query: restParams,
    });
  },
  syncBlindBox: (params: SyncBlindBoxParams) => {
    return request<SyncBlindBoxResponse>({
      method: 'POST',
      path: `/v3/studio/upload/contracts/${params?.contractId}/blind-box/sync-ipfs`,
    });
  },
  deleteContract: (params: DeleteContractParams) => {
    return request<DeleteContractResponse>({
      method: 'DELETE',
      path: `/v3/studio/contracts/${params?.contractId}`,
    });
  },
  getPostPublishOverview: (params: GetPostPublishOverviewParams) => {
    const { contractId } = params;
    return request<GetPostPublishOverviewResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/${contractId}/post-publish`,
    });
  },
  getSalesOverview: (params: GetSalesOverviewParams) => {
    const { contractId } = params;
    return request<GetSalesOverviewResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/${contractId}/sales-overview`,
    });
  },
  uploadDropInfoImage: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/studio/upload/contracts/upload-drop-image',
      body: fileToFormData(file),
    });
  },
  updateDropVisibility: (params: UpdateDropVisibilityParams) => {
    const { contractId, ...restParams } = params;
    return request<UpdateDropVisibilityResponse>({
      method: 'PUT',
      path: `/v3/studio/contracts/${contractId}/drop/visibility`,
      query: restParams,
    });
  },
  getWhitelistProof: (params: GetWhitelistProofParams) => {
    const { contractId, ...restParams } = params;
    return request<GetWhitelistProofResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/${contractId}/whitelist-check`,
      query: restParams,
    });
  },
  syncContractStatus: (params: SyncContractStatusParams) => {
    const { contractId } = params;
    return request<SyncContractStatusResponse>({
      method: 'PUT',
      path: `/v3/studio/contracts/${contractId}/sync-status`,
    });
  },
  getLaunchpad: (params: GetLaunchpadParams) => {
    const { type, ...restParams } = params;
    return request<GetLaunchpadResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/launchpad/${type}`,
      query: restParams,
    });
  },
});
