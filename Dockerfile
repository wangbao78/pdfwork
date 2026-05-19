FROM node:22-alpine

RUN apk add --no-cache libreoffice libreoffice-writer ghostscript \
  && find / -name "soffice" -o -name "libreoffice" 2>/dev/null || true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
