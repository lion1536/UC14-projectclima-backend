const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

async function buscarCidadePorCoordenadas(latitude, longitude) {
  // URL para previsão do tempo
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature,weather_code,wind_speed_10m&timezone=auto`;
  
  try {
    // Obtemos os dados de previsão do tempo usando as coordenadas
    const forecastResposta = await fetch(forecastUrl);
    const forecastDados = await forecastResposta.json();
    
    // Para geocodificação reversa, vamos usar a API Nominatim do OpenStreetMap
    // que é especializada em geocodificação reversa
    const geocodeReverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    
    const geocodeResposta = await fetch(geocodeReverseUrl, {
      headers: {
        // É boa prática incluir um User-Agent com informações de contato ao usar Nominatim
        'User-Agent': 'ProjectClima-App/1.0'
      }
    });
    
    const localInfo = await geocodeResposta.json();
    
    // Retorna um objeto combinando os dados de localização e previsão
    return {
      localInfo: localInfo,
      previsao: forecastDados
    };
  } catch (erro) {
    console.error("Erro ao buscar dados por coordenadas:", erro);
    return null;
  }
}




app.get("/api/local/:latitude/:longitude", async (req, res) => {
  try {
    const latitude = parseFloat(req.params.latitude);
    const longitude = parseFloat(req.params.longitude);
    
    // Validação básica das coordenadas
    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Coordenadas inválidas." });
    }
    
    const dados = await buscarCidadePorCoordenadas(latitude, longitude);
    if (dados) {
      res.json(dados);
    } else {
      res.status(500).json({ error: "Erro ao buscar informações do local." });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar a requisição." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
