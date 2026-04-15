-- Referencia mínima: CCAA (códigos INE), fuente CIS y partidos nacionales frecuentes.
-- Ampliar con municipios/provincias desde INE en ETL posterior.

INSERT INTO comunidades_autonomas (codigo_ine, nombre, capital) VALUES
('01', 'Andalucía', 'Sevilla'),
('02', 'Aragón', 'Zaragoza'),
('03', 'Principado de Asturias', 'Oviedo'),
('04', 'Illes Balears', 'Palma'),
('05', 'Canarias', 'Las Palmas de Gran Canaria / Santa Cruz de Tenerife'),
('06', 'Cantabria', 'Santander'),
('07', 'Castilla y León', 'Valladolid'),
('08', 'Castilla-La Mancha', 'Toledo'),
('09', 'Cataluña', 'Barcelona'),
('10', 'Comunitat Valenciana', 'Valencia'),
('11', 'Extremadura', 'Mérida'),
('12', 'Galicia', 'Santiago de Compostela'),
('13', 'Comunidad de Madrid', 'Madrid'),
('14', 'Región de Murcia', 'Murcia'),
('15', 'Comunidad Foral de Navarra', 'Pamplona'),
('16', 'País Vasco', 'Vitoria-Gasteiz'),
('17', 'La Rioja', 'Logroño'),
('18', 'Ceuta', 'Ceuta'),
('19', 'Melilla', 'Melilla')
ON CONFLICT (codigo_ine) DO NOTHING;

INSERT INTO fuentes_encuesta (nombre, tipo, pais, web, descripcion)
SELECT 'CIS', 'publico', 'ESP', 'https://www.cis.es',
       'Centro de Investigaciones Sociológicas — barómetros y estudios ad hoc'
WHERE NOT EXISTS (SELECT 1 FROM fuentes_encuesta WHERE nombre = 'CIS');

-- fuentes_encuesta no tiene UNIQUE en nombre — evitar duplicados manualmente en ETL.
-- Partidos: catálogo inicial (ajustar en ingesta real).
INSERT INTO partidos (siglas, nombre_completo, ideologia, ambito) VALUES
('PSOE', 'Partido Socialista Obrero Español', 'centroizquierda', 'nacional'),
('PP', 'Partido Popular', 'centroderecha', 'nacional'),
('VOX', 'VOX', 'derecha', 'nacional'),
('SUMAR', 'Sumar', 'izquierda', 'nacional'),
('CS', 'Ciudadanos', 'centro', 'nacional'),
('ERC', 'Esquerra Republicana de Catalunya', 'nacionalista', 'autonomico'),
('JUNTS', 'Junts per Catalunya', 'nacionalista', 'autonomico'),
('PNV', 'Euzko Alderdi Jeltzalea - Partido Nacionalista Vasco', 'nacionalista', 'autonomico'),
('BNG', 'Bloque Nacionalista Galego', 'nacionalista', 'autonomico')
ON CONFLICT (siglas) DO NOTHING;
