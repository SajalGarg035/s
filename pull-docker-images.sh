#!/bin/bash

echo "🐳 Pulling required Docker images..."

# Pull Node.js Alpine image
echo "📦 Pulling node:18-alpine..."
docker pull node:18-alpine

# Pull a lightweight Linux image as backup
echo "📦 Pulling alpine:latest as backup..."
docker pull alpine:latest

# List available images
echo "✅ Available Docker images:"
docker images

echo "🎉 Docker images pulled successfully!"
