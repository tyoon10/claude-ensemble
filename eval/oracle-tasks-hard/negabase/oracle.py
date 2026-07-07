import sys, json, re

def extract_last_json(text):
    blocks = re.findall(r"```(?:json)?\s*\n(.*?)```", text, re.DOTALL)
    for b in reversed(blocks):
        try:
            return json.loads(b)
        except Exception:
            continue
    return None

def to_neg(n):
    if n == 0: return "0"
    d = ""
    while n != 0:
        r = n % (-2); n //= -2
        if r < 0: r += 2; n += 1
        d = str(r) + d
    return d

def val(s):
    v = 0
    for ch in s:
        v = v * (-2) + int(ch)
    return v

def main():
    defects = []
    try:
        raw = sys.stdin.read()
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    obj = extract_last_json(raw)
    if not isinstance(obj, dict):
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    required = ["neg_6","neg_neg6","neg_neg25","neg_0","val_1101","val_11011","len_neg_100"]
    for k in required:
        if k not in obj:
            defects.append("missing key: " + k)

    def cs(k):
        try:
            v = obj.get(k)
            return isinstance(v, str) and v.strip() == v
        except Exception:
            return False

    try:
        if not (cs("neg_6") and obj["neg_6"] == to_neg(6) and val(obj["neg_6"]) == 6):
            defects.append("neg_6 wrong")
    except Exception:
        defects.append("neg_6 error")
    try:
        if not (cs("neg_neg6") and obj["neg_neg6"] == to_neg(-6) and val(obj["neg_neg6"]) == -6):
            defects.append("neg_neg6 wrong")
    except Exception:
        defects.append("neg_neg6 error")
    try:
        if not (cs("neg_neg25") and obj["neg_neg25"] == to_neg(-25) and val(obj["neg_neg25"]) == -25):
            defects.append("neg_neg25 wrong")
    except Exception:
        defects.append("neg_neg25 error")
    try:
        if not (cs("neg_0") and obj["neg_0"] == "0"):
            defects.append("neg_0 wrong")
    except Exception:
        defects.append("neg_0 error")
    try:
        if int(obj["val_1101"]) != val("1101"):
            defects.append("val_1101 wrong")
    except Exception:
        defects.append("val_1101 error")
    try:
        if int(obj["val_11011"]) != val("11011"):
            defects.append("val_11011 wrong")
    except Exception:
        defects.append("val_11011 error")
    try:
        if int(obj["len_neg_100"]) != len(to_neg(100)):
            defects.append("len_neg_100 wrong")
    except Exception:
        defects.append("len_neg_100 error")

    print(json.dumps({"defects": defects}))

main()