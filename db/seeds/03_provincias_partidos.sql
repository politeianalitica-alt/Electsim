-- =============================================================================
-- SEED 03: Provincias (52) y catálogo completo de partidos
-- Datos reales: INE (provincias), Ministerio del Interior (partidos históricos)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROVINCIAS — 52 provincias con referencias a CCAA por codigo_ine
-- Incluye superficie km² real (INE 2023) y escaños al Congreso
-- -----------------------------------------------------------------------------
INSERT INTO provincias (codigo_ine, nombre, ccaa_id, capital, superficie_km2, escanos_congreso)
SELECT p.codigo_ine, p.nombre, ca.id, p.capital, p.superficie_km2, p.escanos_congreso
FROM (VALUES
    ('01','Álava',                      '16','Vitoria-Gasteiz',            3037.34, 4),
    ('02','Albacete',                   '08','Albacete',                  14926.00, 4),
    ('03','Alicante/Alacant',           '10','Alicante',                   5816.50,12),
    ('04','Almería',                    '01','Almería',                    8775.00, 6),
    ('05','Ávila',                      '07','Ávila',                      8050.20, 4),
    ('06','Badajoz',                    '11','Badajoz',                   21766.00, 6),
    ('07','Balears, Illes',             '04','Palma',                      4992.10, 8),
    ('08','Barcelona',                  '09','Barcelona',                  7726.30,32),
    ('09','Burgos',                     '07','Burgos',                    14292.00, 4),
    ('10','Cáceres',                    '11','Cáceres',                   19945.00, 4),
    ('11','Cádiz',                      '01','Cádiz',                      7436.00, 9),
    ('12','Castellón/Castelló',         '10','Castellón de la Plana',      6632.00, 5),
    ('13','Ciudad Real',                '08','Ciudad Real',               19813.00, 5),
    ('14','Córdoba',                    '01','Córdoba',                   13769.00, 6),
    ('15','Coruña, A',                  '12','A Coruña',                   7950.00, 8),
    ('16','Cuenca',                     '08','Cuenca',                    17141.00, 3),
    ('17','Girona',                     '09','Girona',                     5909.80, 6),
    ('18','Granada',                    '01','Granada',                   12647.00, 7),
    ('19','Guadalajara',                '08','Guadalajara',               12190.00, 3),
    ('20','Gipuzkoa',                   '16','San Sebastián / Donostia',   1980.40, 6),
    ('21','Huelva',                     '01','Huelva',                    10148.00, 5),
    ('22','Huesca',                     '02','Huesca',                    15636.00, 3),
    ('23','Jaén',                       '01','Jaén',                      13496.00, 5),
    ('24','León',                       '07','León',                      15580.00, 4),
    ('25','Lleida',                     '09','Lleida',                    12172.00, 4),
    ('26','Rioja, La',                  '17','Logroño',                    5045.30, 4),
    ('27','Lugo',                       '12','Lugo',                       9856.50, 4),
    ('28','Madrid',                     '13','Madrid',                     8028.00,37),
    ('29','Málaga',                     '01','Málaga',                     7306.20,11),
    ('30','Murcia',                     '14','Murcia',                    11313.00,10),
    ('31','Navarra',                    '15','Pamplona/Iruña',            10391.00, 5),
    ('32','Ourense',                    '12','Ourense',                    7273.00, 4),
    ('33','Asturias',                   '03','Oviedo',                    10603.00, 8),
    ('34','Palencia',                   '07','Palencia',                   8052.60, 3),
    ('35','Palmas, Las',                '05','Las Palmas de Gran Canaria', 4065.80, 8),
    ('36','Pontevedra',                 '12','Pontevedra',                 4495.10, 8),
    ('37','Salamanca',                  '07','Salamanca',                 12349.00, 4),
    ('38','Santa Cruz de Tenerife',     '05','Santa Cruz de Tenerife',     3381.60, 7),
    ('39','Cantabria',                  '06','Santander',                  5321.60, 5),
    ('40','Segovia',                    '07','Segovia',                    6920.10, 3),
    ('41','Sevilla',                    '01','Sevilla',                   14036.00,12),
    ('42','Soria',                      '07','Soria',                     10306.00, 2),
    ('43','Tarragona',                  '09','Tarragona',                  6303.30, 6),
    ('44','Teruel',                     '02','Teruel',                    14809.00, 3),
    ('45','Toledo',                     '08','Toledo',                    15368.00, 6),
    ('46','Valencia/València',          '10','Valencia',                  10763.00,16),
    ('47','Valladolid',                 '07','Valladolid',                 8110.50, 5),
    ('48','Bizkaia',                    '16','Bilbao',                     2217.10, 8),
    ('49','Zamora',                     '07','Zamora',                    10561.00, 3),
    ('50','Zaragoza',                   '02','Zaragoza',                  17274.00, 7),
    ('51','Ceuta',                      '18','Ceuta',                        18.50, 1),
    ('52','Melilla',                    '19','Melilla',                      12.30, 1)
) AS p(codigo_ine, nombre, ccaa_ine, capital, superficie_km2, escanos_congreso)
JOIN comunidades_autonomas ca ON ca.codigo_ine = p.ccaa_ine
ON CONFLICT (codigo_ine) DO UPDATE SET
    ccaa_id          = EXCLUDED.ccaa_id,
    capital          = EXCLUDED.capital,
    superficie_km2   = EXCLUDED.superficie_km2,
    escanos_congreso = EXCLUDED.escanos_congreso;


