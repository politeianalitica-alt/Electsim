"""Validador de feeds RSS/Atom."""
import logging
import xml.etree.ElementTree as ET

log = logging.getLogger(__name__)


def validate_feed(url: str, timeout: int = 8) -> dict:
    """
    Valida un feed RSS/Atom. Retorna dict con:
    - valid: bool
    - error_type: str|None  (timeout|404|403|non_xml|redirect|blocked|ssl_error|empty|parse_error)
    - error_message: str|None
    - http_status: int|None
    - article_count: int
    - redirect_url: str|None
    """
    try:
        import requests
        resp = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": "ElectSim/1.0 RSS Validator"},
            allow_redirects=True,
        )
        http_status = resp.status_code
        redirect_url = str(resp.url) if str(resp.url) != url else None

        if http_status == 404:
            return _fail("404", f"HTTP 404: {url}", http_status, redirect_url)
        if http_status == 403:
            return _fail("403", f"HTTP 403 Forbidden: {url}", http_status, redirect_url)
        if http_status >= 400:
            return _fail(str(http_status), f"HTTP {http_status}: {url}", http_status, redirect_url)

        content_type = resp.headers.get("Content-Type", "")
        if "html" in content_type.lower() and "xml" not in content_type.lower():
            if "<html" in resp.text[:200].lower():
                return _fail("non_xml", f"Feed devuelve HTML, no XML: {url}", http_status, redirect_url)

        try:
            root = ET.fromstring(resp.content)
            items = root.findall(".//item") or root.findall("{http://www.w3.org/2005/Atom}entry")
            count = len(items)
            return {
                "valid": True,
                "error_type": None,
                "error_message": None,
                "http_status": http_status,
                "article_count": count,
                "redirect_url": redirect_url,
            }
        except ET.ParseError as e:
            return _fail("parse_error", f"XML inválido: {e}", http_status, redirect_url)

    except Exception as e:
        err_str = str(e).lower()
        if "timeout" in err_str or "timed out" in err_str:
            return _fail("timeout", f"Timeout: {url}", None, None)
        if "ssl" in err_str or "certificate" in err_str:
            return _fail("ssl_error", f"SSL error: {e}", None, None)
        if "connection" in err_str or "refused" in err_str:
            return _fail("blocked", f"Conexión rechazada: {url}", None, None)
        return _fail("unknown", str(e)[:200], None, None)


def _fail(error_type: str, error_message: str, http_status, redirect_url) -> dict:
    return {
        "valid": False,
        "error_type": error_type,
        "error_message": error_message,
        "http_status": http_status,
        "article_count": 0,
        "redirect_url": redirect_url,
    }
