FROM node:22-alpine

RUN apk add --no-cache ghostscript python3 py3-pip py3-pymupdf py3-docx \
  && pip3 install --break-system-packages --no-deps pdf2docx

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD sh -c "npx prisma generate && npm start"
