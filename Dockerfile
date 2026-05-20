FROM node:22-alpine

RUN apk add --no-cache ghostscript libreoffice-writer fontconfig \
  && mkdir -p /usr/share/fonts/truetype

# Chinese font (SimHei) for PDF conversion
COPY scripts/simhei.ttf /usr/share/fonts/truetype/
RUN fc-cache -fv

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
