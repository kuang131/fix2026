import requests
import json

url = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"

print("Conectando con la base de datos de OpenFootball...\n")

try:
    response = requests.get(url)
    
    # Si la página responde con un OK (código 200)
    if response.status_code == 200:
        datos = response.json()
        print("¡Conexión exitosa! Te muestro un pedacito de cómo viene la información:\n")
        
        # Imprimimos solo los primeros 1000 caracteres para no inundarte la pantalla
        texto_formateado = json.dumps(datos, indent=2, ensure_ascii=False)
        print(texto_formateado[:1000] + "\n\n... [Sigue el archivo] ...")
        
    elif response.status_code == 404:
        print("Error 404: El archivo de 2026 todavía no está creado en su servidor.")
    else:
        print(f"La web devolvió un error raro: Código {response.status_code}")

except Exception as e:
    print(f"Error de conexión: {e}")