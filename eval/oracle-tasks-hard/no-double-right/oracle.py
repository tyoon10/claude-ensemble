import sys, json, re
from functools import lru_cache

def extract_last_json(text):
    blocks = re.findall(r"```(?:json)?\s*\n(.*?)```", text, re.DOTALL)
    if not blocks:
        blocks = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not blocks:
        return None
    for b in reversed(blocks):
        try:
            return json.loads(b)
        except Exception:
            continue
    return None

def count_paths(w, h):
    @lru_cache(maxsize=None)
    def rec(r, d, last_r):
        if r == 0 and d == 0:
            return 1
        total = 0
        if r > 0 and not last_r:
            total += rec(r - 1, d, True)
        if d > 0:
            total += rec(r, d - 1, False)
        return total
    return rec(w, h, False)

SIZES = {
    "w0_h0": (0, 0),
    "w0_h6": (0, 6),
    "w1_h0": (1, 0),
    "w5_h2": (5, 2),
    "w4_h6": (4, 6),
    "w3_h3": (3, 3),
}

def main():
    raw = sys.stdin.read()
    defects = []
    try:
        data = extract_last_json(raw)
        if not isinstance(data, dict):
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        for key, (w, h) in SIZES.items():
            expected = count_paths(w, h)
            if key not in data:
                defects.append("missing key %s" % key)
                continue
            val = data[key]
            try:
                if isinstance(val, bool):
                    raise ValueError
                ival = int(val)
            except Exception:
                defects.append("non-integer value for %s" % key)
                continue
            if ival != expected:
                defects.append("wrong count for %s: got %s expected %d" % (key, ival, expected))
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return
    print(json.dumps({"defects": defects}))

main()