document.getElementById("clienteForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const cliente = {
    nome: document.getElementById("nome").value,
    renda: parseFloat(document.getElementById("renda").value),
    setor: document.getElementById("setor").value,
    profissao: document.getElementById("profissao").value,
    prazo: parseInt(document.getElementById("prazo").value),
    estado: document.getElementById("estado").value
  };

  console.log("Enviando cliente:", cliente);

  try {
    const response = await fetch("http://localhost:8000/api/credito/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente)
    });

    console.log("Status da resposta:", response.status);

    if (!response.ok) {
      throw new Error("Erro na resposta da API");
    }

    const data = await response.json();
    console.log("Dados recebidos:", data);

    document.getElementById("resultado").innerHTML = `
      <p><strong>Cliente:</strong> ${data.nome}</p>
      <p><strong>Profissão:</strong> ${data.profissao}</p>
      <p><strong>Renda:</strong> R$ ${data.renda}</p>
      <p><strong>Setor:</strong> ${data.setor}</p>
      <p><strong>Prazo de crédito:</strong> ${data.prazo} meses</p>
      <p><strong>Estado:</strong> ${data.estado}</p>
      <p><strong>Taxa média:</strong> ${data.taxa_media}%</p>
      <p><strong>Taxa cliente:</strong> ${data.taxa_cliente}%</p>
      <p><strong>Classificação de risco:</strong> ${data.risco}</p>
      <p><strong>Perfil Bacen:</strong> ${data.perfil}</p>
    `;
  } catch (error) {
    console.error("Erro capturado:", error);
    document.getElementById("resultado").innerHTML = "<p style='color:red'>Erro ao consultar API.</p>";
  }
});
