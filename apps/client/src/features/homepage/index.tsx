'use client';

import { Button } from '@/components/ui/button';
import { HeroBannerCarousel } from '@/features/launchpad/hero-banner-carousel';
import { adaptHeroBanner } from '@/features/launchpad/launchpad-list';
import type { HomepageType } from '@/lib/cms';
import {
  ArrowRightIcon,
} from 'lucide-react';
import Link from 'next/link';
import Collections from '../collections';
import { Footer } from './footer';

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
      </main>
      <Footer />
    </>
  );
}
