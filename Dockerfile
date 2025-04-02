FROM node:16

WORKDIR /app

# Zainstaluj youtube-dlp i zależności
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg
RUN pip3 install yt-dlp

# Skopiuj pliki projektu
COPY package*.json ./
RUN npm install
COPY . .

# Ustaw port
EXPOSE 3000

# Uruchom aplikację
CMD ["npm", "start"]
