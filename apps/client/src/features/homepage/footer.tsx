'use client';

import Image from 'next/image';
import { Link } from '@/components/link';
import SocialLinks from './social-links';
import { config } from '@/lib/config';

export const Footer = () => {
  const renderTagline = () => (
    <div className="flex flex-col gap-4 md:max-w-[480px]">
      <Image src={config.appLogo} alt={config.appName} width={120} height={40} />
      <p className="text-[#4D4D4D]">
        {config.appDescription}
      </p>
    </div>
  );
  const renderMenu = () =>
    config.footer.columns.map(({ label, links }) => (
      <div key={label} className="flex flex-col gap-4 flex-1 md:flex-none">
        <p className="font-bold text-[#2C2C2C] whitespace-nowrap">{label}</p>
        {links.map(({ label, url }) => (
          <Link
            key={label}
            href={url}
            className="text-sm text-[#4D4D4D] whitespace-nowrap"
          >
            {label}
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
          {config.footer.copyright}
        </p>
        <SocialLinks />
      </div>
    </footer>
  );
};
