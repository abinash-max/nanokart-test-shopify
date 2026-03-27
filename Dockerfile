# Build needs devDependencies (Vite / @react-router/dev). Install all deps, build, then prune.
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build

# Drop devDependencies after a successful build to keep the image smaller.
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 3000
ENV PORT=3000

# Migrations + Prisma client, then serve the SSR bundle.
CMD ["npm", "run", "docker-start"]
