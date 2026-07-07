import sys, json, re
from math import comb

def extract_last_json(text):
    blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if not blocks:
        return None
    return blocks[-1].strip()

def ceil_log2_comb(m, n):
    c = comb(m + n, m)
    b = 0
    while (1 << b) < c:
        b += 1
    return b

def main():
    defects = []
    try:
        text = sys.stdin.read()
        raw = extract_last_json(text)
        if raw is None:
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
        try:
            data = json.loads(raw)
        except Exception:
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
        if not isinstance(data, dict):
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
        pairs = [(1,1),(2,2),(3,5),(1,9),(7,7)]
        for (m,n) in pairs:
            ak="adv_%d_%d"%(m,n); ik="info_%d_%d"%(m,n)
            ae=m+n-1; ie=ceil_log2_comb(m,n)
            if ak not in data: defects.append("missing key %s"%ak)
            else:
                try:
                    if int(data[ak])!=ae: defects.append("%s wrong: expected %d"%(ak,ae))
                except Exception: defects.append("%s not an integer"%ak)
            if ik not in data: defects.append("missing key %s"%ik)
            else:
                try:
                    if int(data[ik])!=ie: defects.append("%s wrong: expected %d"%(ik,ie))
                except Exception: defects.append("%s not an integer"%ik)
    except Exception:
        defects=["missing or invalid deliverable"]
    print(json.dumps({"defects": defects}))

main()