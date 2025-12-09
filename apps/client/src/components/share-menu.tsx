import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CopyIcon, Share2 } from 'lucide-react';
import { CopyButton } from './copy-button';

type ShareMenuProps = {
  url: string;
  title?: string;
} & React.ComponentProps<typeof Button>;

export const ShareMenu = ({
  url,
  title = '',
  className,
  ...props
}: ShareMenuProps) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    telegram: `https://telegram.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(className)}
          {...props}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem className="px-0 py-0">
          <CopyButton
            value={url}
            variant="ghost"
            size="sm"
            className="w-full px-2 py-1.5 justify-between text-sm h-auto font-normal cursor-pointer [&>span]:flex-1 [&>span>span]:justify-between [&>span>span]:w-full"
          >
            <span className="flex-1 text-left">Copy Link</span>
          </CopyButton>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={shareLinks.x}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer flex items-center gap-1 justify-between"
          >
            <span>Share on X</span>
            <svg
              width="16"
              height="17"
              viewBox="0 0 16 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_14837_2622)">
                <path
                  d="M4.45918 4.62903L10.2372 12.353H11.5457L5.76759 4.62903H4.45918Z"
                  fill="#191319"
                />
                <path
                  d="M7.991 0.587891C3.62619 0.587891 0.0878754 4.12621 0.0878754 8.49102C0.0878754 12.8558 3.62619 16.3941 7.991 16.3941C12.3558 16.3941 15.8941 12.8558 15.8941 8.49102C15.8941 4.12621 12.3558 0.587891 7.991 0.587891ZM9.9285 12.9702L7.29798 9.45291L4.04225 12.9702H3.20539L6.92408 8.95291L3.22875 4.01188H6.07686L8.49943 7.2511L11.4977 4.01188H12.3346L8.87334 7.75128L12.7766 12.9702H9.9285Z"
                  fill="#191319"
                />
              </g>
              <defs>
                <clipPath id="clip0_14837_2622">
                  <rect
                    width="16"
                    height="16"
                    fill="white"
                    transform="translate(-3.05176e-05 0.5)"
                  />
                </clipPath>
              </defs>
            </svg>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={shareLinks.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer flex items-center gap-1 justify-between"
          >
            <span>Share on Telegram</span>
            <svg
              width="16"
              height="17"
              viewBox="0 0 16 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 0.5C3.582 0.5 0 4.082 0 8.5C0 12.918 3.582 16.5 8 16.5C12.418 16.5 16 12.918 16 8.5C16 4.082 12.418 0.5 8 0.5Z"
                fill="url(#telegram-bg)"
              />
              <path
                d="M3.621 8.416C5.954 7.4 7.509 6.73 8.286 6.406C10.509 5.482 10.97 5.321 11.271 5.316C11.338 5.315 11.485 5.331 11.581 5.409C11.661 5.475 11.684 5.563 11.695 5.626C11.705 5.688 11.719 5.83 11.708 5.941C11.588 7.206 11.066 10.275 10.801 11.692C10.69 12.292 10.469 12.493 10.255 12.512C9.79 12.555 9.437 12.205 8.987 11.91C8.284 11.449 7.886 11.162 7.202 10.711C6.412 10.191 6.925 9.905 7.375 9.437C7.492 9.315 9.54 7.453 9.579 7.284C9.584 7.263 9.589 7.184 9.541 7.143C9.495 7.101 9.426 7.115 9.376 7.127C9.305 7.143 8.181 7.886 6.001 9.357C5.682 9.576 5.394 9.683 5.134 9.677C4.849 9.671 4.299 9.516 3.89 9.383C3.39 9.22 2.991 9.134 3.026 8.858C3.044 8.714 3.242 8.566 3.621 8.416Z"
                fill="white"
              />
              <defs>
                <linearGradient
                  id="telegram-bg"
                  x1="8"
                  y1="0.5"
                  x2="8"
                  y2="16.5"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#2AABEE" />
                  <stop offset="1" stopColor="#229ED9" />
                </linearGradient>
              </defs>
            </svg>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer flex items-center gap-1 justify-between"
          >
            <span>Share on Facebook</span>
            <svg
              width="16"
              height="17"
              viewBox="0 0 16 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_14710_6406)">
                <path
                  d="M16 8.5C16 4.05556 12.4444 0.5 8 0.5C3.55556 0.5 0 4.05556 0 8.5C0 12.5 2.93333 15.7889 6.75556 16.4111V10.8111H4.71111V8.5H6.75556V6.72222C6.75556 4.67778 7.91111 3.61111 9.77778 3.61111C10.6667 3.61111 11.5556 3.78889 11.5556 3.78889V5.74444H10.5778C9.6 5.74444 9.24444 6.36667 9.24444 6.98889V8.5H11.4667L11.1111 10.8111H9.24444V16.4111C13.0667 15.7889 16 12.5 16 8.5Z"
                  fill="#1877F2"
                />
                <path
                  d="M11.1111 10.8111L11.4666 8.49997H9.24442V6.98886C9.24442 6.36664 9.51109 5.74442 10.5778 5.74442H11.5555V3.78886C11.5555 3.78886 10.6666 3.61108 9.77776 3.61108C7.91109 3.61108 6.75553 4.76664 6.75553 6.7222V8.49997H4.71109V10.8111H6.75553V16.4111C7.19998 16.5 7.55553 16.5 7.99998 16.5C8.44442 16.5 8.79998 16.5 9.24442 16.4111V10.8111H11.1111Z"
                  fill="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_14710_6406">
                  <rect
                    width="16"
                    height="16"
                    fill="white"
                    transform="translate(0 0.5)"
                  />
                </clipPath>
              </defs>
            </svg>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
