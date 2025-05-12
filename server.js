const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

async function buscarCidadePorCoordenadas(latitude, longitude) {
  // URLs para previsão do tempo, qualidade do ar e geolocalização
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature&timezone=auto`;

  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=us_aqi,european_aqi&timezone=auto`;

  const geocodeReverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

  try {
    // Executa todas as requisições ao mesmo tempo
    const [forecastResposta, airQualityResposta, geocodeResposta] =
      await Promise.all([
        fetch(forecastUrl),
        fetch(airQualityUrl),
        fetch(geocodeReverseUrl, {
          headers: {
            "User-Agent": "ProjectClima-App/1.0",
          },
        }),
      ]);

    // Converte para JSON
    const forecastDados = await forecastResposta.json();
    const airQualityDados = await airQualityResposta.json();
    const localInfo = await geocodeResposta.json();

    // Retorna tudo junto
    return {
      localInfo,
      previsao: forecastDados,
      qualidadeDoAr: airQualityDados,
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

    // Validação das coordenadas
    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ error: "Coordenadas inválidas." });
    }

    const dados = await buscarCidadePorCoordenadas(latitude, longitude);
    if (dados) {
      res.json(dados);
    } else {
      res.status(500).json({ error: "Erro ao buscar informações do local." });
    }
  } catch (error) {
    console.error("Erro geral:", error);
    res.status(500).json({ error: "Erro ao processar a requisição." });
  }
  console.log(`Requisição recebida para /api/local/${req.params.latitude}/${req.params.longitude}`);
  console.log("funcionou");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
