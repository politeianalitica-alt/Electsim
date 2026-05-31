# ENTSO-E Web API · procedimiento de activación

> **Doc interno de operaciones · NO referenciar desde la UI del cliente.**
>
> Movido desde `apps/visual-oscar/components/energy/EntsoeSpainPanel.tsx`
> (Sprint Quality-Q-A.1, 2026-05-31) porque el panel exponía email
> personal del fundador, su nombre y la plantilla de solicitud al usuario
> final.

---

## Estado actual

- ✓ Cuenta web ENTSO-E Transparency Platform creada
- ✓ File Library accesible (username + password)
- ✗ Web API security token **pendiente** de activación manual

ENTSO-E **no autogenera** el token en self-service: requiere petición por email
a su equipo.

## Plantilla de email

Asunto: `Web API security token request`

Destinatario: `transparency@entsoe.eu`

Cuerpo:

```
Hello,

I have registered on the ENTSO-E Transparency Platform with my account.

I would like to use the Transparency Platform Web API for academic / data
analysis purposes, but I cannot find any "Web API Security Token" or "API
Token" section in My Account.

Could you please enable Web API access for my account or indicate where
I can generate the security token in the new interface?

Thank you very much.

Best regards,
[NOMBRE DEL OPERADOR]
```

> ⚠️ **NO incluir el email personal del fundador en la firma.** Usar email
> corporativo (`tech@politeia-analitica.com` o similar) cuando exista, o
> el alias de la cuenta web ENTSO-E si la respuesta puede ir ahí.

## Una vez recibido el token

1. Vercel → Project `politeia-visual-oscar` → Settings → Environment Variables
2. Añadir `ENTSOE_API_KEY = <token>` en Production (+ Preview si se quiere para
   QA)
3. Redeploy automático
4. El panel `EntsoeSpainPanel` detecta `tokenConfigured` y cambia a estado LIVE
   sin más cambios de código

## Verificación local

```bash
export ENTSOE_API_KEY=<token>
cd apps/visual-oscar
npm run dev
# abrir http://localhost:3000/sector-energia → scroll hasta panel ENTSO-E
# debe mostrar precios día-anterior + interconexiones + mix
```

## Health endpoint

`GET /api/entsoe/health` devuelve `{ token_configured: boolean, last_fetch: ISO }`
sin filtrar el token. Útil para monitoring sin exponer secretos.
