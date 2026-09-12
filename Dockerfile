FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY apps ./apps
COPY packages ./packages
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "apps/api/src/server.mjs"]
