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

# Vite'ın dışarıya erişebilmesi için gerekli port
EXPOSE 5173

# Vite'ı host modunda çalıştır (0.0.0.0 üzerinden erişim için)
CMD ["npm", "run", "dev", "--", "--host"]
