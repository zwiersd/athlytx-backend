#!/bin/bash

# Production start script for Railway
# Runs migrations then starts the server

set -e  # Exit on error

echo "[>] Starting Athlytx production server..."

# Run database migrations
echo ""
echo "[*] Running database migrations..."
node migrations/run.js

# Check if migrations succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "[✓] Migrations completed successfully"
    echo ""
    echo "[>] Starting web server..."
    node server.js
else
    echo ""
    echo "[✗] Migrations failed - aborting startup"
    exit 1
fi
