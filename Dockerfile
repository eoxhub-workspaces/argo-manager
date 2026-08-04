# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS build-frontend
WORKDIR /app/ui
COPY services/ui/package*.json ./
RUN npm install --legacy-peer-deps
COPY services/ui/ ./
RUN npm run build

# --- Stage 2: Setup Backend ---
FROM node:20-alpine AS production

# Create a secure, explicit non-root system user and group
RUN addgroup -g 10001 -S gitargo && adduser -u 10001 -S gitargo -G gitargo

WORKDIR /app

# Ensure that the app directory is owned by gitargo
RUN chown -R gitargo:gitargo /app

# Copy API package requirements first
COPY --chown=gitargo:gitargo services/api/package*.json ./

# Install all dependencies (including devDependencies like nodemon)
# so that hot-reloading works in dev environments via push.sh
RUN npm install --legacy-peer-deps

# Copy the API source files with correct non-root ownership
COPY --chown=gitargo:gitargo services/api/ ./

# Copy built frontend assets from Stage 1 to the backend public folder
COPY --chown=gitargo:gitargo --from=build-frontend /app/ui/build ./public

EXPOSE 3000

# Switch context to the non-root gitargo user
USER gitargo

CMD ["node", "server.js"]
