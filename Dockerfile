# Full-stack image: builds the frontend and serves it from the backend.
# Hosts like Render/Railway/Fly can deploy this straight from the GitHub repo.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8787
# Persist OAuth tokens across restarts by mounting a volume at /data
ENV DATA_DIR=/data

EXPOSE 8787
CMD ["node", "server/index.js"]
