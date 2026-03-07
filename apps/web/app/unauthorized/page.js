import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <ShieldX className="h-12 w-12 text-muted-foreground/50" />
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground text-center max-w-sm">
        You don&apos;t have permission to view this page. Contact an admin to get access.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
