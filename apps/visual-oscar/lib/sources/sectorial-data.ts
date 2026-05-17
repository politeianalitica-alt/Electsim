/**
 * Catálogos curados (empresas, reguladores, programas, áreas) para los
 * 5 sectores que no tienen módulo dedicado: Banca, Agro, Telecom,
 * Infraestructuras y Turismo.
 *
 * Datos manualmente verificados con CNMV, IBEX, BME Growth y prensa
 * sectorial. Las URLs son oficiales.
 */

export interface SectorEmpresa {
  nombre: string; ticker: string; ibex: boolean; publica?: boolean
  descripcion: string; capitalizacion_b: number; web: string; segmento: string
}
export interface SectorRegulador {
  nombre: string; full: string; web: string; competencias: string
}
export interface SectorPrograma {
  programa: string; estado: string; presupuesto_b: number
  descripcion: string; color: string
}
export interface SectorArea {
  titulo: string; desc: string; color: string
}

// ─── BANCA & SEGUROS ──────────────────────────────────────
export const EMPRESAS_BANCA: SectorEmpresa[] = [
  { nombre:'Santander', ticker:'SAN.MC', ibex:true, descripcion:'1ª entidad europea por activos · presencia ES, BR, UK, US, MX, PT.', capitalizacion_b:79.4, web:'https://www.santander.com', segmento:'Banco global · retail' },
  { nombre:'BBVA', ticker:'BBVA.MC', ibex:true, descripcion:'2ª española · líder México y Turquía · OPA Sabadell en curso.', capitalizacion_b:62.8, web:'https://www.bbva.com', segmento:'Banco global · retail' },
  { nombre:'CaixaBank', ticker:'CABK.MC', ibex:true, descripcion:'1ª retail España (post fusión Bankia) · 27 % cuota mercado.', capitalizacion_b:46.0, web:'https://www.caixabank.com', segmento:'Banco retail · líder doméstico' },
  { nombre:'Sabadell', ticker:'SAB.MC', ibex:true, descripcion:'4ª doméstica · TSB UK · pendiente OPA hostil BBVA.', capitalizacion_b:11.5, web:'https://www.bancsabadell.com', segmento:'Banco retail · pyme' },
  { nombre:'Bankinter', ticker:'BKT.MC', ibex:true, descripcion:'Banco mediano · banca privada y empresas · ROE>15 %.', capitalizacion_b:7.4, web:'https://www.bankinter.com', segmento:'Banco mediano · privada' },
  { nombre:'Unicaja Banco', ticker:'UNI.MC', ibex:false, descripcion:'7ª doméstica post fusión Liberbank · base Andalucía/Norte.', capitalizacion_b:3.2, web:'https://www.unicajabanco.es', segmento:'Banco regional · doméstico' },
  { nombre:'Mapfre', ticker:'MAP.MC', ibex:true, descripcion:'1ª aseguradora ES · líder LATAM · auto, salud y vida.', capitalizacion_b:7.2, web:'https://www.mapfre.com', segmento:'Seguros · diversificada' },
  { nombre:'Catalana Occidente', ticker:'GCO.MC', ibex:false, descripcion:'Aseguradora histórica · multirramo · líder seguro crédito UE.', capitalizacion_b:4.8, web:'https://www.grupocatalanaoccidente.com', segmento:'Seguros · crédito' },
  { nombre:'Línea Directa', ticker:'LDA.MC', ibex:false, descripcion:'Aseguradora directa · 1ª online auto + hogar · spin-off Bankinter 2021.', capitalizacion_b:1.0, web:'https://www.lineadirecta.com', segmento:'Seguros · directo' },
  { nombre:'Renta 4 Banco', ticker:'R4.MC', ibex:false, descripcion:'Banca privada online · gestión patrimonios · BME Growth.', capitalizacion_b:0.5, web:'https://www.renta4.com', segmento:'Banca privada · digital' },
]
export const REGULADORES_BANCA: SectorRegulador[] = [
  { nombre:'Banco de España', full:'Banco de España · Supervisor SSM', web:'https://www.bde.es', competencias:'Supervisión bancaria nacional bajo SSM · estabilidad financiera.' },
  { nombre:'CNMV', full:'Comisión Nacional del Mercado de Valores', web:'https://www.cnmv.es', competencias:'Supervisión mercados de valores · OPAs · folletos · MiFID II.' },
  { nombre:'DGSFP', full:'Dirección General de Seguros y Fondos de Pensiones', web:'https://www.dgsfp.mineco.es', competencias:'Supervisión aseguradoras y planes de pensiones (Solvencia II).' },
  { nombre:'BCE · ECB', full:'Banco Central Europeo · Eurosystem', web:'https://www.ecb.europa.eu', competencias:'Política monetaria zona euro · supervisión bancos sistémicos.' },
  { nombre:'EBA', full:'European Banking Authority', web:'https://www.eba.europa.eu', competencias:'Stress tests · risk dashboard · rulebook único bancario UE.' },
  { nombre:'EIOPA', full:'European Insurance and Occupational Pensions Authority', web:'https://www.eiopa.europa.eu', competencias:'Stress tests aseguradoras UE · supervisión convergente Solvencia II.' },
  { nombre:'AEB · CECA · UNESPA', full:'Asociaciones bancarias y aseguradoras', web:'https://www.aebanca.es', competencias:'Patronales sectoriales · estadísticas y representación institucional.' },
]
export const AREAS_BANCA: SectorArea[] = [
  { titulo:'OPA BBVA-Sabadell', desc:'Operación €11b · CNMV/CNMC y FROB · cierre esperado 2025-2026', color:'#DC2626' },
  { titulo:'Tipos BCE', desc:'Tipo deposito 2.50 % · transmisión a hipotecas EURIBOR 12M', color:'#1F4E8C' },
  { titulo:'Stress tests EBA 2025', desc:'Capital ratio CET1 · resultados España vs EU media', color:'#7C3AED' },
  { titulo:'Banco digital y fintech', desc:'N26 · Revolut · Bnext · BBVA Light · disrupción retail', color:'#0EA5E9' },
  { titulo:'Solvencia II revisión', desc:'Aseguradoras · ratio cobertura · long-term guarantees', color:'#16A34A' },
  { titulo:'Crisis hipotecaria EUR', desc:'EURIBOR alto · subrogaciones · novaciones · IRPH litigios', color:'#F97316' },
  { titulo:'PSD3 + Open Finance', desc:'Open banking ampliado a seguros, pensiones, inversión', color:'#5B21B6' },
  { titulo:'Greenwashing y SFDR', desc:'EBA fortalecimiento ESG · evaluación carteras verdes', color:'#0F766E' },
]
export const PROGRAMAS_BANCA: SectorPrograma[] = [
  { programa:'Recargo extraordinario banca', estado:'En vigor', presupuesto_b:1.50, descripcion:'4.8 % sobre margen intereses + comisiones (>800M€/año entidad).', color:'#DC2626' },
  { programa:'Bono Sequía hipotecas', estado:'En vigor', presupuesto_b:0, descripcion:'Subrogación gratuita · ampliación plazo · congelación cuotas vulnerables.', color:'#16A34A' },
  { programa:'Plan Estratégico SAREB', estado:'En ejecución', presupuesto_b:0, descripcion:'Cesión 50.000 viviendas · liquidación deuda 2027 · gestión activos tóxicos.', color:'#7C3AED' },
  { programa:'Cliente único · digitalización', estado:'En desarrollo', presupuesto_b:0, descripcion:'Identidad digital eIDAS · onboarding remoto · automatización KYC.', color:'#0EA5E9' },
]

