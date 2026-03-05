import { Router } from "express";

export const authRoutes = Router();

const FIRST_ADMIN = "phuongptt@avadagroup.com";

// Guard: only allow calls from Next.js server (via X-Internal-Auth header)
authRoutes.use((req, res, next) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return next(); // dev fallback if secret not configured yet
  if (req.headers["x-internal-auth"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

/**
 * POST /api/auth/check-email
 * Called by NextAuth signIn callback to verify if an email is allowed.
 * Auto-seeds first admin if email matches FIRST_ADMIN.
 */
authRoutes.post("/check-email", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ allowed: false });

    // Auto-seed first admin
    if (email === FIRST_ADMIN) {
      await req.prisma.allowedUser.upsert({
        where: { email },
        create: {
          email,
          isAdmin: true,
          appListing: true,
          keywordRankings: true,
          autocomplete: true,
          websiteMenus: true,
          homepageMonitor: true,
          guideDocs: true,
        },
        update: { isAdmin: true },
      });
      return res.json({ allowed: true });
    }

    const user = await req.prisma.allowedUser.findUnique({ where: { email } });
    res.json({ allowed: !!user });
  } catch (err) {
    res.status(500).json({ allowed: false, error: err.message });
  }
});

/**
 * POST /api/auth/session-info
 * Called by NextAuth session callback to get current permissions for the user.
 */
authRoutes.post("/session-info", async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({});

    const user = await req.prisma.allowedUser.findUnique({ where: { email } });
    if (!user) return res.status(404).json({});

    res.json({
      isAdmin: user.isAdmin,
      permissions: {
        appListing: user.appListing,
        keywordRankings: user.keywordRankings,
        autocomplete: user.autocomplete,
        websiteMenus: user.websiteMenus,
        homepageMonitor: user.homepageMonitor,
        guideDocs: user.guideDocs,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
