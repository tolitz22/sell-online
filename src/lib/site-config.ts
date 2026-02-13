export const siteConfig = {
  ownerName: process.env.NEXT_PUBLIC_OWNER_NAME ?? "Angelito",
  heroBadge: process.env.NEXT_PUBLIC_HERO_BADGE ?? "Online Store",
  heroHeadline: process.env.NEXT_PUBLIC_HERO_HEADLINE ?? "Clothes, gadgets, digital services, and more",
  shortBio:
    process.env.NEXT_PUBLIC_SITE_BIO ??
    "Shop trusted items for everyday needs. From wearables to digital help, everything here is selected to deliver value fast.",
  availableForWork: process.env.NEXT_PUBLIC_AVAILABLE_FOR_WORK === "true",
  currentlyWorkingOn:
    process.env.NEXT_PUBLIC_CURRENTLY_WORKING_ON ??
    "Expanding this store with smoother product management and checkout.",
};