// ─── AGROALIMENTARIO & RURAL ──────────────────────────────
export const EMPRESAS_AGRO: SectorEmpresa[] = [
  { nombre:'Ebro Foods', ticker:'EBRO.MC', ibex:false, descripcion:'1ª arrocera mundial · 2ª pasta · marcas SOS, Brillante, Panzani.', capitalizacion_b:2.4, web:'https://www.ebrofoods.es', segmento:'Alimentación · arroz/pasta' },
  { nombre:'Viscofan', ticker:'VIS.MC', ibex:true, descripcion:'1ª mundial envolturas cárnicas · plantas en 6 continentes.', capitalizacion_b:2.7, web:'https://www.viscofan.com', segmento:'Cárnico · envolturas' },
  { nombre:'Borges Agricultural', ticker:'BAIN.MC', ibex:false, descripcion:'Aceite oliva · frutos secos · marca Borges, Capricho Andaluz.', capitalizacion_b:0.13, web:'https://www.borges.es', segmento:'Aceites y frutos secos' },
  { nombre:'Deoleo', ticker:'OLE.MC', ibex:false, descripcion:'1ª mundial aceite oliva embotellado · marcas Carbonell, Hojiblanca, Bertolli.', capitalizacion_b:0.27, web:'https://www.deoleo.com', segmento:'Aceite oliva · global' },
  { nombre:'Cementos Molins', ticker:'CMO.MC', ibex:false, descripcion:'Cemento + áridos · Argentina, Bangladesh, Túnez.', capitalizacion_b:1.2, web:'https://www.cmolins.es', segmento:'Materias primas' },
  { nombre:'Mercadona', ticker:'—', ibex:false, descripcion:'1ª distribución alimentaria España · 26 % cuota · 1.700 tiendas.', capitalizacion_b:0, web:'https://www.mercadona.es', segmento:'Distribución · líder' },
  { nombre:'DIA', ticker:'DIA.MC', ibex:false, descripcion:'Cadena descuento · operación Letterone · turnaround 2024.', capitalizacion_b:0.9, web:'https://www.dia.es', segmento:'Distribución · descuento' },
  { nombre:'Coren', ticker:'—', ibex:false, descripcion:'1ª cooperativa cárnica España · pollo, pavo, porcino · Galicia.', capitalizacion_b:0, web:'https://www.coren.es', segmento:'Cárnico · cooperativa' },
  { nombre:'Calvo · Garavilla', ticker:'—', ibex:false, descripcion:'Conservas pescado · líderes atún en lata España + LATAM.', capitalizacion_b:0, web:'https://www.calvo.es', segmento:'Conservas pesca' },
  { nombre:'Damm', ticker:'—', ibex:false, descripcion:'2ª cervecera España · Estrella Damm · agua · Cacaolat.', capitalizacion_b:0, web:'https://www.damm.com', segmento:'Bebidas · cerveza' },
]
export const REGULADORES_AGRO: SectorRegulador[] = [
  { nombre:'MAPA', full:'Ministerio de Agricultura, Pesca y Alimentación', web:'https://www.mapa.gob.es', competencias:'Política agraria, PAC, pesca, mercados, sanidad vegetal y animal.' },
  { nombre:'AICA', full:'Agencia de Información y Control Alimentarios', web:'https://www.aica.gob.es', competencias:'Verificación cadena alimentaria · Ley 12/2013 · sanciones precios.' },
  { nombre:'AESAN', full:'Agencia Española de Seguridad Alimentaria y Nutrición', web:'https://www.aesan.gob.es', competencias:'Seguridad alimentaria · alertas · etiquetado · NutriScore.' },
  { nombre:'FEGA', full:'Fondo Español de Garantía Agraria', web:'https://www.fega.es', competencias:'Pagos PAC España · gestión 7.500M€/año ayudas directas.' },
  { nombre:'Comisión Europea · DG AGRI', full:'DG Agricultura UE', web:'https://agriculture.ec.europa.eu', competencias:'PAC 2023-2027 · Pacto Verde · Farm to Fork · 387b€ presupuesto.' },
  { nombre:'COAG · ASAJA · UPA', full:'Organizaciones agrarias representativas', web:'https://coag.org', competencias:'Sindicatos agrarios · presión sectorial · negociación PAC nacional.' },
  { nombre:'ENESA', full:'Entidad Estatal de Seguros Agrarios', web:'https://www.enesa.es', competencias:'Sistema seguros agrarios combinados · cobertura sequía y heladas.' },
]
export const AREAS_AGRO: SectorArea[] = [
  { titulo:'PAC 2023-2027', desc:'47b€ España · ecoesquemas · condicionalidad ambiental reforzada', color:'#16A34A' },
  { titulo:'Sequía y agua', desc:'Embalses · trasvase Tajo-Segura · plan choque CHJ y CHE', color:'#DC2626' },
  { titulo:'Aceite oliva 2024-25', desc:'Récord precios · sequía Andalucía · cuota mundial España 50 %', color:'#F97316' },
  { titulo:'Ganadería extensiva', desc:'Ley Bienestar Animal · PNRD · transición proteína vegetal', color:'#7C3AED' },
  { titulo:'Pesca y caladeros', desc:'Cuotas UE · Brexit aguas · pesca fondos arrastre regulación', color:'#0EA5E9' },
  { titulo:'Industria alimentaria 4.0', desc:'PERTE Agroalimentario 1.8b€ · digitalización procesos', color:'#5B21B6' },
  { titulo:'Vino · DO y exportación', desc:'1ª productor mundial · 4.000 bodegas · 70 DO · vinos premium', color:'#831843' },
  { titulo:'Despoblación rural', desc:'Reto demográfico · 53 % municipios <500 hab · Plan 130', color:'#0F766E' },
]
export const PROGRAMAS_AGRO: SectorPrograma[] = [
  { programa:'PERTE Agroalimentario', estado:'En ejecución', presupuesto_b:1.80, descripcion:'PRTR digitalización + descarbonización industria alimentaria.', color:'#16A34A' },
  { programa:'PAC 2023-2027 · ecoesquemas', estado:'En vigor', presupuesto_b:7.5, descripcion:'Pagos directos verdes · 23 % presupuesto condicionado a sostenibilidad.', color:'#5B21B6' },
  { programa:'Plan Choque Sequía', estado:'En vigor', presupuesto_b:2.78, descripcion:'Ayudas regantes · desalación · transferencias hidrológicas.', color:'#DC2626' },
  { programa:'Ley Cadena Alimentaria', estado:'En vigor', presupuesto_b:0, descripcion:'Prohibición venta a pérdidas · contratos escritos · AICA control.', color:'#F97316' },
]

