# Macro freshness report · 2026-06-01

Probe vs `http://localhost:3001`. Catálogos: 15. Indicadores: 277.

| Estado | Cuenta | % |
|---|---:|---:|
| fresh | 138 | 49.8% |
| stale | 37 | 13.4% |
| empty | 100 | 36.1% |
| error | 2 | 0.7% |

## Por catálogo

| Catálogo | fresh | stale | empty | error | total |
|---|---:|---:|---:|---:|---:|
| cultura-ocio | 13 | 1 | 5 | 0 | 19 |
| demografia-territorio | 12 | 2 | 6 | 0 | 20 |
| dependencias-externas | 6 | 2 | 6 | 0 | 14 |
| empresas-beneficios | 2 | 1 | 10 | 0 | 13 |
| flujos-capital | 2 | 0 | 8 | 1 | 11 |
| hogares-empleo-vivienda | 9 | 13 | 10 | 0 | 32 |
| instituciones-estado | 18 | 1 | 7 | 0 | 26 |
| margen-fiscal | 10 | 3 | 3 | 0 | 16 |
| medio-rural | 18 | 0 | 17 | 1 | 36 |
| mercados-activos | 6 | 0 | 10 | 0 | 16 |
| productividad-competitividad | 9 | 0 | 2 | 0 | 11 |
| pulso-macro | 5 | 11 | 4 | 0 | 20 |
| regimen-monetario | 6 | 3 | 1 | 0 | 10 |
| riesgo-sistemico | 7 | 0 | 4 | 0 | 11 |
| sociedad-bienestar | 15 | 0 | 7 | 0 | 22 |

## ERROR (2)

| Catálogo | ID | Endpoint | Detalle |
|---|---|---|---|
| flujos-capital | `fc-bis-claims` | `/api/bis/bis-exposures?country=ES` | HTTP 404 |
| medio-rural | `mr-renovables-mix` | `/api/esios/mix-renovable?n=12` | HTTP 404 |

## EMPTY (100)

