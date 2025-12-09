'use client';

import biruLogo from '@/assets/logo.svg';
import lootexLogo from '@/assets/lootex-logo.svg';
import soneiumLogo from '@/assets/soneium-logo.svg';
import biruVisual from '@/assets/visual.png';
import { Button } from '@/components/ui/button';
import { HeroBannerCarousel } from '@/features/launchpad/hero-banner-carousel';
import { adaptHeroBanner } from '@/features/launchpad/launchpad-list';

import type { HomepageType } from '@/lib/cms';
import {
  ArrowRightIcon,
  Gamepad2Icon,
  StarIcon,
  WaypointsIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Collections from '../collections';
import { Footer } from './footer';
import Partners from './partners';

export default function Homepage({
  homepage,
}: {
  homepage: HomepageType;
}) {
  return (
    <>
      <main className="flex min-h-screen flex-col gap-[60px] md:gap-[120px]">
        <section className="flex flex-col gap-4 md:gap-6 items-stretch max-w-screen-xl mx-auto px-4 md:px-6 mt-2 md:mt-4 w-full">
          <HeroBannerCarousel
            items={homepage?.heroBanners.map(adaptHeroBanner) || []}
          />
          <div className="flex flex-col gap-2 items-stretch">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-brand">
                Top Collections
              </h2>
              <Link
                href="/collections"
                className="text-sm text-muted-foreground"
              >
                <Button variant="secondary" className="font-brand">
                  View All <ArrowRightIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <Collections hasLimit={true} />
          </div>
        </section>
        {/* Hero Section */}

        <section className="w-full">
          <Partners />
        </section>

        {/* Features Section */}
        <section className="w-full max-w-[1440px] mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-5xl text-center mb-10 font-brand">
            {homepage?.featuresTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            {/* Reward System */}
            <div className="bg-[#FBD8FF] rounded-3xl p-8 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-brand">
                  {homepage?.featuresBlocks[0]?.title}
                </h3>
                <StarIcon
                  strokeWidth="3px"
                  width="32px"
                  height="32px"
                  className="text-foreground"
                />
              </div>
              <p className="text-xl text-muted-foreground">
                {homepage?.featuresBlocks[0]?.description}
              </p>
            </div>

            {/* Community Mini-Games */}
            <div className="bg-[#FFE9A8] rounded-3xl p-8 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-brand">
                  {homepage?.featuresBlocks[1]?.title}
                </h3>
                <Gamepad2Icon
                  strokeWidth="3px"
                  width="32px"
                  height="32px"
                  className="text-foreground"
                />
              </div>
              <p className="text-xl text-muted-foreground">
                {homepage?.featuresBlocks[1]?.description}
              </p>
            </div>

            {/* Game Info Hub */}
            <div className="bg-[#A7CFF3] rounded-3xl p-8 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-brand">
                  {homepage?.featuresBlocks[2]?.title}
                </h3>
                <WaypointsIcon
                  strokeWidth="3px"
                  width="32px"
                  height="32px"
                  className="text-foreground"
                />
              </div>
              <p className="text-xl text-muted-foreground">
                {homepage?.featuresBlocks[2]?.description}
              </p>
            </div>
          </div>
        </section>
        <section className="pt-6 flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-10">
          <div className="flex-1 w-full">
            <Image
              src={biruVisual}
              alt="Biru Mascot"
              className="w-[85%] md:w-[90%] h-auto"
            />
          </div>

          <div className="flex-1 space-y-6 text-left px-4 md:px-8 ">
            <h1 className="text-4xl md:text-5xl font-brand max-w-[600px]">
              {homepage?.title}
            </h1>

            <p className="text-2xl text-muted-foreground max-w-[600px]">
              {homepage?.description}
            </p>

            <div className="flex flex-wrap justify-start gap-4 items-center">
              <Image src={soneiumLogo} alt="Soneium" width={120} height={40} />
              <Image src={lootexLogo} alt="Lootex" width={120} height={40} />
              <Image src={biruLogo} alt="Biru" width={120} height={40} />
            </div>
          </div>
        </section>
      </main>
      <Footer homepage={homepage} />
    </>
  );
}
