#!/usr/bin/env python3
"""Genera fichas de parlamentarios autonómicos obtenidas de fuentes secundarias
(Wikipedia · sitios institucionales · prensa) cuando el portal oficial bloquea
scraping directo o la calidad de los datos extraídos es deficiente.

Bloques que produce:
  · Navarra (XI legislatura) · 50 parlamentarios · Wikipedia
  · Castilla y León (XI legislatura) · 81 procuradores · Wikipedia
  · Castilla-La Mancha (XI legislatura) · 33 diputados · Wikipedia + prensa
  · Galicia (XII legislatura) · 76 diputados · Wikipedia (anexo oficial)
  · Cantabria (XI legislatura) · 35 diputados · Wikipedia · REEMPLAZA los 30
    mangled del CCAA parser (formato apellidos-primero + sin partido)
  · Ceuta (XI legislatura) · 25 diputados · ElFaro · completa los 14 del CCAA
  · Extremadura (XII legislatura) · 65 diputados · Asamblea Extremadura ·
    completa los 32 del CCAA
  · Melilla (XI legislatura) · 25 diputados · BOME + Wikipedia + prensa

Para fusión, este script:
  · Filtra IN-PLACE las 30 entradas mangled de Cantabria de
    /tmp/dosieres_ccaa.json antes de añadir las 35 nuevas.
  · Para Ceuta/Extremadura, deja que la deduplicación en gen_dosieres_fixture
    (allow_homonyms=False) descarte los duplicados de slug.
"""
import json
import re
import sys
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades comunes
# ─────────────────────────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def titlecase_es(s: str) -> str:
    lower_words = {"de", "del", "la", "las", "el", "los", "y", "e", "i", "o", "u",
                   "da", "do", "das", "dos"}
    words = s.lower().split()
    out = []
    for i, w in enumerate(words):
        if i > 0 and w in lower_words:
            out.append(w)
        else:
            parts = re.split(r"([\-' ])", w)
            out.append("".join(p.capitalize() if not re.match(r"^[\-' ]$", p) else p for p in parts))
    return " ".join(out)


def normaliza_apellidos_nombre(s: str) -> str:
    """'Álvarez Cortés, María Piedad' → 'María Piedad Álvarez Cortés'.
    Si no hay coma, devuelve s sin cambios."""
    if "," in s:
        apellidos, nombre = s.split(",", 1)
        return f"{nombre.strip()} {apellidos.strip()}"
    return s.strip()