| Catálogo | ID | Endpoint | Detalle |
|---|---|---|---|
| cultura-ocio | `co-circular-eurostat` | `/api/eurostat/dataset?code=cei_srm010&filters=geo=ES` | sin puntos |
| cultura-ocio | `co-cult-trade` | `/api/eurostat/dataset?code=cult_trd1&filters=geo=ES` | sin puntos |
| cultura-ocio | `co-pernoct-nuts2` | `/api/eurostat/dataset?code=tour_occ_arn&filters=geo=ES;c_res` | sin puntos |
| cultura-ocio | `co-pib-cultural-ue` | `/api/macro/derived/pib_cultural_ue_gap` | sin puntos |
| cultura-ocio | `co-tourism-nights-eurostat` | `/api/eurostat/dataset?code=tour_occ_nin&filters=geo=ES;c_res` | sin puntos |
| demografia-territorio | `dt-indice-envejecimiento` | `/api/macro/derived/envejecimiento_idx` | sin puntos |
| demografia-territorio | `dt-poblacion-eurostat` | `/api/eurostat/dataset?code=demo_pjanind&filters=geo=ES;indic` | sin puntos |
| demografia-territorio | `dt-poblacion-mayores` | `/api/eurostat/dataset?code=demo_pjanind&filters=geo=ES;indic` | sin puntos |
| demografia-territorio | `dt-poblacion-rural` | `/api/eurostat/dataset?code=urt_pjanaggr3&filters=geo=ES;deg_` | sin puntos |
| demografia-territorio | `dt-proyeccion-dependencia-2050` | `/api/oecd/metric?name=dep_ratio_2050&country=ESP` | sin puntos |
| demografia-territorio | `dt-ratio-dependencia` | `/api/eurostat/dataset?code=demo_pjanind&filters=geo=ES;indic` | sin puntos |
| dependencias-externas | `de-bop-chn` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;partner=C` | sin puntos |
| dependencias-externas | `de-bop-deu` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;partner=D` | sin puntos |
| dependencias-externas | `de-bop-usa` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;partner=U` | sin puntos |
| dependencias-externas | `de-exports-yoy` | `/api/imf/country?iso=ESP&indicator=TX_RPCH` | sin puntos |
| dependencias-externas | `de-import-gas` | `/api/eurostat/dataset?code=nrg_cb_gasm&filters=geo=ES;nrg_ba` | sin puntos |
| dependencias-externas | `de-imports-yoy` | `/api/imf/country?iso=ESP&indicator=TM_RPCH` | sin puntos |
| empresas-beneficios | `eb-capacidad-utilizada` | `/api/eurostat/dataset?code=ei_bsbu_q&filters=geo=ES;indic=BS` | sin puntos |
| empresas-beneficios | `eb-confianza-empresarial-eurostat` | `/api/eurostat/dataset?code=ei_bsin_m&filters=geo=ES;indic=BS` | sin puntos |
| empresas-beneficios | `eb-confianza-servicios` | `/api/eurostat/dataset?code=ei_bssi_m&filters=geo=ES;indic=BS` | sin puntos |
| empresas-beneficios | `eb-demografia-empresas-eurostat` | `/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_s` | sin puntos |
| empresas-beneficios | `eb-inventarios-industria` | `/api/eurostat/dataset?code=ei_bsin_m&filters=geo=ES;indic=BS` | sin puntos |
| empresas-beneficios | `eb-prod-industrial` | `/api/eurostat/dataset?code=sts_inpr_m&filters=geo=ES;nace_r2` | sin puntos |
| empresas-beneficios | `eb-stock-capital` | `/api/eurostat/dataset?code=nama_10_nfa_st&filters=geo=ES;ass` | sin puntos |
| empresas-beneficios | `eb-supervivencia-empresas` | `/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_s` | sin puntos |
| empresas-beneficios | `eb-tasa-creacion-empresas` | `/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_s` | sin puntos |
| empresas-beneficios | `eb-volumen-negocios` | `/api/eurostat/dataset?code=sts_intvi_m&filters=geo=ES;nace_r` | sin puntos |
| flujos-capital | `fc-cuenta-financiera` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=` | sin puntos |
| flujos-capital | `fc-ied-inbound` | `/api/eurostat/dataset?code=bop_fdi6_q&filters=geo=ES;bop_ite` | sin puntos |
| flujos-capital | `fc-ied-outbound` | `/api/eurostat/dataset?code=bop_fdi6_q&filters=geo=ES;bop_ite` | sin puntos |
| flujos-capital | `fc-iip-neta` | `/api/eurostat/dataset?code=bop_iip6_q&filters=geo=ES;sector=` | sin puntos |
| flujos-capital | `fc-inversion-bruta` | `/api/imf/country?iso=ESP&indicator=NID_NGDP` | sin puntos |
| flujos-capital | `fc-other-investment` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=` | sin puntos |
| flujos-capital | `fc-portfolio-net` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=` | sin puntos |
| flujos-capital | `fc-rentas-primarias` | `/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=` | sin puntos |
| hogares-empleo-vivienda | `hev-actividad-16plus` | `/api/ine/epa?n=24` | sin puntos |
| hogares-empleo-vivienda | `hev-ahorro-hogares` | `/api/eurostat/dataset?code=nasq_10_ki&filters=geo=ES;sector=` | sin puntos |
| hogares-empleo-vivienda | `hev-cis-paro-pct` | `/api/cis-snapshot/problemas-paro` | sin puntos |
| hogares-empleo-vivienda | `hev-cis-precios-pct` | `/api/cis-snapshot/problemas-precios` | sin puntos |
| hogares-empleo-vivienda | `hev-cis-vivienda-pct` | `/api/cis-snapshot/problemas-vivienda` | sin puntos |
| hogares-empleo-vivienda | `hev-empleo-20-64` | `/api/eurostat/dataset?code=lfsi_emp_a&filters=geo=ES;sex=T;a` | sin puntos |
| hogares-empleo-vivienda | `hev-euribor-12m` | `/api/bde/series/TI_1_1.6?n=36` | sin puntos |
| hogares-empleo-vivienda | `hev-paro-largo-plazo` | `/api/eurostat/dataset?code=lfsi_long_q&filters=geo=ES;sex=T;` | sin puntos |
| hogares-empleo-vivienda | `hev-renta-disponible-pc` | `/api/eurostat/dataset?code=nasa_10_ki&filters=geo=ES;sector=` | sin puntos |
| hogares-empleo-vivienda | `hev-tipo-hipoteca` | `/api/bde/series/TI_1_1240?n=24` | sin puntos |
| instituciones-estado | `ie-altas-empresas-eurostat` | `/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_s` | sin puntos |
| instituciones-estado | `ie-capacidad-estado-compuesto` | `/api/macro/derived/capacidad_estado` | sin puntos |
| instituciones-estado | `ie-cis-confianza-congreso` | `/api/cis-snapshot/confianza-congreso` | sin puntos |
| instituciones-estado | `ie-cis-confianza-gob` | `/api/cis-snapshot/confianza-gobierno` | sin puntos |
| instituciones-estado | `ie-cis-confianza-tribunales` | `/api/cis-snapshot/confianza-tribunales` | sin puntos |
| instituciones-estado | `ie-fbcf-capital-aapp` | `/api/eurostat/dataset?code=gov_10dd_edpt2&filters=geo=ES;na_` | sin puntos |
| instituciones-estado | `ie-wgi-corruption` | `/api/worldbank/indicator/CC.PER.RNK?country=ES&per_page=30` | sin puntos |
| margen-fiscal | `mf-deuda-bruta-eurostat` | `/api/eurostat/dataset?code=gov_10dd_ggdebt&filters=geo=ES;se` | sin puntos |
| margen-fiscal | `mf-saldo-estructural` | `/api/eurostat/dataset?code=ei_isfb_n&filters=geo=ES` | sin puntos |
| margen-fiscal | `mf-saldo-primario` | `/api/eurostat/dataset?code=gov_10dd_edpt1&filters=geo=ES;na_` | sin puntos |
| medio-rural | `mr-aei-eurostat` | `/api/eurostat/dataset?code=aact_eaa04&filters=geo=ES;indic_a` | sin puntos |
| medio-rural | `mr-indice-cohesion-terr` | `/api/macro/derived/cohesion_territorial` | sin puntos |
| medio-rural | `mr-precipitacion-and` | `/api/aemet/precipitacion-ccaa?ccaa=AND` | sin puntos |
| medio-rural | `mr-precipitacion-ara` | `/api/aemet/precipitacion-ccaa?ccaa=ARA` | sin puntos |
| medio-rural | `mr-precipitacion-ast` | `/api/aemet/precipitacion-ccaa?ccaa=AST` | sin puntos |
| medio-rural | `mr-precipitacion-bal` | `/api/aemet/precipitacion-ccaa?ccaa=BAL` | sin puntos |
| medio-rural | `mr-precipitacion-can` | `/api/aemet/precipitacion-ccaa?ccaa=CAN` | sin puntos |
| medio-rural | `mr-precipitacion-cat` | `/api/aemet/precipitacion-ccaa?ccaa=CAT` | sin puntos |
| medio-rural | `mr-precipitacion-clm` | `/api/aemet/precipitacion-ccaa?ccaa=CLM` | sin puntos |
| medio-rural | `mr-precipitacion-ctb` | `/api/aemet/precipitacion-ccaa?ccaa=CTB` | sin puntos |
| medio-rural | `mr-precipitacion-cva` | `/api/aemet/precipitacion-ccaa?ccaa=CVA` | sin puntos |
| medio-rural | `mr-precipitacion-cyl` | `/api/aemet/precipitacion-ccaa?ccaa=CYL` | sin puntos |
| medio-rural | `mr-precipitacion-ext` | `/api/aemet/precipitacion-ccaa?ccaa=EXT` | sin puntos |
| medio-rural | `mr-precipitacion-gal` | `/api/aemet/precipitacion-ccaa?ccaa=GAL` | sin puntos |
| medio-rural | `mr-precipitacion-mur` | `/api/aemet/precipitacion-ccaa?ccaa=MUR` | sin puntos |
| medio-rural | `mr-sau-eurostat` | `/api/eurostat/dataset?code=ef_lus_main&filters=geo=ES;crops=` | sin puntos |
| medio-rural | `mr-temperatura-mad` | `/api/aemet/precipitacion-ccaa?ccaa=MAD` | sin puntos |
| mercados-activos | `ma-aena-mc` | `/api/finnhub/quote/AENA.MC` | sin puntos |
| mercados-activos | `ma-bbva-adr` | `/api/finnhub/quote/BBVA` | sin puntos |
| mercados-activos | `ma-iberdrola-adr` | `/api/finnhub/quote/IBDRY` | sin puntos |
| mercados-activos | `ma-inditex-adr` | `/api/finnhub/quote/IBKRY` | sin puntos |
| mercados-activos | `ma-m3-growth-ea` | `/api/eurostat/dataset?code=ei_mfm3_m&filters=geo=EA` | sin puntos |
| mercados-activos | `ma-reer-bis` | `/api/bis/fx-effective` | sin puntos |
| mercados-activos | `ma-santander-adr` | `/api/finnhub/quote/SAN` | sin puntos |
| mercados-activos | `ma-spread-credit-ig` | `/api/eurostat/dataset?code=irt_h_eurcrd_d&filters=fcat=CORP_` | sin puntos |
| mercados-activos | `ma-stocks-financial-ea` | `/api/eurostat/dataset?code=ei_bsfi_m&filters=geo=EA` | sin puntos |
| mercados-activos | `ma-telefonica-adr` | `/api/finnhub/quote/TEF` | sin puntos |
| productividad-competitividad | `pc-desi-digital` | `/api/eurostat/dataset?code=isoc_e_dii&filters=geo=ES;indic_i` | sin puntos |
| productividad-competitividad | `pc-empleo-knowledge` | `/api/eurostat/dataset?code=htec_emp_nat2&filters=geo=ES;nace` | sin puntos |
| pulso-macro | `pulso-construccion` | `/api/eurostat/dataset?code=sts_copr_m&filters=geo=ES;nace_r2` | sin puntos |
| pulso-macro | `pulso-esi-sentiment` | `/api/eurostat/dataset?code=ei_bsei_m&filters=geo=ES;indic=BS` | sin puntos |
| pulso-macro | `pulso-ipi-manufactura` | `/api/eurostat/dataset?code=sts_inpr_m&filters=geo=ES;nace_r2` | sin puntos |
| pulso-macro | `pulso-ventas-retail` | `/api/eurostat/dataset?code=sts_trtu_m&filters=geo=ES;nace_r2` | sin puntos |
| regimen-monetario | `rm-hicp-core` | `/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coic` | sin puntos |
| riesgo-sistemico | `rs-credito-pib-es` | `/api/eurostat/dataset?code=ei_bsbo_m&filters=geo=ES` | sin puntos |
| riesgo-sistemico | `rs-npl-banca` | `/api/bde/series/BE_4_18?n=36` | sin puntos |
| riesgo-sistemico | `rs-paro-larga-duracion` | `/api/eurostat/dataset?code=lfsq_upgan&filters=geo=ES` | sin puntos |
| riesgo-sistemico | `rs-tipo-prestamo-empresas` | `/api/bde/series/TI_1_1245?n=36` | sin puntos |
| sociedad-bienestar | `sb-confianza-interpersonal` | `/api/eurostat/dataset?code=ilc_scp&filters=geo=ES` | sin puntos |
| sociedad-bienestar | `sb-esperanza-vida-saludable` | `/api/eurostat/dataset?code=hlth_hlye&filters=geo=ES;age=Y65_` | sin puntos |
| sociedad-bienestar | `sb-gasto-sanidad-publica` | `/api/eurostat/dataset?code=hlth_sha11_hf&filters=geo=ES;hf=H` | sin puntos |
| sociedad-bienestar | `sb-gasto-social-ocde` | `/api/oecd/metric?name=social_spending&country=ESP` | sin puntos |
| sociedad-bienestar | `sb-gasto-social-pib` | `/api/eurostat/dataset?code=spr_exp_sum&filters=geo=ES` | sin puntos |
| sociedad-bienestar | `sb-gini-vs-ocde` | `/api/oecd/metric?name=gini&country=ESP` | sin puntos |
| sociedad-bienestar | `sb-movilidad-intergen` | `/api/oecd/metric?name=intergen_mobility&country=ESP` | sin puntos |

