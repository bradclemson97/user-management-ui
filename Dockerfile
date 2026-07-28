FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/views ./views
COPY --from=build /app/public ./public 2>/dev/null || true
EXPOSE 3000
CMD ["node", "dist/server.js"]
