'use client';

import * as partnerIcons from '@/assets/partners';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';

// We'll define a type for our partners
type Partner = {
  name: string;
  url: string;
};

// This will be replaced with actual partner data
const partners = [
  {
    name: 'Sonex',
    url: 'https://sonex.so/',
  },
  {
    name: 'AvocadoGuild',
    url: 'https://avocadodao.io/',
  },
  {
    name: 'Chenubic',
    url: 'https://cherubic.com/',
  },
  {
    name: 'Daedalus',
    url: 'https://www.daedalus.gg/',
  },
  {
    name: 'Emoote',
    url: 'https://emoote.com/',
  },
  {
    name: 'EverNewCapital',
    url: 'https://www.evernewcap.com/',
  },
  {
    name: 'FiveHundredStartups',
    url: 'https://500.co/',
  },
  // {
  //   name: 'HTC',
  //   url: 'https://www.htc.com/tw/',
  // },
  {
    name: 'HuobiVentures',
    url: 'https://twitter.com/HuobiVentures',
  },
  {
    name: 'InfinityVenturesCrypto',
    url: 'https://www.ivcrypto.io/',
  },
  {
    name: 'KosmosVentures',
    url: 'https://www.kosmos.vc/',
  },
  {
    name: 'LD',
    url: 'https://ldcap.com/',
  },
  // {
  //   name: 'MorningstarVentures',
  //   url: 'https://morningstar.ventures/',
  // },
  {
    name: 'NGCVentures',
    url: 'https://ngc.fund/',
  },
  {
    name: 'OKX',
    url: 'https://www.okx.com/',
  },
  {
    name: 'PalmDriveCapital',
    url: 'https://palmdrive.vc/',
  },
  {
    name: 'Panony',
    url: 'https://www.panony.com/',
  },
  {
    name: 'PetRockCapital',
    url: 'https://www.petrock.capital/',
  },
  {
    name: 'PolygonStudios',
    url: 'https://polygonstudios.com/',
  },
  {
    name: 'SkyvisionCapital',
    url: 'https://www.skyvisioncapital.com/',
  },
  {
    name: 'Spartan',
    url: 'https://www.spartangroup.io/',
  },
  {
    name: 'SweeperDAO',
    url: 'https://sweeper.club/',
  },
  {
    name: 'W3GG',
    url: 'https://w3gg.io/',
  },
  {
    name: 'YoloInvestments',
    url: 'hhttps://yolo.io/',
  },
];

export const Partners = () => {
  const [isPaused, setIsPaused] = useState(false);

  const containerClasses = cn(
    'min-w-full flex-shrink-0 flex items-center justify-around',
    'animate-scroll',
    isPaused
      ? '[animation-play-state:paused]'
      : '[animation-play-state:running]',
  );

  return (
    <div className="flex flex-col items-center gap-8 md:gap-10">
      <div className="px-4 md:px-8">
        <h2 className="text-center text-3xl md:text-5xl font-bold tracking-tight font-brand">
          Our Partners and Backers
        </h2>
      </div>

      {/* Add the carousel container */}
      <div className="w-full overflow-hidden relative">
        <div
          className="flex relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* First set of partners */}
          <div className={containerClasses}>
            {partners.map((partner, index) => (
              <a
                key={`${partner.name}-${index}`}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[120px] h-[60px] flex items-center justify-center grayscale hover:grayscale-0 transition-all mx-6"
              >
                <Image
                  src={partnerIcons[partner.name as keyof typeof partnerIcons]} // Replace with partner.logo when available
                  alt={partner.name}
                  className="max-w-full max-h-full object-contain"
                  width={120}
                  height={60}
                />
              </a>
            ))}
          </div>

          {/* Duplicate set for seamless loop */}
          <div className={cn(containerClasses)}>
            {partners.map((partner, index) => (
              <a
                key={`${partner.name}-${index}-duplicate`}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[120px] h-[60px] flex items-center justify-center grayscale hover:grayscale-0 transition-all mx-6"
              >
                <Image
                  src={partnerIcons[partner.name as keyof typeof partnerIcons]} // Replace with partner.logo when available
                  alt={partner.name}
                  className="max-w-full max-h-full object-contain"
                  width={120}
                  height={60}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Partners;
