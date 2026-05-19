FROM node:22-alpine

RUN apk add --no-cache libreoffice-writer libreoffice-draw libreoffice-impress ghostscript \
  && for p in /usr/bin/soffice /usr/lib/libreoffice/program/soffice; do [ -f "$p" ] && echo "FOUND: $p"; done

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
