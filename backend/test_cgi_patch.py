
import sys
import types

# Mock cgi module
cgi_mock = types.ModuleType("cgi")
cgi_mock.escape = lambda s, quote=True: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#x27;")
sys.modules["cgi"] = cgi_mock

try:
    import reportlab
    from reportlab.lib.pagesizes import A4
    print("✅ ReportLab imported successfully with patched cgi")
except Exception as e:
    print(f"❌ Failed: {e}")
