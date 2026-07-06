# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
# argon2 can build tu source can toolchain
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
# giu lai ts-node + typeorm cho migration/seed luc khoi dong
RUN npm install ts-node typeorm tsconfig-paths typescript @types/node --no-save
COPY --from=build /app/dist ./dist
COPY src ./src
COPY tsconfig.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh && mkdir -p uploads
EXPOSE 3000
CMD ["./entrypoint.sh"]
