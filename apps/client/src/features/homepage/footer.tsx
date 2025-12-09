'use client';

import Image from 'next/image';

import biruLogo from '@/assets/logo.svg';
import { Link } from '@/components/link';
import type { HomepageType } from '@/lib/cms';
import SocialLinks from './social-links';

const menu = [
  {
    category: 'Products',
    links: [
      {
        title: 'Collections',
        href: '/collections',
      },
      {
        title: 'Launchpad',
        href: '/launchpad',
      },
    ],
  },
  {
    category: 'Contact Us',
    links: [
      {
        title: 'Partnership',
        href: 'https://discord.com/channels/1318880719711244328/1333340002565881897',
      },
      {
        title: 'Support',
        href: 'https://discord.com/channels/1318880719711244328/1333340002565881897',
      },
    ],
  },
  {
    category: 'Resources',
    links: [
      {
        title: 'Blog',
        href: 'https://blog.biru.gg',
      },
      {
        title: 'Privacy Policy',
        href: '/privacy',
      },
      {
        title: 'Terms of Use',
        href: '/terms',
      },
    ],
  },
];

export const Footer = ({
  homepage,
}: {
  homepage: HomepageType;
}) => {
  const renderTagline = () => (
    <div className="flex flex-col gap-4 md:max-w-[480px]">
      <Image src={biruLogo} alt="Biru" width={120} height={40} />
      <p className="text-[#4D4D4D]">
        Biru – The Most Playful & Interactive NFT Marketplace on Soneium | Mint,
        Trade & Have Fun!
      </p>
    </div>
  );
  const renderMenu = () =>
    menu.map(({ category, links }) => (
      <div key={category} className="flex flex-col gap-4 flex-1 md:flex-none">
        <p className="font-bold text-[#2C2C2C] whitespace-nowrap">{category}</p>
        {links.map(({ title, href }) => (
          <Link
            key={title}
            href={href}
            className="text-sm text-[#4D4D4D] whitespace-nowrap"
          >
            {title}
          </Link>
        ))}
      </div>
    ));
  return (
    <footer className="mt-auto px-4 md:px-8">
      <div className="flex flex-col gap-4 py-8 border-t border-b md:hidden">
        {renderTagline()}
        <div className="flex flex-wrap gap-4">{renderMenu()}</div>
      </div>
      <div className="hidden md:flex justify-between gap-4 py-10 border-t border-b">
        {renderTagline()}
        {renderMenu()}
      </div>
      <div className="flex justify-between pt-8 pb-4 md:pt-10">
        <p className="text-sm text-muted-foreground">
          {homepage?.footerCopyright}
        </p>
        <SocialLinks />
      </div>
    </footer>
  );
};
