import { LoginButton } from "@/components/auth/login-button";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 rounded-xl border bg-card shadow-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <h1 className="text-2xl font-bold">Competitor Stalker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor &amp; track competitor changes
          </p>
        </div>

        {error === "AccessDenied" && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Email của bạn chưa được cấp quyền. Liên hệ admin để được thêm vào danh sách.
          </div>
        )}

        {error && error !== "AccessDenied" && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Đăng nhập thất bại. Vui lòng thử lại.
          </div>
        )}

        <LoginButton />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Chỉ tài khoản Google được admin cấp quyền mới đăng nhập được.
        </p>
      </div>
    </div>
  );
}
