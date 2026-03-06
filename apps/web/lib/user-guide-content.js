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
    subsections: [
      {
        title: "Dashboard Overview",
        content: [
          "The Dashboard shows three key metrics: Tracked Competitors, Active Monitors, and Recent Changes.",
          "Below the metrics, you'll see a feed of the most recent changes detected across all your monitors.",
        ],
      },
      {
        title: "Navigation",
        content: [
          "Use the sidebar on the left to navigate between different monitoring features.",
          "Each feature has a badge showing the number of unread changes since your last visit.",
        ],
      },
    ],
  },
  {
    id: "app-listing",
    title: "App Listing",
    icon: AppWindow,
    content: [
      "Track changes to competitor app listings on the Shopify App Store.",
    ],
    subsections: [
      {
        title: "Adding an App to Track",
        content: [
          "Enter the Shopify App Store URL of the competitor app you want to monitor.",
          "The system will start tracking the app's title, description, pricing, screenshots, and other listing details.",
        ],
      },
      {
        title: "Viewing Changes",
        content: [
          "When a change is detected, you'll see a diff highlighting exactly what was added or removed.",
          "Green highlights indicate additions, and red highlights indicate removals.",
        ],
      },
    ],
  },
  {
    id: "keyword-rankings",
    title: "Keyword Rankings",
    icon: Search,
    content: [
      "Monitor how competitors rank for specific keywords in the Shopify App Store search.",
    ],
    subsections: [
      {
        title: "Adding Keywords",
        content: [
          "Add keywords you want to track and the system will record ranking positions over time.",
          "You can track multiple keywords simultaneously to get a comprehensive view.",
        ],
      },
      {
        title: "Analyzing Trends",
        content: [
          "Use ranking data to understand how your competitors' App Store SEO strategies evolve.",
          "Track position changes over time to spot emerging trends.",
        ],
      },
    ],
  },
  {
    id: "autocomplete",
    title: "Autocomplete",
    icon: Type,
    content: [
      "Track autocomplete suggestions in the Shopify App Store search.",
    ],
    subsections: [
      {
        title: "How It Works",
        content: [
          "The system monitors what suggestions appear when users start typing relevant keywords in the App Store search.",
          "This helps you discover new keyword opportunities and understand search trends.",
        ],
      },
      {
        title: "Using Autocomplete Data",
        content: [
          "Autocomplete suggestions reveal what real users are searching for.",
          "Use these insights to optimize your own app listing and identify untapped keyword opportunities.",
        ],
      },
    ],
  },
  {
    id: "website-menus",
    title: "Website Menus",
    icon: Menu,
    content: [
      "Monitor changes to competitor website navigation menus.",
    ],
    subsections: [
      {
        title: "What Gets Tracked",
        content: [
          "The system captures and compares website navigation menu structures.",
          "Track when competitors add, remove, or reorganize their menu items.",
        ],
      },
      {
        title: "Why Menu Changes Matter",
        content: [
          "Menu changes often signal new features, product pivots, or strategic shifts.",
          "A new menu item might indicate an upcoming product launch or a change in business direction.",
        ],
      },
    ],
  },
  {
    id: "homepage-monitor",
    title: "Homepage Monitor",
    icon: FileText,
    content: [
      "Track changes to competitor homepage content.",
    ],
    subsections: [
      {
        title: "Monitoring Homepage Content",
        content: [
          "The system captures and compares homepage snapshots to detect messaging changes.",
          "It tracks new features highlighted, pricing updates, and other content changes.",
        ],
      },
      {
        title: "Interpreting Changes",
        content: [
          "Homepage changes often reflect strategic priorities and marketing direction.",
          "Pay attention to changes in hero sections, CTAs, and feature highlights.",
        ],
      },
    ],
  },
  {
    id: "guide-docs",
    title: "Guide Docs",
    icon: BookOpen,
    content: [
      "Monitor changes to competitor documentation and help pages.",
    ],
    subsections: [
      {
        title: "Adding Docs to Track",
        content: [
          "Add URLs of competitor docs/guides to track. The system will alert you when content is updated.",
          "You can use quick-add buttons for popular competitors to get started fast.",
        ],
      },
      {
        title: "Why Track Documentation",
        content: [
          "Doc changes often reveal upcoming features or product direction before official announcements.",
          "New help articles may indicate features in beta or recently launched.",
        ],
      },
    ],
  },
];
