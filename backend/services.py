import pandas as pd
import pyreadstat
import os
import json

def cargar_datos():
    archivo_sav = "data/3492.sav"
    df, meta = pyreadstat.read_sav(archivo_sav)
    return df

def listar_variables():
    archivo_sav = os.path.abspath("data/3492.sav")
    _, meta = pyreadstat.read_sav(archivo_sav)
    
    mapping = {}
    for name, label in zip(meta.column_names, meta.column_labels):
        mapping[name] = label
    return mapping

def obtener_datos_variable(variable: str):
    archivo_sav = "data/3492.sav"
    df, _ = pyreadstat.read_sav(archivo_sav)
    
    if variable not in df.columns:
        return {"error": "Variable no encontrada"}
    
    return df[[variable]].dropna()

def obtener_distribucion(variable: str):
    archivo_sav = "data/3492.sav"
    df, _ = pyreadstat.read_sav(archivo_sav)
    
    if variable not in df.columns:
        return {"error": "Variable no encontrada"}
    
    conteo = df[variable].value_counts().to_dict()
    return conteo

def obtener_metadatos():
    archivo_sav = os.path.abspath("data/3492.sav")
    df, meta = pyreadstat.read_sav(archivo_sav)

    etiquetas_variables = meta.column_labels
    etiquetas_valores = meta.variable_value_labels

    return {
        "etiquetas_variables": etiquetas_variables,
        "etiquetas_valores": etiquetas_valores
    }

def write_debug(msg):
    with open("debug.log", "a", encoding='utf-8') as f:
        f.write(str(msg) + "\n")

def obtener_contingencia(variable1: str, variable2: str):
    write_debug(f"Starting contingency analysis for variables: {variable1} and {variable2}")
    archivo_sav = "data/3492.sav"
    
    try:
        df, meta = pyreadstat.read_sav(archivo_sav)
        
        if variable1 not in df.columns or variable2 not in df.columns:
            write_debug(f"Variables not found. Available columns: {df.columns.tolist()}")
            return {"error": "Una o ambas variables no encontradas"}
        
        contingencia = pd.crosstab(df[variable1], df[variable2], margins=True)
        porcentajes_fila = pd.crosstab(df[variable1], df[variable2], normalize='index') * 100
        porcentajes_columna = pd.crosstab(df[variable1], df[variable2], normalize='columns') * 100
        
        etiquetas_var1 = meta.variable_value_labels.get(variable1, {})
        etiquetas_var2 = meta.variable_value_labels.get(variable2, {})
        
        resultado = {
            "datos": {
                "filas": {
                    str(idx): {
                        "etiqueta": etiquetas_var1.get(float(idx), str(idx)) if idx != "All" else "Total",
                        "valores": {
                            str(col): {
                                "frecuencia": int(contingencia.loc[idx, col]),
                                "porcentaje_fila": float(porcentajes_fila.loc[idx, col]) if idx != "All" and col != "All" else None,
                                "porcentaje_columna": float(porcentajes_columna.loc[idx, col]) if idx != "All" and col != "All" else None
                            } for col in contingencia.columns
                        }
                    } for idx in contingencia.index
                },
                "columnas": {
                    str(col): {
                        "etiqueta": etiquetas_var2.get(float(col), str(col)) if col != "All" else "Total"
                    } for col in contingencia.columns
                }
            },
            "metadatos": {
                "variable1": {
                    "codigo": variable1,
                    "etiqueta": meta.column_labels[meta.column_names.index(variable1)],
                    "total_casos": int(contingencia.loc["All", "All"])
                },
                "variable2": {
                    "codigo": variable2,
                    "etiqueta": meta.column_labels[meta.column_names.index(variable2)]
                }
            }
        }
        return resultado
        
    except Exception as e:
        write_debug(f"Error in contingency analysis: {str(e)}")
        import traceback
        write_debug(f"Traceback: {traceback.format_exc()}")
        raise
