# Build stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm ci
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy only production dependencies and built files from builder
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Create logs directory with correct permissions
RUN mkdir -p logs && chown node:node logs

# Switch to standard non-root node user
USER node

# We recommend running with a PORT environment variable since it's a container
# but it theoretically works over stdio if orchestrated properly by Docker
CMD ["node", "dist/index.js"]
