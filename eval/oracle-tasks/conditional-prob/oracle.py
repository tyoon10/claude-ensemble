import sys, re, json

def main():
    defects = []
    try:
        text = sys.stdin.read()
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    try:
        blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
        raw = blocks[-1].strip()
        data = json.loads(raw)
        if not isinstance(data, dict):
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return

    tol = 1e-6
    def getnum(key):
        if key not in data:
            return None
        v = data[key]
        try:
            return float(v)
        except Exception:
            return None

    expected = {
        "p_both_boys_given_at_least_one_boy": 1.0/3.0,
        "p_both_boys_given_at_least_one_boy_tuesday": 13.0/27.0,
        "p_both_boys_given_older_is_boy": 1.0/2.0,
        "p_at_least_one_boy_tuesday": 27.0/196.0,
        "p_both_boys_given_at_least_one_boy_weekend": 6.0/13.0,
    }
    for key, exp in expected.items():
        try:
            v = getnum(key)
            if v is None or abs(v - exp) > tol:
                defects.append("wrong or missing value for %s" % key)
        except Exception:
            defects.append("wrong or missing value for %s" % key)

    try:
        v = getnum("p_both_boys_given_at_least_one_boy_tuesday")
        if v is not None and (abs(v - 1.0/3.0) < tol or abs(v - 1.0/2.0) < tol):
            defects.append("tuesday answer collapsed to naive 1/3 or 1/2")
    except Exception:
        pass

    try:
        v = getnum("p_both_boys_given_older_is_boy")
        if v is not None and abs(v - 1.0/3.0) < tol:
            defects.append("older-is-boy answer collapsed to 1/3")
    except Exception:
        pass

    print(json.dumps({"defects": defects}))

main()