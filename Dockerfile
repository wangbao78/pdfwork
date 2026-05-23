FROM node:22-alpine

RUN apk add --no-cache ghostscript libreoffice-writer fontconfig python3 py3-pip \
  && mkdir -p /usr/share/fonts/truetype

# Chinese font (SimHei) for PDF conversion
COPY scripts/simhei.ttf /usr/share/fonts/truetype/
RUN fc-cache -fv

# pdf2docx for better Chinese text extraction
RUN pip3 install --break-system-packages pdf2docx

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
