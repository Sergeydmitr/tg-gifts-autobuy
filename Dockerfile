# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json (если есть)
COPY app/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код приложения
COPY app/ ./

# Создаем пользователя для запуска приложения (безопасность)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Меняем владельца файлов
RUN chown -R nextjs:nodejs /usr/src/app
USER nextjs

# Команда для запуска приложения
CMD ["npm", "start"]