FROM node:22-alpine

RUN apk add --no-cache ghostscript libreoffice-writer fontconfig \
  && mkdir -p /usr/share/fonts/truetype \
  && wget -q -O /usr/share/fonts/truetype/wqy-microhei.ttc \
    "https://github.com/anthonyfok/fonts-wqy-microhei/raw/master/wqy-microhei.ttc" 2>/dev/null \
  && fc-cache -fv \
  && echo "Font setup done"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
