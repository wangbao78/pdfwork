FROM node:22-alpine

RUN apk add --no-cache libreoffice ghostscript \
  && test -f /usr/bin/soffice && echo "LO found at /usr/bin/soffice" \
  || (echo "LO not at /usr/bin/soffice, searching..." && find / -name soffice -type f 2>/dev/null)

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
