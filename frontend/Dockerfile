# Stage 1 — Build React app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2 — Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Use dynamic PORT from environment, defaulting to 80
CMD ["sh", "-c", "sed -i \"s/listen 80;/listen ${PORT:-80};/g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]