FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/next.config.js ./apps/web/
COPY apps/web/tailwind.config.js ./apps/web/
COPY packages/shared/src ./packages/shared/src
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=@gsd-atlas/web
RUN npm run build --workspace=@gsd-atlas/shared

# Prune production dependencies
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@gsd-atlas/web"]
