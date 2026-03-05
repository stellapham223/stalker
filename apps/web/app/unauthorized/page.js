import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-5xl">🚫</div>
      <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
      <p className="text-muted-foreground text-center max-w-sm">
        Bạn không có quyền xem trang này. Liên hệ admin để được cấp quyền.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
