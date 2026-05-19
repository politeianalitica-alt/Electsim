# Schemas LinkML · `packages/ontology/schemas/`

Ontología versionada de Politeia en formato LinkML. Cada `.yaml` describe
una versión del modelo. La fuente de verdad runtime sigue siendo
`agents/entities/schemas.py` (Pydantic), pero LinkML añade:

- **JSON Schema auto-generado** (validable contra LLM outputs)
- **OWL/RDF auto-generado** (interoperabilidad con otras ontologías)
- **Documentación visual** (Mermaid + LinkML docs)
- **Validación cruzada** con Pydantic models (CI catch drift)

## Schemas disponibles

| Archivo | Versión | Estado | Descripción |
|---------|---------|--------|-------------|
| `politeia_v1.yaml` | 1.0.0 | ✅ Activo | Ontología object-centric · 13 EntityKind · 27 LinkKind |

## Uso

### Validar un JSON contra el schema

```bash
pip install linkml linkml-runtime
linkml-validate -s packages/ontology/schemas/politeia_v1.yaml -t Entity tu_entidad.json
```

### Generar JSON Schema para LLM grounding

```bash
gen-json-schema packages/ontology/schemas/politeia_v1.yaml > /tmp/politeia_v1.schema.json
```

Esto es lo que se pasa como `response_format={"type": "json_schema", "json_schema": ...}`
a los proveedores LLM (Groq, OpenAI) en el patrón **OneKE/OntoGPT**.

### Generar Pydantic desde LinkML (opcional)

```bash
gen-pydantic packages/ontology/schemas/politeia_v1.yaml > /tmp/politeia_v1_models.py
diff /tmp/politeia_v1_models.py agents/entities/schemas.py
```

Si hay diff: hay drift entre LinkML y Pydantic. Decidir cuál es la fuente
de verdad para esa clase y propagar el cambio.

## Política de evolución

1. **No breaking changes** dentro de una `major version`. Si quitamos un
   campo o un enum value, subimos a `politeia_v2.yaml`.
2. **Cambios aditivos OK** (nuevos campos opcionales, nuevos
   `permissible_values` en enums): solo bump de minor.
3. **Cada cambio**: actualizar `version` en el YAML + nota en CHANGELOG.

## Referencias

- LinkML docs: https://linkml.io/linkml/
- Patrón OntoGPT: https://github.com/monarch-initiative/ontogpt
- Politeia propuesta: `docs/INGESTA_PROPUESTA.md §4`
