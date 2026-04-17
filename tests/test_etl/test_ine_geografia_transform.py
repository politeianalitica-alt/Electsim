from etl.sources.ine_geografia import INEGeografiaExtractor


def test_ine_geografia_transform_builds_dataframes():
    data = {
        "comunidades": [
            {"Codigo": "00", "Nombre": "Total Nacional"},
            {"Codigo": "01", "Nombre": "Andalucía"},
        ],
        "provincias": [
            {
                "Codigo": "04",
                "Nombre": "Almería",
                "JerarquiaPadres": [
                    {
                        "Codigo": "01",
                        "Variable": {"Codigo": "CCAA", "Nombre": "CCAA"},
                        "Nombre": "Andalucía",
                    }
                ],
            }
        ],
        "municipios": [
            {
                "Codigo": "04001",
                "Nombre": "Abla",
                "JerarquiaPadres": [
                    {
                        "Codigo": "04",
                        "Variable": {"Codigo": "PROV", "Nombre": "Provincias"},
                        "Nombre": "Almería",
                    }
                ],
            }
        ],
    }
    ext = INEGeografiaExtractor()
    clean = ext.transform(data)
    assert list(clean["ccaa"]["codigo_ine"]) == ["01"]
    assert clean["provincias"].iloc[0]["ccaa_codigo"] == "01"
    assert clean["municipios"].iloc[0]["codigo_ine"] == "04001"
    assert clean["municipios"].iloc[0]["provincia_codigo"] == "04"
