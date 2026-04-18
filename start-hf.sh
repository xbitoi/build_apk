#!/bin/bash
set -e

echo "Starting API Server on port 8080..."
cd /app/artifacts/api-server
PORT=8080 NODE_ENV=production node --enable-source-maps ./dist/index.mjs &
API_PID=$!

echo "Waiting for API Server to initialize..."
sleep 3

echo "Starting nginx on port 7860..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo ""
echo "================================================"
echo "  APK Builder Pro is running!"
echo "  Access it at the Space URL on port 7860"
echo "================================================"
echo ""

wait $API_PID $NGINX_PID
