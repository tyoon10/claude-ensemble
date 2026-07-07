import sys, json, re

def main():
    defects = []
    text = sys.stdin.read()
    try:
        blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        obj = json.loads(blocks[-1].strip())
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    M = 10**6
    expected = {
        "v1": pow(2, 1000, M),
        "v2": pow(3, 0, M),
        "v3": pow(123456789, 2, M),
        "v4": pow(7, 7**2, M),
        "v5": pow(9, 9**9, M),
    }

    if not isinstance(obj, dict):
        print(json.dumps({"defects": ["deliverable is not a JSON object"]}))
        return

    # Check 1: exact key set
    if set(obj.keys()) != set(expected.keys()):
        defects.append("key set mismatch: expected exactly v1..v5")

    # Checks 2-6: each value present, integer-typed, and correct
    for k in ["v1", "v2", "v3", "v4", "v5"]:
        if k not in obj:
            defects.append(f"{k} missing")
            continue
        val = obj[k]
        if isinstance(val, bool) or not isinstance(val, int):
            defects.append(f"{k} not an integer")
            continue
        if val != expected[k]:
            defects.append(f"{k} incorrect: expected {expected[k]}")

    print(json.dumps({"defects": defects}))

main()