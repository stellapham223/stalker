import { Radar } from "lucide-react";
import { LoginButton } from "@/components/auth/login-button";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 rounded-xl border bg-card card-glow animate-glow">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Radar className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
            Competitor Stalker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor competitor changes
          </p>
        </div>

        {error === "AccessDenied" && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Your email is not authorized. Contact an admin to get access.
          </div>
        )}

        {error && error !== "AccessDenied" && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Sign-in failed. Please try again.
          </div>
        )}

        <LoginButton />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Only Google accounts authorized by an admin can sign in.
        </p>
      </div>
    </div>
  );
}