// ─── TELECOM & DIGITAL ────────────────────────────────────
export const EMPRESAS_TELECOM: SectorEmpresa[] = [
  { nombre:'Telefónica', ticker:'TEF.MC', ibex:true, descripcion:'1ª operadora ES · Movistar · O2 UK (vendido) · LATAM · TecH.', capitalizacion_b:24.5, web:'https://www.telefonica.com', segmento:'Telco integrada · global' },
  { nombre:'Cellnex', ticker:'CLNX.MC', ibex:true, descripcion:'1ª torreras Europa · 130k torres · 12 países · neutral host.', capitalizacion_b:25.3, web:'https://www.cellnextelecom.com', segmento:'Infraestructura · torres' },
  { nombre:'MásMóvil/Yoigo', ticker:'—', ibex:false, descripcion:'Fusionada con Orange Spain en MasOrange · 4ª operadora.', capitalizacion_b:0, web:'https://www.masmovil.com', segmento:'Operadora alternativa' },
  { nombre:'MasOrange', ticker:'—', ibex:false, descripcion:'JV Orange + MásMóvil · 30 % cuota · 36M clientes en España.', capitalizacion_b:0, web:'https://www.masorange.es', segmento:'Telco JV · 2ª por cuota' },
  { nombre:'Vodafone España', ticker:'VOD.L', ibex:false, descripcion:'3ª por cuota · vendida a Zegona (UK) en 2024 · marcha rebranding.', capitalizacion_b:0, web:'https://www.vodafone.es', segmento:'Telco filial · venta' },
  { nombre:'Adamo Telecom', ticker:'—', ibex:false, descripcion:'Fibra rural · zonas blancas · líder despliegue rural ES.', capitalizacion_b:0, web:'https://www.adamo.es', segmento:'FTTH · rural' },
  { nombre:'Indra', ticker:'IDR.MC', ibex:true, descripcion:'TIC defensa + ATC + Minsait · facturación 4.3b€.', capitalizacion_b:5.4, web:'https://www.indracompany.com', segmento:'TIC · servicios' },
  { nombre:'Amadeus IT Group', ticker:'AMS.MC', ibex:true, descripcion:'1ª mundial GDS turístico · plataforma reservas aerolíneas.', capitalizacion_b:30.9, web:'https://www.amadeus.com', segmento:'Travel tech · global' },
]
export const REGULADORES_TELECOM: SectorRegulador[] = [
  { nombre:'CNMC', full:'Comisión Nacional de los Mercados y la Competencia', web:'https://www.cnmc.es', competencias:'Supervisión telecom · espectro · interconexión · obligaciones SMP.' },
  { nombre:'SETELECO', full:'Secretaría de Estado de Telecomunicaciones e Infraestructuras Digitales', web:'https://avancedigital.mineco.gob.es', competencias:'Política digital · espectro 5G/6G · UNICO programa fibra rural.' },
  { nombre:'AEPD', full:'Agencia Española de Protección de Datos', web:'https://www.aepd.es', competencias:'GDPR · supervisión cookies · sanciones grandes plataformas.' },
  { nombre:'BEREC', full:'Body of European Regulators for Electronic Communications', web:'https://www.berec.europa.eu', competencias:'Coordinación reguladores telecom UE · roaming · open internet.' },
  { nombre:'CNMV', full:'CNMV (mercados y emisoras telecom cotizadas)', web:'https://www.cnmv.es', competencias:'Supervisión TEF, CLNX, IDR, AMS · M&A sector.' },
  { nombre:'Red.es', full:'Entidad pública adscrita SETELECO', web:'https://www.red.es', competencias:'Programas digitalización pyme · KitDigital · gigaempresa · ENIA.' },
  { nombre:'INCIBE', full:'Instituto Nacional de Ciberseguridad', web:'https://www.incibe.es', competencias:'Ciberseguridad y CERT nacional · respuesta incidentes empresas.' },
]
export const AREAS_TELECOM: SectorArea[] = [
  { titulo:'5G y espectro', desc:'700 MHz subastado · 26 GHz mmWave · cobertura 95 % población', color:'#0EA5E9' },
  { titulo:'FTTH líder Europa', desc:'17M hogares con fibra · cobertura 89 % · 1ª UE', color:'#16A34A' },
  { titulo:'KitDigital pyme', desc:'PRTR 3.06b€ · bonos digitales 12k pymes · 1.6M solicitudes', color:'#7C3AED' },
  { titulo:'IA Acta UE 2024', desc:'EU AI Act · OBLIGATORIO 08/2026 · clasificación riesgo', color:'#DC2626' },
  { titulo:'Ciberseguridad NIS2', desc:'Directiva trasposición ES · CERT nacional · sectores esenciales', color:'#5B21B6' },
  { titulo:'Telecom OPA Vodafone', desc:'Zegona · MasOrange · consolidación 4→3 operadoras', color:'#F97316' },
  { titulo:'Cellnex desinversiones', desc:'Venta activos NL/IRL · refocus core ES/IT/UK · target IG rating', color:'#1F4E8C' },
  { titulo:'Espacio · Galileo · Amazon Kuiper', desc:'Hispasat · Hisdesat · LEO · 6G satelital · Indra TX', color:'#0F766E' },
]
export const PROGRAMAS_TELECOM: SectorPrograma[] = [
  { programa:'UNICO Banda Ancha 2025', estado:'En ejecución', presupuesto_b:0.83, descripcion:'Despliegue fibra rural 100 % · 1.5M unidades inmobiliarias zonas blancas.', color:'#16A34A' },
  { programa:'KitDigital pymes', estado:'En vigor', presupuesto_b:3.06, descripcion:'Bonos digitales · 12k€ por empresa · 1.6M+ solicitudes.', color:'#7C3AED' },
  { programa:'PERTE Chip', estado:'En desarrollo', presupuesto_b:12.3, descripcion:'Industria semiconductores · planta TSMC · diseño europeo.', color:'#0EA5E9' },
  { programa:'Estrategia 5G · 6G', estado:'Roadmap', presupuesto_b:0, descripcion:'Cobertura 95 % población 2026 · I+D 6G colaboración UE.', color:'#1F4E8C' },
]