-- -----------------------------------------------------------------------------
-- PARTIDOS — Catálogo histórico completo con posicionamiento ideológico real
-- Escala eje_izda_dcha: 1 (extrema izq) → 10 (extrema dch)
-- Escala eje_libertario_autoritario: 1 (libertario) → 10 (autoritario)
-- Fuente: Chapel Hill Expert Survey (CHES) + CIS Barómetro estudios 3340/3431
-- -----------------------------------------------------------------------------
INSERT INTO partidos (siglas, nombre_completo, ideologia, eje_izda_dcha, eje_libertario_autoritario, fundacion_año, activo, ambito) VALUES
-- Partidos nacionales actuales
('PSOE',       'Partido Socialista Obrero Español',          'centroizquierda',  4.2, 4.5, 1879, TRUE,  'nacional'),
('PP',         'Partido Popular',                            'centroderecha',    7.1, 6.5, 1977, TRUE,  'nacional'),
('VOX',        'VOX',                                        'derecha',          9.2, 8.8, 2013, TRUE,  'nacional'),
('SUMAR',      'Sumar',                                      'izquierda',        2.8, 3.0, 2023, TRUE,  'nacional'),
('CS',         'Ciudadanos',                                 'centroderecha',    5.5, 5.0, 2006, FALSE, 'nacional'),
-- Partidos nacionales históricos
('IU',         'Izquierda Unida',                            'izquierda',        2.2, 3.5, 1986, FALSE, 'nacional'),
('PODEMOS',    'Podemos',                                    'izquierda',        2.5, 2.8, 2014, FALSE, 'nacional'),
('UP',         'Unidos Podemos',                             'izquierda',        2.4, 3.0, 2016, FALSE, 'nacional'),
('UPyD',       'Unión Progreso y Democracia',               'centro',           5.2, 4.8, 2007, FALSE, 'nacional'),
('AP',         'Alianza Popular',                            'derecha',          8.5, 7.8, 1976, FALSE, 'nacional'),
('UCD',        'Unión de Centro Democrático',               'centroderecha',    6.0, 5.5, 1977, FALSE, 'nacional'),
('PCE',        'Partido Comunista de España',               'extremaizquierda', 1.5, 3.2, 1920, TRUE,  'nacional'),
('MAS_PAIS',   'Más País',                                   'izquierda',        3.0, 2.5, 2019, TRUE,  'nacional'),
-- Partidos catalanes
('ERC',        'Esquerra Republicana de Catalunya',          'nacionalista',     3.5, 3.8, 1931, TRUE,  'autonomico'),
('JUNTS',      'Junts per Catalunya',                        'nacionalista',     5.5, 5.0, 2017, TRUE,  'autonomico'),
('CIU',        'Convergència i Unió',                       'nacionalista',     6.5, 5.5, 1978, FALSE, 'autonomico'),
('CDC',        'Convergència Democràtica de Catalunya',     'nacionalista',     6.2, 5.2, 1974, FALSE, 'autonomico'),
('PSC',        'Partit dels Socialistes de Catalunya',      'centroizquierda',  4.0, 4.0, 1978, TRUE,  'autonomico'),
('CATCOMUNS',  'En Comú Podem',                             'izquierda',        2.5, 3.0, 2015, TRUE,  'autonomico'),
('CUP',        'Candidatura d Unitat Popular',              'extremaizquierda', 1.8, 2.5, 2003, TRUE,  'autonomico'),
-- Partidos vascos
('PNV',        'Euzko Alderdi Jeltzalea - PNV',             'nacionalista',     5.8, 5.2, 1895, TRUE,  'autonomico'),
('EH_BILDU',   'EH Bildu',                                  'nacionalista',     2.0, 3.0, 2011, TRUE,  'autonomico'),
('AMAIUR',     'Amaiur',                                    'nacionalista',     1.8, 2.8, 2011, FALSE, 'autonomico'),
('HB',         'Herri Batasuna',                            'nacionalista',     1.5, 2.5, 1978, FALSE, 'autonomico'),
('EA',         'Eusko Alkartasuna',                         'nacionalista',     4.0, 4.0, 1986, FALSE, 'autonomico'),
-- Partidos gallegos
('BNG',        'Bloque Nacionalista Galego',                'nacionalista',     3.0, 3.5, 1982, TRUE,  'autonomico'),
-- Partidos andaluces/regionales
('PA',         'Partido Andalucista',                       'regionalista',     4.5, 4.5, 1965, FALSE, 'autonomico'),
('POR_AN',     'Por Andalucía',                             'izquierda',        3.0, 3.0, 2022, TRUE,  'autonomico'),
-- Canarias
('CC',         'Coalición Canaria - PNC',                   'regionalista',     5.5, 5.0, 1993, TRUE,  'autonomico'),
('NC',         'Nueva Canarias',                            'regionalista',     4.0, 3.8, 2005, TRUE,  'autonomico'),
-- Asturias
('FAC',        'Foro Asturias',                             'centroderecha',    6.8, 6.0, 2011, FALSE, 'autonomico'),
-- Cantabria
('PRC',        'Partido Regionalista de Cantabria',        'regionalista',     5.5, 5.0, 1978, TRUE,  'autonomico'),
-- Navarra
('UPN',        'Unión del Pueblo Navarro',                  'centroderecha',    7.0, 6.5, 1979, TRUE,  'autonomico'),
('NA_SUMA',    'Navarra Suma',                              'centroderecha',    7.2, 6.8, 2019, TRUE,  'autonomico'),
-- Valencia
('COMPROMIS',  'Compromís',                                 'centroizquierda',  4.0, 3.5, 2009, TRUE,  'autonomico'),
-- Aragón
('PAR',        'Partido Aragonés',                          'regionalista',     5.5, 5.0, 1977, TRUE,  'autonomico'),
('CHA',        'Chunta Aragonesista',                       'izquierda',        3.5, 3.5, 1986, TRUE,  'autonomico'),
-- Otros nacionales
('PACMA',      'Partido Animalista Contra el Maltrato Animal','izquierda',      3.5, 3.0, 2003, TRUE,  'nacional'),
('PRIMAVERA',  'Primavera Europea',                         'centroizquierda',  4.0, 3.0, 2014, FALSE, 'nacional')
ON CONFLICT (siglas) DO UPDATE SET
    nombre_completo            = EXCLUDED.nombre_completo,
    ideologia                  = EXCLUDED.ideologia,
    eje_izda_dcha              = EXCLUDED.eje_izda_dcha,
    eje_libertario_autoritario = EXCLUDED.eje_libertario_autoritario,
    fundacion_año              = EXCLUDED.fundacion_año,
    activo                     = EXCLUDED.activo,
    ambito                     = EXCLUDED.ambito;


