FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript libreoffice-writer fontconfig python3 python3-pip wkhtmltopdf \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /usr/share/fonts/truetype

# Chinese font (SimHei) for PDF conversion
COPY scripts/simhei.ttf /usr/share/fonts/truetype/
RUN fc-cache -fv

# pdf2docx for better Chinese text extraction (PyMuPDF has manylinux wheels)
RUN pip3 install --break-system-packages pdf2docx

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npx prisma db push --accept-data-loss && npm start"
