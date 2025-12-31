import { Image } from '@/components/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { Countdown } from './mint-schedule';

type HeroBannerItem = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageUrlMobile?: string;
  actions?: {
    id: string;
    text: string;
    url: string;
  }[];
  targetDate?: string;
  countdownType?: string;
  live?: boolean;
};

export const HeroBannerCarousel = ({ items }: { items: HeroBannerItem[] }) => {
  return (
    <div className="w-full group">
      <Carousel
        className="w-full"
        plugins={[Autoplay({ delay: 7000 })]}
        opts={{ loop: true }}
      >
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem key={item.id} className="basis-full">
              <div className="relative flex flex-col justify-end w-full aspect-[1] md:aspect-[4] bg-gray-200 rounded-lg overflow-hidden p-3 group">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className={cn(
                      'z-0 w-full h-full absolute top-0 left-0 hoverable-bg-image',
                      item.imageUrlMobile ? 'hidden md:block' : 'block',
                    )}
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                )}
                {item.imageUrlMobile && (
                  <Image
                    src={item.imageUrlMobile}
                    alt={item.title}
                    fill
                    className="z-0 w-full h-full absolute top-0 left-0 md:hidden hoverable-bg-image"
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                )}
                <div className="relative flex flex-col gap-1 pointer-events-none justify-center">
                  <div
                    className="flex flex-col md:flex-row justify-center items-center gap-3 bg-white/80 self-center p-2 rounded-[24px] w-auto"
                    style={{
                      background: 'hsla(0, 0%, 96%, 0.4)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {item.targetDate && (
                      <div className="flex flex-col gap-1">
                        <Countdown
                          startTime={item.targetDate}
                          renderWithBlocks
                          countdownType={item.countdownType}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {item.actions?.map((action, index) => (
                        <Link
                          key={action.id}
                          href={action.url}
                          target={
                            action.url?.startsWith('http') ? '_blank' : '_self'
                          }
                        >
                          <Button
                            key={action.id}
                            className="font-brand pointer-events-auto"
                            size="lg"
                            variant={index === 0 ? 'default' : 'secondary'}
                            asChild
                          >
                            {action.text}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:inline-flex opacity-0 disabled:opacity-0 group-hover:opacity-100 group-hover:disabled:opacity-0 transition-opacity duration-300" />
        <CarouselNext className="hidden md:inline-flex opacity-0 disabled:opacity-0 group-hover:opacity-100 group-hover:disabled:opacity-0 transition-opacity duration-300" />
      </Carousel>
    </div>
  );
};