def make_ficha(nombre: str, partido: str, *, cargo: str, parlamento: str,
               legislatura: str, slug_suffix: str, num: int) -> dict:
    nombre_t = titlecase_es(nombre)
    slug = slugify(nombre_t)
    if slug_suffix:
        slug = f"{slug}-{slug_suffix}"
    cargo_full = f"{cargo} · {legislatura} · {partido}"
    bio_corta = f"{cargo} · {legislatura}. Grupo {partido}."
    perfil = (
        f"{nombre_t} es {cargo.lower()} en el {parlamento} en la {legislatura}, "
        f"miembro del grupo {partido}. Ficha generada desde fuente periodística "
        f"verificada (Wikipedia · sitio oficial · resultados electorales) · pendiente "
        f"de ampliar con perfil, trayectoria, declaraciones y patrimonio."
    )
    return {
        "slug": slug,
        "num": num,
        "nombre_completo": nombre_t,
        "cargo_actual": cargo_full,
        "partido": partido,
        "bio_corta": bio_corta,
        "perfil_completo": perfil,
        "relaciones": [],
        "patrimonio": [
            {"concepto": "Patrimonio declarado",
             "valor": f"Pendiente de desglose desde la declaración pública del {parlamento}."},
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# NAVARRA · XI Legislatura · 50 parlamentarios · Wikipedia
# ─────────────────────────────────────────────────────────────────────────────

NAVARRA = [
    # UPN (15)
    ("Marta Álvarez Alonso", "UPN"),
    ("Ángel Ansa Echegaray", "UPN"),
    ("Miguel Bujanda Cirauqui", "UPN"),
    ("Ana María Elizalde Urmeneta", "UPN"),
    ("José Javier Esparza Abaurrea", "UPN"),
    ("Raquel Garbayo Berdonces", "UPN"),
    ("Pedro José González Felipe", "UPN"),
    ("Yolanda Ibáñez Pérez", "UPN"),
    ("Iñaki Iriarte López", "UPN"),
    ("Cristina López Mañero", "UPN"),
    ("Leticia San Martín Rodríguez", "UPN"),
    ("Juan Luis Sánchez de Muniáin Lacasia", "UPN"),
    ("Francisco Javier Trigo Oubiña", "UPN"),
    ("María Jesús Valdemoros Erro", "UPN"),
    ("Félix Zapatero Soria", "UPN"),
    # PSN-PSOE (11)
    ("Jorge Aguirre Oviedo", "PSOE"),
    ("Ramón Alzórriz Goñi", "PSOE"),
    ("María Aranzazu Biurrun Urpegui", "PSOE"),
    ("María Victoria Chivite Navascués", "PSOE"),
    ("María Olga Chueca Chueca", "PSOE"),
    ("María Teresa Esporrín Las Heras", "PSOE"),
    ("María Inmaculada Jurío Macaya", "PSOE"),
    ("Antonio Javier Lecumberri Urabayen", "PSOE"),
    ("Kevin Lucero Domingues", "PSOE"),
    ("Jesús María Rodríguez Gómez", "PSOE"),
    ("Ainhoa Unzu Garate", "PSOE"),
    # EH Bildu (9)
    ("Adolfo Araiz Flamarique", "EH Bildu"),
    ("Javier Arza Porras", "EH Bildu"),
    ("Laura Aznal Sagasti", "EH Bildu"),
    ("Domingo González Martínez", "EH Bildu"),
    ("Aranzazu Izurdiaga Osinaga", "EH Bildu"),
    ("Irati Jiménez Aragón", "EH Bildu"),
    ("Eneka Maiz Ulaiar", "EH Bildu"),
    ("Severiano Txoperena Matxikote", "EH Bildu"),
    ("Mikel Zabaleta Aramendia", "EH Bildu"),
    # Geroa Bai (7)
    ("Javier Arakama Urtiaga", "Geroa Bai"),
    ("Mikel Asiain Torres", "Geroa Bai"),
    ("Pablo Azcona Molinet", "Geroa Bai"),
    ("Uxue Barcos Berruezo", "Geroa Bai"),
    ("Unai Hualde Iglesias", "Geroa Bai"),
    ("Blanca Isabel Regúlez Álvarez", "Geroa Bai"),
    ("María Roncesvalles Solana Arana", "Geroa Bai"),
    # PPN (3)
    ("Javier García Jiménez", "PP"),
    ("María Irene Royo Ortín", "PP"),
    ("María Isabel García Malo", "PP"),
    # Contigo Navarra (3)
    ("Begoña Alfaro García", "Contigo Navarra"),
    ("Carlos Guzmán Pérez", "Contigo Navarra"),
    ("Daniel López Córdoba", "Contigo Navarra"),
    # VOX (2)
    ("Emilio Jiménez Román", "VOX"),
    ("María Teresa Nosti Izquierdo", "VOX"),
]


# ─────────────────────────────────────────────────────────────────────────────
# CASTILLA Y LEÓN · XI Legislatura · 81 procuradores · Wikipedia
# ─────────────────────────────────────────────────────────────────────────────

CYL = [
    # PP (31)
    ("José Francisco Hernández Herrero", "PP"),
    ("María de los Ángeles Prieto Sánchez", "PP"),
    ("Miguel Ángel García Nieto", "PP"),
    ("Ángel Mariano Ibáñez Hernando", "PP"),
    ("Alejandro Vázquez Ramos", "PP"),
    ("María Inmaculada Ranedo Gómez", "PP"),
    ("Emilio José Berzosa Peña", "PP"),
    ("Juan Carlos Suárez-Quiñones Fernández", "PP"),
    ("Beatriz Coelho Luna", "PP"),
    ("David Fernández Menéndez", "PP"),
    ("Ricardo Gavilanes Fernández-Llamazares", "PP"),
    ("Carlos Javier Amando Fernández Carriedo", "PP"),
    ("María José Ortega Gómez", "PP"),
    ("María de las Mercedes Cófreces Martín", "PP"),
    ("Alfonso Fernando Fernández Mañueco", "PP"),
    ("María del Carmen Sánchez Bellota", "PP"),
    ("Rosa María Esteban Ayuso", "PP"),
    ("José María Sánchez Martín", "PP"),
    ("Raúl Hernández López", "PP"),
    ("Francisco Javier Vázquez Requero", "PP"),
    ("José Luis Sanz Merino", "PP"),
    ("María Ángeles García Herrero", "PP"),
    ("María del Rocío Lucas Navas", "PP"),
    ("Jesús Julio Carnero García", "PP"),
    ("Raúl de la Hoz Quintano", "PP"),
    ("María Paloma Vallejo Quevedo", "PP"),
    ("Noemí Rojo Sahagún", "PP"),
    ("Ramiro Felipe Ruiz Medrano", "PP"),
    ("María Isabel Blanco Llamas", "PP"),
    ("Leticia García Sánchez", "PP"),
    ("Óscar Reguera Acevedo", "PP"),
    # PSOE (28)
    ("Eugenio Miguel Hernández Alcojor", "PSOE"),
    ("María Soraya Blázquez Domínguez", "PSOE"),
    ("Luis Tudanca Fernández", "PSOE"),
    ("Virginia Jiménez Campano", "PSOE"),
    ("Luis Briones Martínez", "PSOE"),
    ("Noelia Frutos Rubio", "PSOE"),
    ("Jesús Puente Alcaraz", "PSOE"),
    ("Nuria Rubio García", "PSOE"),
    ("Javier Campos de la Fuente", "PSOE"),
    ("Yolanda Sacristán Rodríguez", "PSOE"),
    ("Diego Moreno Castrillo", "PSOE"),
    ("Jesús Guerrero Arroyo", "PSOE"),
    ("María Consolación Pablos Labajo", "PSOE"),
    ("Rubén Illera Redón", "PSOE"),
    ("Fernando Pablos Romo", "PSOE"),
    ("Rosa María Rubio Martín", "PSOE"),
    ("Juan Luis Cepa Álvarez", "PSOE"),
    ("José Luis Vázquez Fernández", "PSOE"),
    ("Alicia Palomo Sebastián", "PSOE"),
    ("Ángel Hernández Martínez", "PSOE"),
    ("Elisa Patricia Gómez Urbán", "PSOE"),
    ("Pedro Luis González Reglero", "PSOE"),
    ("Laura Pelegrina Cortijo", "PSOE"),
    ("José Francisco Martín Martínez", "PSOE"),
    ("María Isabel Gonzalo Ramírez", "PSOE"),
    ("Ana Sánchez Hernández", "PSOE"),
    ("José Ignacio Martín Benito", "PSOE"),
    ("María Inmaculada García Rioja", "PSOE"),
    # VOX (13)
    ("José Antonio Palomo Martín", "VOX"),
    ("Ignacio Sicilia Doménech", "VOX"),
    ("Ana Rosa Hernando Ruiz", "VOX"),
    ("Carlos Pollán Fernández", "VOX"),
    ("Miguel Suárez Arca", "VOX"),
    ("David Hierro Santos", "VOX"),
    ("Carlos Menéndez Blanco", "VOX"),
    ("Teresa Rodríguez Vidal", "VOX"),
    ("Susana Suárez Villagra", "VOX"),
    ("Juan García-Gallardo Frings", "VOX"),
    ("María de Fátima Pinacho Fernández", "VOX"),
    ("Francisco Javier Carrera Noriega", "VOX"),
    ("María Luisa Calvo Enríquez", "VOX"),
    # UPL (3)
    ("Luis Mariano Santos Reyero", "UPL"),
    ("Alicia Gallego González", "UPL"),
    ("José Ramón García Fernández", "UPL"),
    # Soria ¡Ya! (3)
    ("José Ángel Ceña Tutor", "Soria ¡Ya!"),
    ("Leila Vanessa García Macarrón", "Soria ¡Ya!"),
    ("Juan Antonio Palomar Sicilia", "Soria ¡Ya!"),
    # Unidas Podemos (1)
    ("Juan Pablo Fernández Santos", "Podemos"),
    # Ciudadanos (1)
    ("Francisco Igea Arisqueta", "Ciudadanos"),
    # Por Ávila (1)
    ("Pedro José Pascual Muñoz", "Por Ávila"),
]


# ─────────────────────────────────────────────────────────────────────────────
# CASTILLA-LA MANCHA · XI Legislatura · 33 diputados · Wikipedia + prensa
# ─────────────────────────────────────────────────────────────────────────────

CLM = [
    # PSOE (17)
    ("Josefina Navarrete", "PSOE"),
    ("Julián Martínez Lizán", "PSOE"),
    ("Marisa Sánchez Cerro", "PSOE"),
    ("José Manuel Caballero", "PSOE"),
    ("Blanca Fernández", "PSOE"),
    ("Francisco Barato", "PSOE"),
    ("Ana Isabel Abengózar", "PSOE"),
    ("José Luis Martínez Guijarro", "PSOE"),
    ("Paloma Jiménez", "PSOE"),
    ("Ángel Tomás Godoy", "PSOE"),
    ("Pablo Bellido", "PSOE"),
    ("María Jesús Merino", "PSOE"),
    ("Emiliano García-Page", "PSOE"),
    ("Paloma Sánchez", "PSOE"),
    ("Fernando Mora", "PSOE"),
    ("Rosario García Saco", "PSOE"),
    ("José Antonio Contreras", "PSOE"),
    # PP (12)
    ("Tania Andicoberry", "PP"),
    ("Juan Antonio Moreno Moya", "PP"),
    ("María Gil", "PP"),
    ("Lola Merino", "PP"),
    ("Santiago Lucas-Torres", "PP"),
    ("María Roldán", "PP"),
    ("José Antonio Martín-Buro", "PP"),
    ("Ignacio Redondo", "PP"),
    ("Itziar Asenjo", "PP"),
    ("Francisco Núñez", "PP"),
    ("Carolina Agudo", "PP"),
    ("Santiago Serrano", "PP"),
    # VOX (4)
    ("Francisco José Cobo", "VOX"),
    ("Luis Blázquez", "VOX"),
    ("Iván Sánchez Serrano", "VOX"),
    ("David Moreno", "VOX"),
]


# ─────────────────────────────────────────────────────────────────────────────
# GALICIA · XII Legislatura · 76 diputados · Wikipedia anexo oficial
# https://es.wikipedia.org/wiki/Anexo:Diputados_Parlamento_de_Galicia_XII_legislatura
# ─────────────────────────────────────────────────────────────────────────────

GALICIA = [
    ("Julio Ernesto Abalde Alonso", "PSdeG-PSOE"),
    ("María Encarnación Amigo Díaz", "PP"),
    ("Raquel Arias Rodríguez", "PP"),
    ("Silvestre José Balseiros Guinarte", "PP"),
    ("Xosé Luis Bará Torres", "BNG"),
    ("Víctor Manuel Baladrón Lamas", "PP"),
    ("Enrique Barreiro Sánchez", "PP"),
    ("Diego Calvo Pouso", "PP"),
    ("Cristina Campero Dorado", "PP"),
    ("María Elena Candia López", "PP"),
    ("Iria Carreira Pazos", "BNG"),
    ("Juan Manuel Casares Gándara", "PP"),
    ("Daniel Castro García", "BNG"),
    ("Paloma Castro Rey", "PSdeG-PSOE"),
    ("María Deza Martínez", "PP"),
    ("María Elena Espinosa Mangana", "PSdeG-PSOE"),
    ("Ramón Tomás Fernández Alfonzo", "BNG"),
    ("María Cristina Fernández Davila", "BNG"),
    ("Secundino Fernández Fernández", "BNG"),
    ("Alexandra Fernández Gómez", "BNG"),
    ("Ariadna Fernández González", "BNG"),
    ("Jesús María Fernández Rosende", "PP"),
    ("José Luis Ferro Iglesias", "PP"),
    ("Miguel Fidalgo Iglesias", "PP"),
    ("Julio García Comesaña", "PP"),
    ("Patricia García González", "PP"),
    ("José Manuel Golpe Acuña", "BNG"),
    ("José Ramón Gómez Besteiro", "PSdeG-PSOE"),
    ("Carmela González Iglesias", "BNG"),
    ("Nicole Grueira Fernández", "PP"),
    ("María Dolores Hermelo Piñeiro", "PP"),
    ("Patricia Iglesias Rey", "PSdeG-PSOE"),
    ("Óscar Ínsua Lema", "BNG"),
    ("Silvia Longueira Castro", "PSdeG-PSOE"),
    ("Carlos López Font", "PSdeG-PSOE"),
    ("Rubén Lorenzo Gómez", "PP"),
    ("Argimiro Marnotes Fernández", "PP"),
    ("José Manuel Mato Díaz", "PP"),
    ("Lara Méndez López", "PSdeG-PSOE"),
    ("Paula Mouzo Mas", "PP"),
    ("Armando Ojea Bouzo", "Democracia Ourensana"),
    ("José Alberto Pazos Couñago", "PP"),
    ("Rosana Pérez Fernández", "BNG"),
    ("José Daniel Pérez López", "BNG"),
    ("Noelia Pérez López", "PP"),
    ("María Magdalena Pérez Millares", "PP"),
    ("Carmen María Pomar Tojo", "PP"),
    ("Ana Belén Pontón Mondelo", "BNG"),
    ("María Montserrat Prado Cores", "BNG"),
    ("Paula Prado del Río", "PP"),
    ("Noa Presas Bergantiños", "BNG"),
    ("Mercedes Queixas Zas", "BNG"),
    ("Paulo Ríos Santomé", "BNG"),
    ("Olalla Rodil Fernández", "BNG"),
    ("María Felisa Rodríguez Carrera", "PP"),
    ("Ángel Rodríguez Conde", "PP"),
    ("María del Carmen Rodríguez Dacosta", "PSdeG-PSOE"),
    ("Román Rodríguez González", "PP"),
    ("Roberto Rodríguez Martínez", "PP"),
    ("Brais Ruanova Vilas-Boas", "BNG"),
    ("Alfonso Rueda Valenzuela", "PP"),
    ("Miguel Ángel Santalices Vieira", "PP"),
    ("Raúl Santamaría González", "PP"),
    ("Manuel Santos Costa", "PP"),
    ("Cristina Sanz Arias", "PP"),
    ("Iago Suárez Fernández", "BNG"),
    ("Iago Tabarés Pérez-Piñeiro", "BNG"),
    ("Iria Taibo Corsanego", "BNG"),
    ("Gonzalo Trenor López", "PP"),
    ("Montserrat Valcarcel Armesto", "BNG"),
    ("Katherinie Varela Fernández", "PP"),
    ("Borja Verea Fraiz", "PP"),
    ("Ethel María Vázquez Mourelle", "PP"),
    ("Cecilia Vázquez Suárez", "PP"),
    ("Sonia Vidal Lamas", "BNG"),
    ("Miguel Ángel Viso Diéguez", "PP"),
]


# ─────────────────────────────────────────────────────────────────────────────
# CANTABRIA · XI Legislatura · 35 diputados · Wikipedia + prensa
# REEMPLAZA los 30 mangled del CCAA parser
# ─────────────────────────────────────────────────────────────────────────────

CANTABRIA = [
    # PP (15)
    ("María José Sáenz de Buruaga", "PP"),
    ("Gema Igual Ortiz", "PP"),
    ("Juan José Alonso Venero", "PP"),
    ("Carlos Alberto Caramés Luengo", "PP"),
    ("María José González Revuelta", "PP"),
    ("Íñigo Fernández García", "PP"),
    ("María Jesús Susinos Tarrero", "PP"),
    ("Roberto Mena Sáinz", "PP"),
    ("Miguel Ángel Vargas San Emeterio", "PP"),
    ("María Isabel Urrutia de los Mozos", "PP"),
    ("Alejandro Liz Cacho", "PP"),
    ("Tamara González Sanz", "PP"),
    ("Cándido Manuel Cobo Fernández", "PP"),
    ("María Belén Ceballos de la Herrán", "PP"),
    ("Álvaro Aguirre Perales", "PP"),
    # PRC (8)
    ("Miguel Ángel Revilla Roiz", "PRC"),
    ("Paula Fernández Viaña", "PRC"),
    ("Francisco Javier López Marcano", "PRC"),
    ("Guillermo Blanco Gómez", "PRC"),
    ("Rosa Inés Díaz Tezanos", "PRC"),
    ("Pedro Hernando García", "PRC"),
    ("Javier López Estrada", "PRC"),
    ("Teresa Noceda Llano", "PRC"),
    # PSOE (8)
    ("Pablo Zuloaga Martínez", "PSOE"),
    ("Noelia Cobo Pérez", "PSOE"),
    ("Joaquín Gómez Gómez", "PSOE"),
    ("Eugenia Gómez de Diego", "PSOE"),
    ("Raúl Pesquera Cabezas", "PSOE"),
    ("Ana Belén Álvarez Fernández", "PSOE"),
    ("Mario Iglesias Manzanedo", "PSOE"),
    ("Eva Salmón Calva", "PSOE"),
    # VOX (4)
    ("Leticia Díaz Rodríguez", "VOX"),
    ("Cristóbal Palacio Ruiz", "VOX"),
    ("Armando Blanco Torcida", "VOX"),
    ("Natividad Pérez García", "VOX"),
]


# ─────────────────────────────────────────────────────────────────────────────
# CEUTA · XI Legislatura · 25 diputados · ElFaro de Ceuta + Wikipedia
# Los 14 del CCAA quedarán deduplicados; solo se añadirán los 11 nuevos.
# ─────────────────────────────────────────────────────────────────────────────

CEUTA = [
    # PP (9)
    ("Juan Jesús Vivas Lara", "PP"),
    ("Alejandro Ramírez Hurtado", "PP"),
    ("Kissy Chandiramani Ramesh", "PP"),
    ("Faisal Hamed Ahmed", "PP"),
    ("Pilar Orozco Valverde", "PP"),
    ("Rafael Martínez Peñalver Mateos", "PP"),
    ("Alberto Ramón Gaitán Rodríguez", "PP"),
    ("Nabila Benzima Pavón", "PP"),
    ("Nicola Cecchi Bissoni", "PP"),
    # PSOE (6)
    ("Juan Gutiérrez Segura", "PSOE"),
    ("Cristina Pérez Anido", "PSOE"),
    ("Navil Rahal Erhimou", "PSOE"),
    ("Hanan Ahmed Mohamed", "PSOE"),
    ("Sebastián Guerrero Roldán", "PSOE"),
    ("Hikma Mohamed Ahmed", "PSOE"),
    # VOX (5)
    ("Juan Sergio Redondo Pacheco", "VOX"),
    ("Carlos Verdejo Rodríguez", "VOX"),
    ("Francisco Javier Ruiz Llorente", "VOX"),
    ("Ana Belén Cifuentes Carbonell", "VOX"),
    ("María Teresa López Belmonte", "VOX"),
    # MDyC (3)
    ("Fatima Hamed Hossain", "MDyC"),
    ("Abdelkader Abdeselam Liasid", "MDyC"),
    ("Nadia Mohamed Abdel Lah", "MDyC"),
    # Ceuta Ya! (2)
    ("Mohamed Mustafa Ahmed", "Ceuta Ya!"),
    ("Julia Alejandra Ferreras Guerra", "Ceuta Ya!"),
]


# ─────────────────────────────────────────────────────────────────────────────
# EXTREMADURA · XII Legislatura · 65 diputados · Asamblea de Extremadura
# Las 32 ya cargadas del CCAA serán deduplicadas por slug.
# ─────────────────────────────────────────────────────────────────────────────

EXTREMADURA = [
    # PP (29) · Grupo Parlamentario Popular
    ("María Guardiola Martín", "PP"),
    ("Abel Bautista Morán", "PP"),
    ("María Teresa Tortonda Gordillo", "PP"),
    ("José Ángel Sánchez Julià", "PP"),
    ("Margarita Núñez Sánchez", "PP"),
    ("Juan Luis Rodríguez Campos", "PP"),
    ("María Victoria Bazaga Gazapo", "PP"),
    ("Pedro Pablo González Merino", "PP"),
    ("Manuel Martín Castizo", "PP"),
    ("María Mercedes Vaquera Mosquero", "PP"),
    ("María Isabel Babiano Serrano", "PP"),
    ("Isabel María Blanco González", "PP"),
    ("Kini Carrasco Ávila", "PP"),
    ("Isabel Cortés Gervilla", "PP"),
    ("Agustín Delgado Donoso", "PP"),
    ("Luisa María Durán Pagador", "PP"),
    ("Domingo Jesús Expósito Rubio", "PP"),
    ("Javier García Argueta", "PP"),
    ("José Manuel García Ballestero", "PP"),
    ("María del Pilar Gómez de Tejada Díaz", "PP"),
    ("Olivia Labrador Recio", "PP"),
    ("Nélida Martín Hernández", "PP"),
    ("Manuel Naharro Gata", "PP"),
    ("Miguel Ángel Nieto Durán", "PP"),
    ("Hipólito Pacheco Delgado", "PP"),
    ("Susana Rodríguez Sánchez", "PP"),
    ("Zulema Romero Sanz", "PP"),
    ("Isabel Sánchez Torremocha", "PP"),
    ("Bibiano Serrano Calurano", "PP"),
    # PSOE (18) · Grupo Parlamentario Socialista
    ("Álvaro Sánchez Cotrina", "PSOE"),
    ("Lara Garlito Batalla", "PSOE"),
    ("Justa Núñez Chaparro", "PSOE"),
    ("Julio César Rodríguez González", "PSOE"),
    ("Blanca Martín Delgado", "PSOE"),
    ("María Isabel Gil Rosiña", "PSOE"),
    ("Aitor Vaquerizo Morales", "PSOE"),
    ("María Piedad Álvarez Cortés", "PSOE"),
    ("Eduardo Béjar Martín", "PSOE"),
    ("Alfonso Beltrán Muñoz", "PSOE"),
    ("María Curiel Muñoz", "PSOE"),
    ("Juan Ramón Ferreira Alonso", "PSOE"),
    ("Silvia González Chaves", "PSOE"),
    ("Raquel Medina Nuevo", "PSOE"),
    ("Manuel Mejías Tapia", "PSOE"),
    ("Judit Olivares Muñoz", "PSOE"),
    ("Gonzalo Romero Barba", "PSOE"),
    ("Soraya Vega Prieto", "PSOE"),
    # VOX (11) · Grupo Parlamentario VOX Extremadura
    ("Óscar Arturo Fernández Calle", "VOX"),
    ("Javier Bravo Arrobas", "VOX"),
    ("Inés Checa Mallebrera", "VOX"),
    ("Ángel Pelayo Gordillo Moreno", "VOX"),
    ("Álvaro Luis Sánchez-Ocaña Vara", "VOX"),
    ("Alfredo Ángel Galavis Melara", "VOX"),
    ("Eva María García Alegre", "VOX"),
    ("Juan José García García", "VOX"),
    ("Marta Gervasia Garrido Moreno", "VOX"),
    ("Beatriz Muñoz Rodríguez", "VOX"),
    ("María Jesús Salvatierra Gordillo", "VOX"),
    # Unidas por Extremadura (7)
    ("Irene de Miguel Pérez", "Unidas por Extremadura"),
    ("José Antonio González Frutos", "Unidas por Extremadura"),
    ("Nerea Fernández Cordero", "Unidas por Extremadura"),
    ("David Araújo Gómez", "Unidas por Extremadura"),
    ("José Francisco Llera Cáceres", "Unidas por Extremadura"),
    ("Juan Alessandro Schirinzi Pareés", "Unidas por Extremadura"),
    ("Alba Soto Hortet", "Unidas por Extremadura"),
]


# ─────────────────────────────────────────────────────────────────────────────
# MELILLA · XI Legislatura · 25 diputados · BOME + Wikipedia + prensa local
# ─────────────────────────────────────────────────────────────────────────────

MELILLA = [
    # PP (14) · lista completa BOME / elFaro de Melilla
    ("Juan José Imbroda Ortiz", "PP"),
    ("Miguel Marín Cobos", "PP"),
    ("Manuel Ángel Quevedo Mateos", "PP"),
    ("Sofía Acedo Reyes", "PP"),
    ("Fadela Mohatar Maanan", "PP"),
    ("Daniel Conesa Mínguez", "PP"),
    ("Marta Victoria Fernández de Castro Ruiz", "PP"),
    ("Fadwa Abdelhadj Benlafki", "PP"),
    ("Isabel María Moreno Mohamed", "PP"),
    ("Miguel Ángel Fernández Bonnemáison", "PP"),
    ("Nasera Al-Lal Mohamed", "PP"),
    ("Daniel Ventura Rizo", "PP"),
    ("Francisco Villena Hernández", "PP"),
    ("Randa Mohamed El Aouia", "PP"),
    # CpM (5)
    ("Dunia Almansouri Umpiérrez", "CpM"),
    ("Rachid Bussian Mohamed", "CpM"),
    ("Mohamed Al-Lal", "CpM"),
    ("Fatima Mohamed Kaddur", "CpM"),
    ("Emilio Guerra Almansa", "CpM"),
    # PSOE (3)
    ("Gloria Rojas Ruiz", "PSOE"),
    ("Riduan Mohamed Abdelkader", "PSOE"),
    ("Mohamed Mohamed Mohand", "PSOE"),
    # VOX (2)
    ("José Miguel Tasende Souto", "VOX"),
    ("Javier Da Costa Solís", "VOX"),
    # Somos Melilla (1)
    ("Amin Azmani Mohamed", "Somos Melilla"),
]


# ─────────────────────────────────────────────────────────────────────────────
# Bloques de salida
# ─────────────────────────────────────────────────────────────────────────────

BLOQUES = [
    ("navarra", NAVARRA,
     {"cargo": "Parlamentario/a",
      "parlamento": "Parlamento de Navarra",
      "legislatura": "XI Legislatura",
      "slug_suffix": "navarra",
      "num_base": 4000}),
    ("cyl", CYL,
     {"cargo": "Procurador/a",
      "parlamento": "Cortes de Castilla y León",
      "legislatura": "XI Legislatura",
      "slug_suffix": "cyl",
      "num_base": 4100}),
    ("clm", CLM,
     {"cargo": "Diputado/a",
      "parlamento": "Cortes de Castilla-La Mancha",
      "legislatura": "XI Legislatura",
      "slug_suffix": "clm",
      "num_base": 4300}),
    ("galicia", GALICIA,
     {"cargo": "Diputado/a",
      "parlamento": "Parlamento de Galicia",
      "legislatura": "XII Legislatura",
      "slug_suffix": "galicia",
      "num_base": 4400}),
    ("cantabria_completo", CANTABRIA,
     {"cargo": "Diputado/a",
      "parlamento": "Parlamento de Cantabria",
      "legislatura": "XI Legislatura",
      "slug_suffix": "cantabria",
      "num_base": 4500}),
    ("ceuta_completo", CEUTA,
     {"cargo": "Diputado/a",
      "parlamento": "Asamblea de Ceuta",
      "legislatura": "XI Legislatura",
      "slug_suffix": "ceuta",
      "num_base": 4600}),
    ("extremadura_completo", EXTREMADURA,
     {"cargo": "Diputado/a",
      "parlamento": "Asamblea de Extremadura",
      "legislatura": "XII Legislatura",
      "slug_suffix": "extremadura",
      "num_base": 4700}),
    ("melilla", MELILLA,
     {"cargo": "Diputado/a",
      "parlamento": "Asamblea de Melilla",
      "legislatura": "XI Legislatura",
      "slug_suffix": "melilla",
      "num_base": 4800}),
]


def filter_completed_from_ccaa():
    """Elimina las CCAA que ahora se reemplazan con la versión completa de
    fuente periodística (Wikipedia · sitio oficial). Mantiene las CCAA que
    seguimos sin tener completas. In-place."""
    p = Path("/tmp/dosieres_ccaa.json")
    if not p.exists():
        print(f"⚠ {p} no existe, skip filter CCAA", file=sys.stderr)
        return
    data = json.loads(p.read_text(encoding="utf-8"))
    before = len(data)
    # Marcadores que identifican el parlamento en cargo_actual
    REEMPLAZAR = ("cantabria", "ceuta", "extremadura")
    filtered = []
    contado = {k: 0 for k in REEMPLAZAR}
    for d in data:
        cargo = (d.get("cargo_actual") or "").lower()
        matched = next((k for k in REEMPLAZAR if k in cargo), None)
        if matched:
            contado[matched] += 1
            continue
        filtered.append(d)
    removed = before - len(filtered)
    if removed > 0:
        p.write_text(json.dumps(filtered, ensure_ascii=False, indent=2), encoding="utf-8")
        msg = ", ".join(f"{k}={n}" for k, n in contado.items() if n > 0)
        print(f"✓ {p.name}: eliminadas {removed} entradas reemplazables "
              f"({msg}) · {before} → {len(filtered)}", file=sys.stderr)


def main():
    filter_completed_from_ccaa()

    salida_dir = Path("/tmp")
    total = 0
    for nombre_bloque, lista, conf in BLOQUES:
        dosieres = []
        seen = set()
        for i, (nombre, partido) in enumerate(lista):
            # Normalizar nombres con coma (apellidos, nombre)
            nombre = normaliza_apellidos_nombre(nombre)
            slug_base = slugify(nombre)
            suffix = conf["slug_suffix"]
            slug = f"{slug_base}-{suffix}"
            attempt = 0
            while slug in seen:
                attempt += 1
                slug = f"{slug_base}-{suffix}-{attempt}"
            seen.add(slug)
            ficha = make_ficha(
                nombre=nombre,
                partido=partido,
                cargo=conf["cargo"],
                parlamento=conf["parlamento"],
                legislatura=conf["legislatura"],
                slug_suffix=suffix,
                num=conf["num_base"] + i,
            )
            ficha["slug"] = slug
            dosieres.append(ficha)
        out = salida_dir / f"dosieres_{nombre_bloque}.json"
        out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✓ {nombre_bloque:24s} {len(dosieres):3d} fichas → {out}", file=sys.stderr)
        total += len(dosieres)
    print(f"\nTOTAL bloques generados: {total} fichas (algunas se deduplicarán al combinar)", file=sys.stderr)


if __name__ == "__main__":
    main()