## STALE (37)

| Catálogo | ID | Endpoint | Detalle |
|---|---|---|---|
| cultura-ocio | `co-frontur` | `/api/ine/frontur?n=24` | last=2024-Q4 (520d > 75d) |
| demografia-territorio | `dt-crecimiento-natural` | `/api/spanish-stats/crecimiento-natural?country=ESP` | last=2025 (152d > 75d) |
| demografia-territorio | `dt-paro-epa-jovenes` | `/api/ine/epa?n=24` | last=2017-Q4 (3077d > 150d) |
| dependencias-externas | `de-bienes-export-mensual` | `/api/ine/cnt-extra?n=36` | last=2017-Q1 (3352d > 75d) |
| dependencias-externas | `de-turistas-anual` | `/api/ine/frontur?n=36` | last=2024-Q4 (520d > 75d) |
| empresas-beneficios | `eb-etcl-coste-laboral` | `/api/ine/etcl?n=24` | last=2025-Q3 (246d > 150d) |
| hogares-empleo-vivienda | `hev-cis-paro-problema` | `/api/cis/serie?tema=paro` | last=2025-04 (399d > 75d) |
| hogares-empleo-vivienda | `hev-cis-precios-problema` | `/api/cis/serie?tema=precios` | last=2025-04 (399d > 75d) |
| hogares-empleo-vivienda | `hev-cis-vivienda-problema` | `/api/cis/serie?tema=vivienda` | last=2025-04 (399d > 75d) |
| hogares-empleo-vivienda | `hev-esfuerzo-vivienda` | `/api/spanish-stats/esfuerzo-vivienda?country=ESP` | last=2025 (152d > 150d) |
| hogares-empleo-vivienda | `hev-etcl-coste-laboral` | `/api/ine/etcl?n=24` | last=2025-Q3 (246d > 150d) |
| hogares-empleo-vivienda | `hev-ipc-anual` | `/api/ine/ipc?n=36` | last=2023-05 (1100d > 75d) |
| hogares-empleo-vivienda | `hev-ipc-mensual` | `/api/ine/ipc?n=36` | last=2023-05 (1100d > 75d) |
| hogares-empleo-vivienda | `hev-ipv-general` | `/api/ine/ipv?n=24` | last=2025-Q3 (246d > 150d) |
| hogares-empleo-vivienda | `hev-ipv-nueva` | `/api/ine/ipv?n=24` | last=2025-Q3 (246d > 150d) |
| hogares-empleo-vivienda | `hev-ipv-segunda` | `/api/ine/ipv?n=24` | last=2025-Q3 (246d > 150d) |
| hogares-empleo-vivienda | `hev-paro-epa-general` | `/api/ine/epa?n=24` | last=2017-Q4 (3077d > 150d) |
| hogares-empleo-vivienda | `hev-paro-epa-jovenes` | `/api/ine/epa?n=24` | last=2017-Q4 (3077d > 150d) |
| hogares-empleo-vivienda | `hev-precio-m2-vivienda` | `/api/spanish-stats/precio-m2-vivienda?country=ESP` | last=2025 (152d > 150d) |
| instituciones-estado | `ie-ejecucion-presup` | `/api/spanish-stats/ejecucion-presup?country=ESP` | last=2025 (152d > 75d) |
| margen-fiscal | `mf-coste-medio-emisiones` | `/api/tesoro/snapshot` | last=2024-10 (581d > 75d) |
| margen-fiscal | `mf-no-residentes-deuda` | `/api/tesoro/snapshot` | last=2024-10 (581d > 75d) |
| margen-fiscal | `mf-vida-media-deuda` | `/api/tesoro/snapshot` | last=2024-10 (581d > 75d) |
| pulso-macro | `consumo-aapp-yoy` | `/api/ine/cnt-desglose?n=24` | last=2020-Q1 (2256d > 150d) |
| pulso-macro | `consumo-hogares-yoy` | `/api/ine/cnt-desglose?n=24` | last=2020-Q1 (2256d > 150d) |
| pulso-macro | `exports-yoy` | `/api/ine/cnt-extra?n=24` | last=2020-Q1 (2256d > 150d) |
| pulso-macro | `exterior-pp` | `/api/ine/cnt-desglose?n=24` | last=2020-Q1 (2256d > 150d) |
| pulso-macro | `imports-yoy` | `/api/ine/cnt-extra?n=24` | last=2020-Q1 (2256d > 150d) |
| pulso-macro | `inversion-fbcf-yoy` | `/api/ine/cnt-desglose?n=24` | last=2020-Q1 (2256d > 150d) |
| pulso-macro | `ipc-anual` | `/api/ine/ipc?n=36` | last=2023-05 (1100d > 75d) |
| pulso-macro | `ipc-mensual` | `/api/ine/ipc?n=36` | last=2023-05 (1100d > 75d) |
| pulso-macro | `paro-epa-general` | `/api/ine/epa?n=24` | last=2017-Q4 (3077d > 150d) |
| pulso-macro | `paro-epa-jovenes` | `/api/ine/epa?n=24` | last=2017-Q4 (3077d > 150d) |
| pulso-macro | `pib-yoy` | `/api/ine/cnt-desglose?n=24` | last=2020-Q1 (2256d > 150d) |
| regimen-monetario | `rm-ipc-acumulada` | `/api/ine/ipc?n=36` | last=2023-04 (1130d > 75d) |
| regimen-monetario | `rm-ipc-anual` | `/api/ine/ipc?n=36` | last=2023-05 (1100d > 75d) |
| regimen-monetario | `rm-ipc-mensual` | `/api/ine/ipc?n=36` | last=2023-05 (1100d > 75d) |
