# Node.js resmi imajını kullan
FROM node:20-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# Bağımlılık dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Tüm dosyaları kopyala
COPY . .

# Backend'in çalışacağı port
EXPOSE 5000

# Uygulamayı başlat
CMD ["node", "server.js"]
