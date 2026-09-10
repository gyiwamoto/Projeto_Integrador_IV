import pandas as pd

# Exemplo: série 20786 = taxa de inadimplência PF
url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.20786/dados?formato=csv"
df = pd.read_csv(url, sep=";")

print("Primeiras linhas da série do Bacen:")
print(df.head())
