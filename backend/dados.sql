CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    renda NUMERIC,
    setor VARCHAR(100),
    risco VARCHAR(20),
    inadimplencia NUMERIC,
    volume_credito NUMERIC
);

INSERT INTO clientes (nome, renda, setor, risco, inadimplencia, volume_credito)
VALUES
('Maria Silva', 1500, 'Comércio', 'Alto', 0.12, 5000),
('João Pereira', 3500, 'Serviços', 'Baixo', 0.05, 20000),
('Ana Costa', 2200, 'Indústria', 'Médio', 0.08, 12000),
('Carlos Souza', 800, 'Agricultura', 'Alto', 0.20, 3000),
('Fernanda Lima', 6000, 'Tecnologia', 'Baixo', 0.03, 50000);
