import requests
import json

URL_OPENFOOTBALL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
ARCHIVO_LOCAL = "resultados_nube.json"

def actualizar_datos():
    print("Sincronizando calendario y goles con OpenFootball...")
    try:
        response = requests.get(URL_OPENFOOTBALL)
        if response.status_code != 200:
            print(f"Error al descargar los datos: Código {response.status_code}")
            return

        datos_nube = response.json()
        diccionario_resultados = {}

        for partido in datos_nube.get('matches', []):
            equipo1 = str(partido.get('team1', '')).strip().upper()
            equipo2 = str(partido.get('team2', '')).strip().upper()

            if not equipo1 or not equipo2:
                continue

            goles1 = partido.get('score1')
            goles2 = partido.get('score2')
            
            # Extraemos fecha y hora
            fecha = partido.get('date', 'Fecha a conf.')
            hora = partido.get('time', 'Hora a conf.')

            clave = f"{equipo1} VS {equipo2}"
            diccionario_resultados[clave] = {
                "gl": goles1,
                "gv": goles2,
                "fecha": fecha,
                "hora": hora
            }

        with open(ARCHIVO_LOCAL, 'w', encoding='utf-8') as f:
            json.dump(diccionario_resultados, f, indent=4, ensure_ascii=False)

        print(f"¡Éxito! Se sincronizaron {len(diccionario_resultados)} partidos en {ARCHIVO_LOCAL}.")

    except Exception as e:
        print(f"Error técnico: {e}")

if __name__ == "__main__":
    actualizar_datos()