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

    // Verifica se as respostas foram bem-sucedidas
    if (!forecastResposta.ok) {
      console.error(`Erro na API de previsão: ${forecastResposta.status}`);
    }
    if (!airQualityResposta.ok) {
      console.error(
        `Erro na API de qualidade do ar: ${airQualityResposta.status}`
      );
    }
    if (!geocodeResposta.ok) {
      console.error(`Erro na API de geocodificação: ${geocodeResposta.status}`);
    }

    // Converte para JSON
    const forecastDados = await forecastResposta.json();
    const airQualityDados = await airQualityResposta.json();
    const localInfo = await geocodeResposta.json();

    // Verifica se os dados da qualidade do ar estão completos
    if (
      airQualityDados.hourly &&
      (!airQualityDados.hourly.us_aqi || !airQualityDados.hourly.european_aqi)
    ) {
      console.error("Dados de qualidade do ar incompletos:", airQualityDados);
    }

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

app.get("/api/local/resumo/:latitude/:longitude", async (req, res) => {
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

    const dadosCompletos = await buscarCidadePorCoordenadas(
      latitude,
      longitude
    );
    if (dadosCompletos) {
      // Verifica se os dados necessários estão presentes
      if (
        !dadosCompletos.qualidadeDoAr.hourly ||
        !dadosCompletos.qualidadeDoAr.hourly.us_aqi
      ) {
        console.warn("Dados de qualidade do ar ausentes ou incompletos");
      }

      // Criando um subconjunto simplificado dos dados baseado na estrutura real
      const dadosResumidos = {
        localInfo: {
          display_name: dadosCompletos.localInfo.display_name,
          address: {
            city: dadosCompletos.localInfo.address?.city,
            state: dadosCompletos.localInfo.address?.state,
            country: dadosCompletos.localInfo.address?.country,
          },
        },
        previsao: {
          current: {
            temperature: dadosCompletos.previsao.current?.temperature,
            weather_code: dadosCompletos.previsao.current?.weather_code,
            wind_speed_10m: dadosCompletos.previsao.current?.wind_speed_10m,
            apparent_temperature:
              dadosCompletos.previsao.current?.apparent_temperature,
            relative_humidity_2m:
              dadosCompletos.previsao.current?.relative_humidity_2m,
          },
        },
      };

      res.json(dadosResumidos);
    } else {
      res.status(500).json({ error: "Erro ao buscar informações do local." });
    }
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    res
      .status(500)
      .json({ error: "Erro ao processar a requisição de resumo." });
  }
  console.log(
    `Requisição de resumo recebida para /api/local/resumo/${req.params.latitude}/${req.params.longitude}`
  );
  console.log("Resumo funcionou");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