// ─── INFRAESTRUCTURAS & MOVILIDAD ─────────────────────────
export const EMPRESAS_INFRA: SectorEmpresa[] = [
  { nombre:'ACS', ticker:'ACS.MC', ibex:true, descripcion:'1ª constructora mundial · Hochtief · Cimic · Iridium concesiones.', capitalizacion_b:13.2, web:'https://www.grupoacs.com', segmento:'Construcción · global' },
  { nombre:'Ferrovial', ticker:'FER.MC', ibex:true, descripcion:'Concesiones 407ETR Toronto · aeropuertos · servicios cities.', capitalizacion_b:30.1, web:'https://www.ferrovial.com', segmento:'Concesiones · infraestructura' },
  { nombre:'Sacyr', ticker:'SCYR.MC', ibex:false, descripcion:'Concesiones (LATAM, ES) · ingeniería · energía · servicios.', capitalizacion_b:2.5, web:'https://www.sacyr.com', segmento:'Construcción · concesiones' },
  { nombre:'FCC', ticker:'FCC.MC', ibex:false, descripcion:'Construcción · agua (Aqualia) · medio ambiente · cementos.', capitalizacion_b:5.6, web:'https://www.fcc.es', segmento:'Servicios urbanos · agua' },
  { nombre:'Acciona', ticker:'ANA.MC', ibex:true, descripcion:'Infraestructuras · energía renovable · agua · servicios urbanos.', capitalizacion_b:7.4, web:'https://www.acciona.com', segmento:'Infraestructura sostenible' },
  { nombre:'OHLA', ticker:'OHLA.MC', ibex:false, descripcion:'Constructora reestructurada · concesiones · obra civil internacional.', capitalizacion_b:0.4, web:'https://www.ohla-group.com', segmento:'Construcción · turnaround' },
  { nombre:'Aena', ticker:'AENA.MC', ibex:true, descripcion:'1ª gestora aeropuertos mundo · 47 ES + Luton + LATAM.', capitalizacion_b:32.2, web:'https://www.aena.es', segmento:'Aeropuertos · público' },
  { nombre:'Adif', ticker:'—', ibex:false, publica:true, descripcion:'Gestor red ferroviaria · 16k km · alta velocidad líder UE.', capitalizacion_b:0, web:'https://www.adif.es', segmento:'Ferroviario público' },
  { nombre:'Renfe', ticker:'—', ibex:false, publica:true, descripcion:'Operador ferroviario público · larga distancia, cercanías.', capitalizacion_b:0, web:'https://www.renfe.com', segmento:'Operador ferroviario' },
  { nombre:'Iberia · IAG', ticker:'IAG.MC', ibex:true, descripcion:'Holding aerolíneas (Iberia, BA, Vueling, Aer Lingus, LEVEL).', capitalizacion_b:14.7, web:'https://www.iairgroup.com', segmento:'Aerolíneas · holding' },
]
export const REGULADORES_INFRA: SectorRegulador[] = [
  { nombre:'Mitma', full:'Ministerio de Transportes y Movilidad Sostenible', web:'https://www.mitma.gob.es', competencias:'Política transportes · carreteras · ferrocarril · puertos · aeropuertos.' },
  { nombre:'Aena', full:'Aeropuertos Españoles y Navegación Aérea', web:'https://www.aena.es', competencias:'Gestión 47 aeropuertos · concesionario CMNB cotizado 51 % SEPI.' },
  { nombre:'Adif', full:'Administrador de Infraestructuras Ferroviarias', web:'https://www.adif.es', competencias:'Gestor red ferroviaria pública · 16.000 km · alta velocidad líder UE.' },
  { nombre:'CNMC', full:'CNMC · Sala de Supervisión Regulatoria', web:'https://www.cnmc.es', competencias:'Supervisión cánones ferroviarios · aeroportuarios · portuarios.' },
  { nombre:'Puertos del Estado', full:'Organismo Público Puertos del Estado', web:'https://www.puertos.es', competencias:'Coordinación 28 Autoridades Portuarias · estadísticas.' },
  { nombre:'DGT', full:'Dirección General de Tráfico', web:'https://www.dgt.es', competencias:'Seguridad vial · matriculación · sanciones · permisos conducir.' },
  { nombre:'AESA', full:'Agencia Estatal de Seguridad Aérea', web:'https://www.seguridadaerea.gob.es', competencias:'Supervisión aeronáutica · drones · pilotos · helicópteros.' },
]
export const AREAS_INFRA: SectorArea[] = [
  { titulo:'Liberalización ferroviaria', desc:'Iryo · Ouigo · Renfe Avlo · 3 operadores compitiendo en HSR', color:'#0EA5E9' },
  { titulo:'PRTR Movilidad', desc:'13b€ corredor mediterráneo · BEV cargers · MaaS plataformas', color:'#16A34A' },
  { titulo:'Aeropuertos · DORA III', desc:'Aena 2027-2031 · plan inversión 12b€ · ampliación Barajas', color:'#1F4E8C' },
  { titulo:'Vehículo eléctrico', desc:'MOVES III · 1.5M veh BEV en 2030 · red 50k cargers', color:'#7C3AED' },
  { titulo:'Concesiones autopistas AP', desc:'Reversión peajes 2018-2027 · plan compensación · pago por uso', color:'#DC2626' },
  { titulo:'Logística e-commerce', desc:'Crecimiento +12 % · Amazon, Inditex Zara · last mile sostenible', color:'#F97316' },
  { titulo:'Puertos Top UE', desc:'Algeciras 1ª · Valencia 2ª · Barcelona · 600M tn merc 2024', color:'#0F766E' },
  { titulo:'Drones y UAM', desc:'AESA U-Space · Sevilla pionera · entregas comerciales 2026', color:'#5B21B6' },
]
export const PROGRAMAS_INFRA: SectorPrograma[] = [
  { programa:'PRTR Movilidad sostenible', estado:'En ejecución', presupuesto_b:13.20, descripcion:'Corredor mediterráneo · cercanías · MaaS · cargers BEV.', color:'#16A34A' },
  { programa:'DORA III Aena 2027-31', estado:'En diseño', presupuesto_b:12.0, descripcion:'Plan inversión Aena · ampliación Barajas, El Prat, Palma.', color:'#1F4E8C' },
  { programa:'MOVES III · BEV', estado:'En vigor', presupuesto_b:0.80, descripcion:'Ayudas compra vehículo eléctrico · puntos recarga rápida.', color:'#7C3AED' },
  { programa:'Reversión peajes AP', estado:'En curso', presupuesto_b:0, descripcion:'Devolución autopistas concesionales · sin peaje 2018-2027.', color:'#DC2626' },
]

