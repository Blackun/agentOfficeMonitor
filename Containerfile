# Agent Office Monitor - Podman / Docker Containerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build production frontend assets
COPY . .
RUN npm run build

# Create default mount directories for Antigravity and Claude Code logs
RUN mkdir -p /root/.gemini/antigravity/brain /root/.claude/projects

EXPOSE 5173

# Listen on 0.0.0.0 inside container so host port forwarding (127.0.0.1:5173 -> 5173) works
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