-- -----------------------------------------------------------------------------
-- RELACIONES ENTRE PARTIDOS (fusiones, sucesiones, escisiones)
-- -----------------------------------------------------------------------------
INSERT INTO relaciones_partidos (partido_origen, partido_destino, tipo_relacion, fecha_inicio, fecha_fin, descripcion)
SELECT po.id, pd.id, rel.tipo, rel.fi::DATE, rel.ff::DATE, rel.descripcion
FROM (VALUES
    ('AP',      'PP',       'sucesion',    '1989-01-01', NULL,         'El PP surge de la refundación de AP con democratacristianos y liberales'),
    ('PODEMOS', 'UP',       'fusion',      '2016-05-01', '2019-04-28', 'Unidos Podemos: alianza electoral Podemos + IU + EQUO'),
    ('UP',      'SUMAR',    'sucesion',    '2023-01-01', NULL,         'SUMAR integra a UP, IU, Más País y otras fuerzas de izquierda'),
    ('IU',      'SUMAR',    'integracion', '2023-01-01', NULL,         'IU se integra en la coalición SUMAR'),
    ('MAS_PAIS','SUMAR',    'integracion', '2023-01-01', NULL,         'Más País se incorpora a SUMAR'),
    ('CIU',     'CDC',      'escision',    '2015-07-17', NULL,         'CiU se disuelve. CDC continua en solitario como movimiento soberanista'),
    ('CDC',     'JUNTS',    'sucesion',    '2017-10-01', NULL,         'CDC evoluciona hacia JxCat/JUNTS tras el Procés'),
    ('HB',      'AMAIUR',   'sucesion',    '2011-01-01', '2015-12-20', 'Amaiur: coalicion sucesora de la izquierda abertzale legalizada'),
    ('AMAIUR',  'EH_BILDU', 'fusion',      '2012-01-01', NULL,         'EH Bildu consolida la izquierda abertzale: EA + Aralar + Alternatiba + Sortu'),
    ('UCD',     'AP',       'escision',    '1983-01-01', NULL,         'Tras la disolucion de UCD, muchos cuadros se integran en AP/PP')
) AS rel(sigla_o, sigla_d, tipo, fi, ff, descripcion)
JOIN partidos po ON po.siglas = rel.sigla_o
JOIN partidos pd ON pd.siglas = rel.sigla_d
ON CONFLICT DO NOTHING;
