'use client';

import './globals.css';
import { ConnectButton } from '@/components/connect-button';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import SocialLinks from '@/features/homepage/social-links';
import { SearchBar } from '@/features/search-bar/search-bar';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Menu, WalletIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useConnection } from 'wagmi';
import { config } from '@/lib/config';

export const Header = () => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="py-2 px-4 md:px-6 flex justify-between items-center sticky top-0 bg-background z-20 transition-shadow duration-200  shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center shrink-0 gap-2">
          <div className="h-[20px] w-[66px] md:h-[36px] md:w-[118px] relative">
            <Image src={config.appLogo} alt={config.appName} fill />
          </div>
        </Link>

        <div className="hidden lg:flex">
          {config.header.links.map((link) => (
            <Button
              key={link.url}
              variant="ghost"
              asChild
              className="font-brand"
            >
              <Link href={link.url} className="font-brand">
                {link.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <SearchBar open={isSearchOpen} setOpen={setIsSearchOpen} />
        {isMounted && (
          <>
            <ConnectButton
              buttonText={
                isMobile ? <WalletIcon className="w-4 h-4" /> : undefined
              }
            />
            {account && (
              <Link href={`/users/${account.address}`} className="leading-none">
                <Button
                  variant="outline"
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                >
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                </Button>
              </Link>
            )}
          </>
        )}

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu size={32} strokeWidth={3} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex">
            <div className="flex flex-col items-start gap-2 mt-8 flex-1 self-stretch">
              {config.header.links.map((link) => (
                <Button
                  key={link.url}
                  variant="ghost"
                  asChild
                  className="font-brand"
                  onClick={() => setIsSheetOpen(false)}
                >
                  <Link href={link.url} className="font-brand">
                    {link.label}
                  </Link>
                </Button>
              ))}
              <SocialLinks className="mt-auto self-stretch justify-end pt-2 border-t" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
