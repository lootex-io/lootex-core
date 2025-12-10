export type ChainId =
  | '1'
  | '4'
  | '5'
  | '137'
  | '80001'
  | '56'
  | '97'
  | '43114'
  | '43113'
  | '42161'
  | '421611'
  | '5000'
  | '8453'
  | '1946'
  | '1868'
  | '84532';

export class ExternalLink {
  name?: string;
  placeholder?: string;
  iconName?: string;
  url?: string;
}

export interface Media {
  name?: string;
  description?: string;
  cover?: string;
  url: string;
  contentType?: string;
  gameId?: string;
}

export enum tagCategory {
  Player = 'Player',
  GameGenre = 'Game Genre',
  Art = 'Art',
  Chain = 'Chain',
  Type = 'Type',
  Platform = 'Platform',
  Status = 'Status',
}

export interface UploadFile {
  url?: string;
}
