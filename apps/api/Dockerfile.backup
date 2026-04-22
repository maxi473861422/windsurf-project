FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY apps/api/src ./apps/api/src
COPY packages/database/src ./packages/database/src
COPY packages/database/prisma ./packages/database/prisma
COPY packages/shared/src ./packages/shared/src
COPY tsconfig.json ./

# Generate Prisma client before build
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the application
RUN npm run build --workspace=@gsd-atlas/api
RUN npm run build --workspace=@gsd-atlas/database
RUN npm run build --workspace=@gsd-atlas/shared

# Prune production dependencies
RUN npm prune --production

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=@gsd-atlas/api"]
