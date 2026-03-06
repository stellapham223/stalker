# Local Development Setup

## 1. Clone repo

```bash
git clone https://github.com/stellapham223/stalker.git
cd stalker
```

## 2. Tạo file `apps/web/.env.local`

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<copy từ file .env.local trên máy cũ>
GOOGLE_CLIENT_ID=<copy từ file .env.local trên máy cũ>
GOOGLE_CLIENT_SECRET=<copy từ file .env.local trên máy cũ>
NEXTAUTH_API_URL=http://localhost:5001/marketing-stalker-tool/asia-southeast1/api
NEXT_PUBLIC_API_URL=http://localhost:5001/marketing-stalker-tool/asia-southeast1/api
```

## 3. Cài dependencies

```bash
# Web
cd apps/web && npm install

# Functions
cd apps/functions && npm install
```

## 4. Login Firebase

```bash
firebase login
firebase use marketing-stalker-tool
```

## 5. Chạy local

```bash
# Terminal 1 — Firebase emulator
cd apps/functions && npm run serve

# Terminal 2 — Next.js (sau khi emulator ready)
cd apps/web && npm run dev
```

Hoặc dùng script có sẵn:
```bash
bash scripts/dev-local.sh
```

## 6. Truy cập

- Frontend: http://localhost:3000
- Firebase emulator UI: http://localhost:4000

## Lưu ý Google OAuth

Cần thêm `http://localhost:3000/api/auth/callback/google` vào **Authorized redirect URIs** trong Google Console nếu máy mới chưa có.