// ─── TURISMO & HOSTELERÍA ────────────────────────────────
export const EMPRESAS_TURISMO: SectorEmpresa[] = [
  { nombre:'IAG · Iberia', ticker:'IAG.MC', ibex:true, descripcion:'Holding aerolíneas · Iberia, BA, Vueling, Aer Lingus, LEVEL.', capitalizacion_b:14.7, web:'https://www.iairgroup.com', segmento:'Aerolíneas · global' },
  { nombre:'Meliá Hotels Intl', ticker:'MEL.MC', ibex:false, descripcion:'1ª hotelera ES vacacional · 380+ hoteles · marcas Meliá, Paradisus.', capitalizacion_b:1.4, web:'https://www.melia.com', segmento:'Hoteles · vacacional' },
  { nombre:'Amadeus IT Group', ticker:'AMS.MC', ibex:true, descripcion:'1ª mundial GDS · plataforma reservas aerolíneas.', capitalizacion_b:30.9, web:'https://www.amadeus.com', segmento:'Travel tech · global' },
  { nombre:'NH Hotel Group', ticker:'NHH.MC', ibex:false, descripcion:'Hotelera urbana europea · adquirida por Minor Intl.', capitalizacion_b:1.7, web:'https://www.nh-hotels.com', segmento:'Hoteles urbanos' },
  { nombre:'Aena', ticker:'AENA.MC', ibex:true, descripcion:'1ª gestora aeropuertos mundo · 47 ES (volumen).', capitalizacion_b:32.2, web:'https://www.aena.es', segmento:'Aeropuertos · público' },
  { nombre:'eDreams ODIGEO', ticker:'EDR.MC', ibex:false, descripcion:'1ª OTA Europa · vuelos + hoteles · subscription Prime.', capitalizacion_b:0.95, web:'https://www.edreamsodigeo.com', segmento:'OTA · suscripción' },
  { nombre:'Globalia · Air Europa', ticker:'—', ibex:false, descripcion:'Aerolínea principal · OPA IAG cancelada · alianza SkyTeam.', capitalizacion_b:0, web:'https://www.aireuropa.com', segmento:'Aerolínea privada' },
  { nombre:'Barceló Hotel Group', ticker:'—', ibex:false, descripcion:'3ª hotelera ES · Caribe + Europa · 280+ hoteles.', capitalizacion_b:0, web:'https://www.barcelo.com', segmento:'Hoteles · familiar' },
  { nombre:'RIU Hotels & Resorts', ticker:'—', ibex:false, descripcion:'4ª hotelera ES · resorts vacacional · 100+ hoteles.', capitalizacion_b:0, web:'https://www.riu.com', segmento:'Resorts · vacacional' },
  { nombre:'Iberostar', ticker:'—', ibex:false, descripcion:'5ª hotelera familiar · sostenibilidad líder · 120+ hoteles.', capitalizacion_b:0, web:'https://www.iberostar.com', segmento:'Hoteles · sostenibles' },
]
export const REGULADORES_TURISMO: SectorRegulador[] = [
  { nombre:'MICT · TURESPAÑA', full:'Min. Industria, Comercio y Turismo · Turespaña', web:'https://www.tourspain.es', competencias:'Promoción turística internacional · estrategia turismo sostenible 2030.' },
  { nombre:'CCAA · Consejerías Turismo', full:'Competencia exclusiva CCAA en regulación turística', web:'https://www.tourspain.es/es/comunidades-autonomas', competencias:'Registro alojamientos · ordenación oferta · promoción regional.' },
  { nombre:'INE Turismo', full:'INE · Operación Frontur, Egatur, EOH', web:'https://www.ine.es/dyngs/INEbase/es/categoria.htm?c=Estadistica_P&cid=1254735576863', competencias:'Estadísticas oficiales turistas, gasto, ocupación hotelera.' },
  { nombre:'Exceltur', full:'Alianza para la Excelencia Turística', web:'https://www.exceltur.org', competencias:'Patronal sectorial 33 grandes empresas · informes Perspectivas.' },
  { nombre:'Hosteltur', full:'Asociación Empresarial Hostelería de España', web:'https://www.cehe.es', competencias:'Patronal hostelería · 320k establecimientos · negociación convenios.' },
  { nombre:'OMT · UNWTO', full:'Organización Mundial del Turismo (sede Madrid)', web:'https://www.unwto.org', competencias:'Organización ONU para turismo · sede Madrid · estadísticas globales.' },
  { nombre:'AESA · Aviación', full:'Agencia Estatal de Seguridad Aérea', web:'https://www.seguridadaerea.gob.es', competencias:'Supervisión aerolíneas · derechos pasajeros · slots aeropuertos.' },
]
export const AREAS_TURISMO: SectorArea[] = [
  { titulo:'Récord turistas 2024-2025', desc:'94M turistas internacionales 2024 · estimado 100M+ 2025', color:'#16A34A' },
  { titulo:'Vivienda turística', desc:'Regulación VUT · CCAA · zonas tensionadas · rebote VTC vs hoteles', color:'#DC2626' },
  { titulo:'Sostenibilidad y huella', desc:'Estrategia 2030 · ODS · Baleares Plan · Canarias gestión saturación', color:'#0F766E' },
  { titulo:'Conectividad aérea', desc:'Slots Barajas · low cost vs full service · descongestión MD/BCN', color:'#1F4E8C' },
  { titulo:'Cruceros e itinerarios', desc:'Top mediterráneo · BCN, PMI, MAH, MLG · crecimiento +15 %', color:'#7C3AED' },
  { titulo:'MICE · turismo de negocios', desc:'IFEMA Madrid 1ª · Fitur · MWC Barcelona · congresos premium', color:'#5B21B6' },
  { titulo:'Turismo digital y AI', desc:'Smart destinations · IA personalización · OTA vs canal directo', color:'#0EA5E9' },
  { titulo:'Diversificación geográfica', desc:'España interior · cultural · gastronómico · ENO/turismo rural', color:'#F97316' },
]
export const PROGRAMAS_TURISMO: SectorPrograma[] = [
  { programa:'Estrategia Turismo Sostenible 2030', estado:'En ejecución', presupuesto_b:3.40, descripcion:'PRTR · destinos inteligentes · transición digital + verde.', color:'#0F766E' },
  { programa:'Plan Modernización VUT', estado:'En diseño', presupuesto_b:0, descripcion:'Marco común CCAA · registro nacional · zonas tensionadas.', color:'#DC2626' },
  { programa:'PERTE Cadena de Valor Turismo', estado:'En vigor', presupuesto_b:1.85, descripcion:'PRTR ayudas modernización oferta · digitalización pyme turística.', color:'#7C3AED' },
  { programa:'Plan Sostenibilidad Destinos', estado:'En vigor', presupuesto_b:1.86, descripcion:'CCAA · ayuntamientos · 460+ destinos · gestión saturación.', color:'#16A34A' },
]
