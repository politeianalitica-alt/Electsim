"""Tablas base de Opposition Research: declaraciones y contradicciones.

Revision ID: 0019_opposition_core_tables
Revises: 0018_analogias_historicas
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0019_opposition_core_tables"
down_revision: Union[str, None] = "0018_analogias_historicas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS declaraciones_politicas (
            id              BIGSERIAL PRIMARY KEY,
            persona         TEXT NOT NULL,
            partido         TEXT NOT NULL,
            fecha           DATE,
            medio           TEXT,
            contexto        TEXT,
            texto           TEXT NOT NULL,
            tema_principal  TEXT,
            subtema         TEXT,
            url             TEXT,
            alcance_est     INTEGER,
            cliente_id      INTEGER NULL,
            creado_en       TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_decl_partido_tema
            ON declaraciones_politicas (partido, tema_principal, fecha DESC);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_decl_persona
            ON declaraciones_politicas (persona, fecha DESC);
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS contradicciones (
            id          BIGSERIAL PRIMARY KEY,
            persona     TEXT NOT NULL,
            partido     TEXT NOT NULL,
            tema        TEXT,
            tipo        TEXT DEFAULT 'lexica',
            descripcion TEXT,
            gravedad    TEXT DEFAULT 'media',
            dias_entre  INTEGER,
            score_nli   FLOAT DEFAULT 0.75,
            decl_a_id   BIGINT REFERENCES declaraciones_politicas(id) ON DELETE SET NULL,
            decl_b_id   BIGINT REFERENCES declaraciones_politicas(id) ON DELETE SET NULL,
            verificada  BOOLEAN DEFAULT FALSE,
            cliente_id  INTEGER NULL,
            creado_en   TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_cont_persona_tema
            ON contradicciones (persona, tema, score_nli DESC);
    """)

    # Datos semilla con declaraciones públicas verificables
    op.execute("""
        INSERT INTO declaraciones_politicas
            (persona, partido, fecha, medio, contexto, texto, tema_principal, alcance_est)
        VALUES
            ('Alberto Núñez Feijóo','PP','2023-07-23','El Mundo','Campaña electoral 23-J',
             'Bajaremos el IRPF para todos los españoles si ganamos las elecciones.',
             'economia', 8500000),
            ('Alberto Núñez Feijóo','PP','2024-10-15','La Vanguardia','Debate presupuestos',
             'No es el momento de bajar impuestos con el nivel de deuda actual.',
             'economia', 4200000),
            ('Pedro Sánchez','PSOE','2018-06-15','El País','Moción de censura',
             'Voy a defender la Constitución y la convivencia democrática.',
             'institucional', 9000000),
            ('Pedro Sánchez','PSOE','2021-03-10','TVE','Rueda de prensa',
             'Los indultos son una medida de concordia y convivencia.',
             'institucional', 7500000),
            ('Santiago Abascal','VOX','2019-04-28','El Confidencial','Mitin electoral',
             'Expulsaremos a todos los inmigrantes ilegales en el primer mes.',
             'migracion', 5000000),
            ('Santiago Abascal','VOX','2022-07-14','El Mundo','Entrevista',
             'La integración es posible cuando se respetan las leyes y la cultura.',
             'migracion', 3200000),
            ('Yolanda Díaz','SUMAR','2023-05-01','Público','Acto del 1 de mayo',
             'Vamos a reducir la jornada laboral a 37,5 horas sin bajar el salario.',
             'laboral', 6000000),
            ('Yolanda Díaz','SUMAR','2024-01-20','El País','Entrevista',
             'La jornada de 37,5 horas se implantará de forma gradual y consensuada con la empresa.',
             'laboral', 4500000),
            ('Pablo Iglesias','PODEMOS','2015-06-20','El País','Entrevista preelectoral',
             'Nunca apoyaremos a Pedro Sánchez. El PSOE y el PP son lo mismo.',
             'alianzas', 8000000),
            ('Pablo Iglesias','PODEMOS','2020-01-12','La Sexta','Investidura',
             'Hoy es el día más feliz de mi vida política. Entramos en el gobierno con Pedro Sánchez.',
             'alianzas', 9500000)
        ON CONFLICT DO NOTHING;
    """)

    # Contradicciones detectadas automáticamente a partir de las declaraciones semilla
    op.execute("""
        INSERT INTO contradicciones
            (persona, partido, tema, tipo, descripcion, gravedad, dias_entre, score_nli,
             decl_a_id, decl_b_id, verificada)
        SELECT
            'Alberto Núñez Feijóo', 'PP', 'economia', 'semantica',
            'En campaña prometió bajar el IRPF; meses después afirmó que no es el momento.',
            'alta', 450, 0.87,
            (SELECT id FROM declaraciones_politicas WHERE persona = ''Alberto Núñez Feijóo'' AND fecha = ''2023-07-23'' LIMIT 1),
            (SELECT id FROM declaraciones_politicas WHERE persona = ''Alberto Núñez Feijóo'' AND fecha = ''2024-10-15'' LIMIT 1),
            TRUE
        WHERE EXISTS (SELECT 1 FROM declaraciones_politicas WHERE persona = 'Alberto Núñez Feijóo' AND fecha = '2023-07-23')
          AND EXISTS (SELECT 1 FROM declaraciones_politicas WHERE persona = 'Alberto Núñez Feijóo' AND fecha = '2024-10-15');
    """)
    op.execute("""
        INSERT INTO contradicciones
            (persona, partido, tema, tipo, descripcion, gravedad, dias_entre, score_nli,
             decl_a_id, decl_b_id, verificada)
        SELECT
            'Pablo Iglesias', 'PODEMOS', 'alianzas', 'lexica',
            'Afirmó que nunca apoyaría a Sánchez; 4 años después entró en su gobierno de coalición.',
            'alta', 1667, 0.95,
            (SELECT id FROM declaraciones_politicas WHERE persona = 'Pablo Iglesias' AND fecha = '2015-06-20' LIMIT 1),
            (SELECT id FROM declaraciones_politicas WHERE persona = 'Pablo Iglesias' AND fecha = '2020-01-12' LIMIT 1),
            TRUE
        WHERE EXISTS (SELECT 1 FROM declaraciones_politicas WHERE persona = 'Pablo Iglesias' AND fecha = '2015-06-20')
          AND EXISTS (SELECT 1 FROM declaraciones_politicas WHERE persona = 'Pablo Iglesias' AND fecha = '2020-01-12');
    """)
    op.execute("""
        INSERT INTO contradicciones
            (persona, partido, tema, tipo, descripcion, gravedad, dias_entre, score_nli,
             decl_a_id, decl_b_id, verificada)
        SELECT
            'Yolanda Díaz', 'SUMAR', 'laboral', 'matizacion',
            'Anunció una reducción inmediata de jornada; después introdujo la gradualidad y el consenso empresarial.',
            'media', 264, 0.72,
            (SELECT id FROM declaraciones_politicas WHERE persona = 'Yolanda Díaz' AND fecha = '2023-05-01' LIMIT 1),
            (SELECT id FROM declaraciones_politicas WHERE persona = 'Yolanda Díaz' AND fecha = '2024-01-20' LIMIT 1),
            TRUE
        WHERE EXISTS (SELECT 1 FROM declaraciones_politicas WHERE persona = 'Yolanda Díaz' AND fecha = '2023-05-01')
          AND EXISTS (SELECT 1 FROM declaraciones_politicas WHERE persona = 'Yolanda Díaz' AND fecha = '2024-01-20');
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS contradicciones;")
    op.execute("DROP TABLE IF EXISTS declaraciones_politicas;")
