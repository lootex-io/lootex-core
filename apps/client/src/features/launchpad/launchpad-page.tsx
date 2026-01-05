'use client';

import { Button } from '@/components/ui/button';
import type { GetCollectionDropInfoResponse } from '@/sdk/exports/api/endpoints/collection';
import type {
  ExternalLink,
  LootexCollection,
} from '@/sdk/exports/collection';
import { ExternalLinkIcon, GlobeIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Image } from '@/components/image';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Link from 'next/link';

import { CollectionCell } from '@/components/data-cells';
import { ShareMenu } from '@/components/share-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrigin } from '@/utils/use-origin';
import { MintBox } from './mint-box';
import { MintSchedule } from './mint-schedule';
import Activity from './tabs/activity';

const ExternalLinks = ({
  externalLinks,
}: {
  externalLinks: ExternalLink[];
}) => {
  return externalLinks
    .filter((link) => link.url?.length)
    .map((link) => {
      return (
        <Link href={link.url} target="_blank" key={link.name}>
          <Button key={link.url} variant="secondary" size="icon" asChild>
            {link.iconName === 'Globe' && <GlobeIcon className="w-4 h-4" />}
            {link.iconName === 'Twitter' && (
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width={20}
                height={20}
              >
                <title>X</title>
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
            )}
          </Button>
        </Link>
      );
    });
};

export const LaunchpadPage = ({
  drop,
  collection,
}: {
  drop?: GetCollectionDropInfoResponse;
  collection?: LootexCollection & {
    isRevealable: boolean;
    canRevealAt: string;
    revealUrl: string;
    isStakeable: boolean;
    stakeUrl: string;
  };
}) => {
  const [activeTab, setActiveTab] = useState('activity');
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const validDropUrls = drop?.contract?.dropUrls?.filter((url) => url);
  const origin = useOrigin();

  const scrollToIndex = (index: number) => {
    carouselApi?.scrollTo(index);
  };

  useEffect(() => {
    if (!carouselApi) return;

    const updateCarousel = () => {
      setCurrentIndex(carouselApi.selectedScrollSnap());
    };

    updateCarousel();

    carouselApi.on('select', updateCarousel);

    return () => {
      carouselApi.off('select', updateCarousel);
    };
  }, [carouselApi]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 md:gap-6 ">
        {validDropUrls && validDropUrls?.length > 0 && (
          <div className="flex flex-col flex-1 gap-4 overflow-hidden md:max-w-[520px]">
            <Carousel className="group" setApi={setCarouselApi}>
              <CarouselContent>
                {validDropUrls?.map((url) => (
                  <CarouselItem key={url} className="basis-full">
                    <Image
                      src={url}
                      alt={drop?.contract?.name ?? 'drop image'}
                      fill
                      className="aspect-square rounded-lg overflow-hidden min-h-0"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 hidden md:inline-flex opacity-0 disabled:opacity-0 group-hover:opacity-100 group-hover:disabled:opacity-0 transition-opacity duration-300" />
              <CarouselNext className="right-4 hidden md:inline-flex opacity-0 disabled:opacity-0 group-hover:opacity-100 group-hover:disabled:opacity-0 transition-opacity duration-300" />
            </Carousel>
            {/* Thumbnails */}
            {validDropUrls?.length > 1 && (
              <div className="flex gap-2">
                {validDropUrls?.map((url, index) => (
                  <div
                    key={url}
                    onClick={() => scrollToIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        scrollToIndex(index);
                      }
                    }}
                    className="aspect-square rounded-sm overflow-hidden w-[100px] cursor-pointer"
                  >
                    <Image
                      src={url}
                      alt={drop?.contract?.name ?? 'drop image'}
                      fill
                      className={`aspect-square rounded-sm w-full h-full ${
                        currentIndex === index ? 'opacity-100' : 'opacity-60'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col flex-1 gap-3 md:gap-4">
          <div className="flex flex-col gap-3 p-4 md:p-6 rounded-lg bg-white">
            <div className="flex flex-col gap-0 items-start">
              <CollectionCell
                collection={collection}
                showLogo={false}
                titleComponent="h1"
                titleClassName="text-muted-foreground font-normal"
              />
              <h2 className="text-foreground font-brand text-3xl font-bold">
                {drop?.contract.dropName || collection?.name}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {drop?.contract.dropDescription ||
                collection?.description ||
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'}
            </p>
            <div className="flex items-center gap-2">
              <ExternalLinks externalLinks={collection?.externalLinks ?? []} />
              <ShareMenu
                url={`${origin}/launchpad/${collection?.slug}`}
                title={collection?.name}
                variant="secondary"
              />
              <Link href={`/collections/${collection?.slug}`} target="_blank">
                <Button className="font-brand" variant="outline" asChild>
                  <span>
                    View Collection
                    <ExternalLinkIcon className="ml-2 w-4 h-4" />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
          <MintBox drop={drop} collection={collection} />
          <MintSchedule drop={drop} collection={collection} />
        </div>
      </div>
      {collection && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#E8E8E8]">
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <Activity collection={collection} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
