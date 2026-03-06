import {
  LayoutDashboard,
  AppWindow,
  Search,
  Type,
  Menu,
  FileText,
  BookOpen,
} from "lucide-react";

export const guideLastUpdated = "2026-03-06";

export const guideSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: LayoutDashboard,
    content: [
      "Welcome to Competitor Stalker! This app helps you monitor competitor changes on the Shopify App Store.",
      "After logging in with your Google account, you'll land on the Dashboard where you can see an overview of all tracked competitors and recent changes.",
    ],
  },
  {
    id: "app-listing",
    title: "App Listing",
    icon: AppWindow,
    content: [
      "Track changes to competitor app listings on the Shopify App Store.",
      "Add a competitor's Shopify app URL to start monitoring. The system will periodically check for changes in the app's title, description, pricing, screenshots, and other listing details.",
      "When a change is detected, you'll see a diff highlighting exactly what was added or removed.",
    ],
  },
  {
    id: "keyword-rankings",
    title: "Keyword Rankings",
    icon: Search,
    content: [
      "Monitor how competitors rank for specific keywords in the Shopify App Store search.",
      "Add keywords you want to track and the system will record ranking positions over time.",
      "Use this to understand how your competitors' SEO strategies evolve.",
    ],
  },
  {
    id: "autocomplete",
    title: "Autocomplete",
    icon: Type,
    content: [
      "Track autocomplete suggestions in the Shopify App Store search.",
      "See which suggestions appear when users start typing relevant keywords.",
      "This helps you discover new keyword opportunities and understand search trends.",
    ],
  },
  {
    id: "website-menus",
    title: "Website Menus",
    icon: Menu,
    content: [
      "Monitor changes to competitor website navigation menus.",
      "Track when competitors add, remove, or reorganize their menu items.",
      "Menu changes often signal new features, product pivots, or strategic shifts.",
    ],
  },
  {
    id: "homepage-monitor",
    title: "Homepage Monitor",
    icon: FileText,
    content: [
      "Track changes to competitor homepage content.",
      "The system captures and compares homepage snapshots to detect messaging changes, new features highlighted, pricing updates, and more.",
    ],
  },
  {
    id: "guide-docs",
    title: "Guide Docs",
    icon: BookOpen,
    content: [
      "Monitor changes to competitor documentation and help pages.",
      "Add URLs of competitor docs/guides to track. The system will alert you when content is updated.",
      "Doc changes often reveal upcoming features or product direction before official announcements.",
    ],
  },
];
