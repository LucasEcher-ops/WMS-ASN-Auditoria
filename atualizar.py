from pathlib import Path
import hashlib, json, re, sys
root = Path(__file__).resolve().parent
if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+",sys.argv[1]):
    raise SystemExit('Uso: python atualizar.py 3.2.1')
version=sys.argv[1]
content=(root/'app'/'main.js').read_bytes()
digest=hashlib.sha256(content).hexdigest()
meta=(root/'loader.meta.js').read_text(encoding='utf-8')
meta=re.sub(r'(?m)^(// @version\s+)\d+\.\d+\.\d+',lambda m:m.group(1)+version,meta)
meta=re.sub(r'(?m)^(// @require\s+[^\n]+\?v=)\d+\.\d+\.\d+(#sha256=)[0-9a-f]{64}',lambda m:m.group(1)+version+m.group(2)+digest,meta)
(root/'loader.meta.js').write_text(meta,encoding='utf-8',newline='\n')
(root/'loader.user.js').write_text(meta+'\n'+(root/'loader-bootstrap.js').read_text(encoding='utf-8').replace('%%VERSION%%',version),encoding='utf-8',newline='\n')
manifest_path=root/'manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
manifest.update({'version':version,'sha256':digest})
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('Atualizado:',version,'SHA-256:',digest)
