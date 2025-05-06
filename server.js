const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

async function buscarCoordenadas(cidade) {
  const cidadeEncoded = encodeURIComponent(cidade);
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cidadeEncoded}&count=1`;
  try {
    const resposta = await fetch(url);
    const dados = await resposta.json();
    if (dados.results && dados.results.length > 0) {
      return dados.results[0];
    } else {
      return null;
    }
  } catch (erro) {
    return null;
  }
}

app.get("/api/coordenadas/:cidade", async (req, res) => {
  try {
    const cidade = req.params.cidade;
    const dados = await buscarCoordenadas(cidade);
    if (dados) {
      res.json(dados);
    } else {
      res.status(404).json({ error: "Cidade não encontrada." });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar coordenadas." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
