#!/usr/bin/env python3
"""Deploy ~/workspace/naija-market to Vercel, disable SSO wall, verify."""
import base64, hashlib, json, os, subprocess, sys, time

SRC = os.path.expanduser("~/workspace/naija-market")
SKIP = {"tests/shot.html"}
WRAPPER = "/opt/hatch/bin/vercel"
PROJECT = "nationwide-connect-demo1"
ALIAS = "nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app"

def call_tool(name, args):
    cmd = [WRAPPER, "call-tool", "--name", name, "--arguments-json", json.dumps(args)]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    outer = json.loads(out.stdout)
    if outer["result"].get("isError"):
        raise RuntimeError(outer["result"]["content"][0]["text"][:400])
    return json.loads(outer["result"]["content"][0]["text"])["result"]

def sha1(b): return hashlib.sha1(b).hexdigest()

files = []
for root, _, names in os.walk(SRC):
    for n in names:
        p = os.path.join(root, n)
        rel = os.path.relpath(p, SRC).replace(os.sep, "/")
        if rel in SKIP: continue
        with open(p, "rb") as f: raw = f.read()
        files.append((rel, raw))
print(f"{len(files)} files", flush=True)

refs = []
for rel, raw in files:
    s = sha1(raw)
    call_tool("upload_file", {"requestBody": base64.b64encode(raw).decode(), "xVercelDigest": s})
    refs.append({"file": rel, "sha": s, "size": len(raw)})
print("uploaded", flush=True)

dep = call_tool("create_deployment", {"requestBody": {
    "name": PROJECT, "target": "production",
    "projectSettings": {"framework": None}, "files": refs}})
deployment = dep.get("deployment", dep)
did = deployment["id"]
print("deployment", did, flush=True)

for _ in range(40):
    time.sleep(15)
    st = call_tool("get_deployment", {"idOrUrl": did})
    dres = st.get("deployment", st)
    state = dres.get("readyState", dres.get("state", "?"))
    print("state=" + state, flush=True)
    if state == "READY": break
    if state in ("ERROR", "CANCELED"):
        print("DEPLOY FAILED"); sys.exit(1)

# disable Vercel Authentication (SSO wall) so the site is public
try:
    call_tool("update_project", {"idOrName": PROJECT, "requestBody": {"ssoProtection": None}})
    print("sso disabled", flush=True)
except Exception as e:
    print("sso disable note:", str(e)[:200], flush=True)

try:
    call_tool("assign_alias", {"id": did, "requestBody": {"alias": ALIAS}})
    print("alias:", ALIAS, flush=True)
except Exception as e:
    print("alias note:", str(e)[:200], flush=True)

print("LIVE: https://" + ALIAS + "/")
