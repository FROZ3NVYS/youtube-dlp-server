const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined')); // Logowanie żądań

// Endpoint główny
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LinkDownloader API Server is running',
    endpoints: {
      extract: '/api/extract?url=URL_DO_MEDIÓW',
      formats: '/api/formats?url=URL_DO_MEDIÓW',
      youtube: '/api/youtube?id=ID_FILMU_YOUTUBE'
    }
  });
});

// Endpoint do ekstrakcji informacji o mediach
app.get('/api/extract', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'URL jest wymagany' });
  }

  console.log(`Przetwarzanie URL: ${url}`);

  try {
    // Pobierz informacje o mediach
    const mediaInfo = await getMediaInfo(url);
    res.json(mediaInfo);
  } catch (error) {
    console.error(`Błąd: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint do pobierania dostępnych formatów
app.get('/api/formats', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'URL jest wymagany' });
  }

  console.log(`Pobieranie formatów dla URL: ${url}`);

  try {
    // Pobierz dostępne formaty
    const formats = await getAvailableFormats(url);
    res.json(formats);
  } catch (error) {
    console.error(`Błąd: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint specjalnie dla YouTube
app.get('/api/youtube', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) {
    return res.status(400).json({ error: 'ID filmu YouTube jest wymagane' });
  }

  console.log(`Przetwarzanie filmu YouTube o ID: ${videoId}`);

  try {
    // Utwórz URL YouTube na podstawie ID
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Użyj specjalnej funkcji dla YouTube
    const mediaInfo = await getYouTubeMediaInfo(youtubeUrl);
    
    // Dodaj dodatkowe informacje specyficzne dla YouTube
    mediaInfo.video_id = videoId;
    mediaInfo.platform = 'youtube';
    
    res.json(mediaInfo);
  } catch (error) {
    console.error(`Błąd przetwarzania filmu YouTube: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Funkcja do pobierania informacji o mediach
async function getMediaInfo(url) {
  return new Promise((resolve, reject) => {
    const command = `yt-dlp --dump-json --no-warnings ${url}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Błąd wykonania komendy: ${error.message}`);
        return reject(new Error(`Nie można pobrać informacji o mediach: ${error.message}`));
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      try {
        const data = JSON.parse(stdout);
        
        // Przygotuj odpowiedź
        const response = {
          title: data.title || 'Nieznany tytuł',
          description: data.description || '',
          thumbnail: data.thumbnail || '',
          directVideoUrl: null,
          directAudioUrl: null
        };
        
        // Znajdź najlepszy format wideo
        if (data.formats) {
          const videoFormats = data.formats.filter(f => f.vcodec !== 'none' && f.acodec !== 'none');
          if (videoFormats.length > 0) {
            // Sortuj według rozdzielczości (od najwyższej do najniższej)
            videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
            response.directVideoUrl = videoFormats[0].url;
          }
          
          // Znajdź najlepszy format audio
          const audioFormats = data.formats.filter(f => f.acodec !== 'none');
          if (audioFormats.length > 0) {
            // Sortuj według bitrate (od najwyższego do najniższego)
            audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0));
            response.directAudioUrl = audioFormats[0].url;
          }
        }
        
        resolve(response);
      } catch (e) {
        console.error(`Błąd parsowania JSON: ${e.message}`);
        reject(new Error('Nie można przetworzyć informacji o mediach'));
      }
    });
  });
}

// Specjalna funkcja dla YouTube z dodatkowymi parametrami
async function getYouTubeMediaInfo(url) {
  return new Promise((resolve, reject) => {
    // Dodaj specjalne parametry dla YouTube
    const command = `yt-dlp --dump-json --no-warnings --extractor-args "youtube:player_client=android" --geo-bypass ${url}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Błąd wykonania komendy YouTube: ${error.message}`);
        return reject(new Error(`Nie można pobrać informacji o filmie YouTube: ${error.message}`));
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      try {
        const data = JSON.parse(stdout);
        
        // Przygotuj odpowiedź
        const response = {
          title: data.title || 'Nieznany tytuł',
          description: data.description || '',
          thumbnail: data.thumbnail || '',
          directVideoUrl: null,
          directAudioUrl: null
        };
        
        // Znajdź najlepszy format wideo
        if (data.formats) {
          const videoFormats = data.formats.filter(f => f.vcodec !== 'none' && f.acodec !== 'none');
          if (videoFormats.length > 0) {
            // Sortuj według rozdzielczości (od najwyższej do najniższej)
            videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
            response.directVideoUrl = videoFormats[0].url;
          }
          
          // Znajdź najlepszy format audio
          const audioFormats = data.formats.filter(f => f.acodec !== 'none');
          if (audioFormats.length > 0) {
            // Sortuj według bitrate (od najwyższego do najniższego)
            audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0));
            response.directAudioUrl = audioFormats[0].url;
          }
        }
        
        resolve(response);
      } catch (e) {
        console.error(`Błąd parsowania JSON YouTube: ${e.message}`);
        reject(new Error('Nie można przetworzyć informacji o filmie YouTube'));
      }
    });
  });
}

// Funkcja do pobierania dostępnych formatów
async function getAvailableFormats(url) {
  return new Promise((resolve, reject) => {
    const command = `yt-dlp -F --no-warnings ${url}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Błąd wykonania komendy: ${error.message}`);
        return reject(new Error(`Nie można pobrać formatów: ${error.message}`));
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      // Parsuj wyjście komendy
      const lines = stdout.split('\n');
      const formats = [];
      
      for (const line of lines) {
        // Ignoruj linie nagłówkowe i puste
        if (line.startsWith('[') || !line.trim() || line.includes('Available formats')) {
          continue;
        }
        
        // Parsuj linię formatu
        const match = line.match(/^(\S+)\s+(\S+)\s+(.+)$/);
        if (match) {
          formats.push({
            format_id: match[1],
            extension: match[2],
            description: match[3].trim()
          });
        }
      }
      
      resolve({ formats });
    });
  });
}

// Funkcja do aktualizacji youtube-dlp
async function updateYoutubeDlp() {
  return new Promise((resolve, reject) => {
    const command = `yt-dlp -U`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Błąd aktualizacji youtube-dlp: ${error.message}`);
        return reject(error);
      }
      
      console.log(`youtube-dlp zaktualizowany: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Uruchom serwer i zaktualizuj youtube-dlp
app.listen(port, async () => {
  console.log(`Serwer uruchomiony na porcie ${port}`);
  try {
    await updateYoutubeDlp();
    console.log('youtube-dlp zaktualizowany pomyślnie');
  } catch (error) {
    console.error('Błąd aktualizacji youtube-dlp:', error);
  }
});
