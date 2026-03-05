export async function requireAdmin(req, res, next) {
  // req.userEmail is set by requireAuth middleware
  if (!req.userEmail) return res.status(401).json({ error: "Not authenticated" });

  const user = await req.prisma.allowedUser.findUnique({
    where: { email: req.userEmail },
  });

  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}
