#!/bin/bash

# Update web env to point to Firebase emulator
ENV_FILE="apps/web/.env.local"
EMULATOR_URL="http://localhost:5001/marketing-stalker-tool/asia-southeast1/api"

sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$EMULATOR_URL|" "$ENV_FILE"
sed -i "s|NEXTAUTH_API_URL=.*|NEXTAUTH_API_URL=$EMULATOR_URL|" "$ENV_FILE"

echo "✓ Updated .env.local to use Firebase emulator"

# Start Firebase emulator in background
echo "→ Starting Firebase Functions emulator..."
firebase emulators:start --only functions &
EMULATOR_PID=$!

# Wait for emulator to be ready
echo "→ Waiting for emulator to start..."
until curl -s "http://localhost:5001" > /dev/null 2>&1; do
  sleep 2
done

echo "✓ Emulator is ready at $EMULATOR_URL"

# Start Next.js
echo "→ Starting Next.js frontend..."
cd apps/web && bun dev &
WEB_PID=$!

echo ""
echo "=========================================="
echo "  App running at: http://localhost:3000"
echo "  API running at: $EMULATOR_URL"
echo "  Press Ctrl+C to stop everything"
echo "=========================================="

# Wait and cleanup on exit
trap "kill $EMULATOR_PID $WEB_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
