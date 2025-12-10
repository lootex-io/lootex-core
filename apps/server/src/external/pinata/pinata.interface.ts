export type PinataOptions = {
  cidVersion: number;
};

export type PinataMetadata = {
  name: string;
  keyvalues?: Record<string, string | number | Record<string, string | number>>;
};

export type Trait = {
  trait_type: string;
  display_type?: string;
  value: string | number;
};

export type PinataData = {
  pinataOptions: PinataOptions;
  pinataMetadata: PinataMetadata;
  pinataContent?: {
    name: string;
    description: string;
    image: string;
    animation_url: string;
    attributes: Trait[];
  };
};

export type PinataResponse = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
};
