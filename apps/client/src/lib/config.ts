export const config = {
  appName: "Lootex Core",
  appDescription: "Lootex Core - The Most Playful & Interactive NFT Marketplace on Soneium | Mint, Trade & Have Fun!",
  appLogo: "/logo.svg",
  appUrl: "https://lootex.gg",
  appOgImage: "/og.png",
  privacyMarkdown: "/privacy.md",
  termsMarkdown: "/terms.md",
  socialLinks: {
    discord: "#",
    x: "#"
  },
  header: {
    links: [
      {
        label: "Collections",
        url: "/collections"
      },
      {
        label: "Swap",
        url: "/swap"
      }
    ]
  },
  footer: {
    copyright: "© 2025. All rights reserved.",
    columns: [
      {
        label: "Products",
        links: [
          {
            label: "Collections",
            url: "/collections"
          }
        ]
      },
      {
        label: "Contact Us",
        links: [
          {
            label: "Partnership",
            url: "#"
          },
          {
            label: "Support",
            url: "#"
          }
        ]
      },
      {
        label: "Resources",
        links: [
          {
            label: "Blog",
            url: "#"
          },
          {
            label: "Privacy Policy",
            url: "/privacy"
          },
          {
            label: "Terms of Service",
            url: "/terms"
          }
        ]
      }
    ]
  }
} as const