import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler

# Lendo os arquivos
treino = pd.read_excel("base_treino.xlsx")
teste = pd.read_excel("base_teste.xlsx")

# Converter risco para números
mapa_risco = {"Baixo":0, "Médio":1, "Alto":2}
treino["risco"] = treino["risco"].map(mapa_risco)
teste["risco"] = teste["risco"].map(mapa_risco)

# Separar variáveis
X = treino[["renda", "inadimplencia", "volume_credito"]]
y = treino["risco"]

# Divisão treino/validação
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)

# Normalizar
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_val = scaler.transform(X_val)
X_teste = scaler.transform(teste[["renda", "inadimplencia", "volume_credito"]])

# Rede neural
modelo = MLPClassifier(hidden_layer_sizes=(10,10), max_iter=1000)
modelo.fit(X_train, y_train)

# Validar
y_pred = modelo.predict(X_val)
print("Acurácia treino:", accuracy_score(y_val, y_pred))

# Testar
y_teste = teste["risco"]
y_pred_teste = modelo.predict(X_teste)
print("Acurácia teste:", accuracy_score(y_teste, y_pred_teste))
