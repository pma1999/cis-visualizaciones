import pandas as pd
import os

# Ajusta la ruta al archivo CSV
csv_file = os.path.abspath("data/3492_num.csv")

# Cargamos el CSV; asegúrate de usar el delimitador correcto (aquí se asume ";")
df = pd.read_csv(csv_file, delimiter=";", dtype=str)

# Mostrar información general del DataFrame
print("=== Información General del DataFrame ===")
print(df.info())
print("\n=== Primeras 5 Filas ===")
print(df.head())

# Iterar por cada columna y mostrar sus valores únicos y conteos
print("\n=== Análisis por Columna ===")
for col in df.columns:
    print("\n---------------------------------")
    print(f"Columna: {col}")
    unique_count = df[col].nunique(dropna=False)
    print(f"Número de valores únicos (incluyendo NaN): {unique_count}")
    print("Frecuencia de cada valor:")
    print(df[col].value_counts(dropna=False))
