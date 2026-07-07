import sys, json, re

def main():
    defects = []
    text = sys.stdin.read()
    try:
        blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        raw = blocks[-1].strip()
        data = json.loads(raw)
        if not isinstance(data, dict):
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    tol = 1e-4

    # Compute exact reference values
    def D(n, k):
        return n * (1.0 - (1.0 - 1.0/n)**k)
    def H(n):
        return sum(1.0/i for i in range(1, n+1))
    def T(n):
        return n * H(n)

    expected = {
        "d_10_10": D(10, 10),
        "d_10_1":  D(10, 1),
        "d_100_0": D(100, 0),
        "d_7_7":   D(7, 7),
        "t_1":     T(1),
        "t_2":     T(2),
        "t_10":    T(10),
    }

    for key, exp in expected.items():
        try:
            if key not in data:
                defects.append("missing key %s" % key)
                continue
            val = float(data[key])
            if abs(val - exp) > tol:
                defects.append("%s wrong: got %r expected %.6f" % (key, data[key], exp))
        except Exception:
            defects.append("%s not a valid float" % key)

    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["missing or invalid deliverable"]}))