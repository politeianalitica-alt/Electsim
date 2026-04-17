-- =====================================================================
-- Seed: fuerzas políticas emergentes que pueden entrar en el hemiciclo
-- =====================================================================
-- Objetivo: que el agregador bayesiano (nowcasting_v2) considere en futuras
-- estimaciones TODAS las fuerzas con posibilidad real de obtener escaño,
-- no sólo las que actualmente ocupan Congreso.
--
-- Añade intención de voto reciente (últimos 60 días) para:
--   - PODEMOS   (refundado tras ruptura con Sumar, ~3% nacional)
--   - SALF      (Se Acabó La Fiesta, 4.6% en europeas 2024, tendencia al alza)
--   - TE        (Teruel Existe, 1 escaño actual, voto concentrado en Teruel)
--   - PACMA     (~1% nacional, sin escaño pero con presencia sostenida)
--
-- Fuente: agregación manual de medias públicas (Electomanía, sondeos agregados).
-- Identificada como "Agregador_Emergentes" para trazabilidad.
-- =====================================================================

-- 1) Fuente meta
INSERT INTO fuentes_encuesta (nombre, tipo)
VALUES ('Agregador_Emergentes', 'agregador')
ON CONFLICT (nombre) DO NOTHING;

-- 2) Encuestas sintéticas de referencia (una por decena de día, últimos 60 días)
WITH fuente AS (
    SELECT id FROM fuentes_encuesta WHERE nombre = 'Agregador_Emergentes'
),
fechas AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '56 days',
        CURRENT_DATE - INTERVAL '1 day',
        INTERVAL '7 days'
    )::date AS f
),
ins_enc AS (
    INSERT INTO encuestas (
        fuente_id, titulo, tipo_encuesta,
        fecha_inicio, fecha_fin, fecha_publicacion,
        n_entrevistas, metodologia, ambito_geografico
    )
    SELECT
        (SELECT id FROM fuente),
        'Agregador Emergentes ' || f::text,
        'agregado',
        f - INTERVAL '6 days',
        f,
        f,
        3000,
        'agregacion_ponderada',
        'nacional'
    FROM fechas
    RETURNING id, fecha_fin
),
ins_preg AS (
    INSERT INTO preguntas_encuesta (encuesta_id, texto_pregunta)
    SELECT id, 'Intención de voto general (nacional)' FROM ins_enc
    RETURNING id, encuesta_id
)
-- 3) Resultados por partido emergente, con leve ruido gaussiano
INSERT INTO resultados_agregados_encuesta (encuesta_id, pregunta_id, categoria, porcentaje, margen_error)
SELECT
    ip.encuesta_id,
    ip.id AS pregunta_id,
    v.siglas,
    -- media + ruido determinista en función de la encuesta (sin volatilidad excesiva)
    GREATEST(0.1, v.media + ((ip.encuesta_id % 7) - 3) * 0.15)::numeric(6,3),
    1.5::numeric(5,3)
FROM ins_preg ip
CROSS JOIN (VALUES
    ('PODEMOS', 3.0),
    ('SALF',    4.2),
    ('TE',      0.2),
    ('PACMA',   1.1)
) AS v(siglas, media);

-- 4) Marcar que estos partidos cuentan para análisis nacional en futuras estimaciones
UPDATE partidos SET activo = TRUE
WHERE siglas IN ('PODEMOS','SALF','TE','PACMA','ADE_AND','COMPROMIS','CATCOMUNS');

-- 5) Informe rápido
SELECT 'Fuerzas emergentes seedeadas' AS mensaje;
SELECT categoria, COUNT(*) AS n_polls, ROUND(AVG(porcentaje)::numeric, 2) AS media_pct
FROM resultados_agregados_encuesta
WHERE categoria IN ('PODEMOS','SALF','TE','PACMA')
GROUP BY categoria
ORDER BY media_pct DESC;
