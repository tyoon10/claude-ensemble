import sys, re, json

def main():
    defects = []
    try:
        text = sys.stdin.read()
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    try:
        blocks = re.findall(r"```python\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            blocks = re.findall(r"```\s*(.*?)```", text, re.DOTALL)
    except Exception:
        blocks = []
    if not blocks:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    code = blocks[-1]
    ns = {}
    try:
        exec(code, ns)
        f = ns.get("measure_at_least")
        if not callable(f):
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return

    cases = [
        ("empty", [], 1, 0.0),
        ("nested_k3", [[0,10,1],[2,4,5]], 3, 2.0),
        ("nested_k1", [[0,10,1],[2,4,5]], 1, 10.0),
        ("endpoint_stack_adjacent", [[0,5,2],[5,10,2]], 2, 10.0),
        ("k_above_all", [[0,10,1],[2,4,5]], 6, 0.0),
        ("negative_coords", [[-5,-1,2],[-3,3,4]], 3, 6.0),
        ("degenerate_point", [[0,10,1],[5,5,9]], 9, 0.0),
        ("max_not_sum", [[0,4,1],[2,6,1]], 2, 0.0),
        ("partial_diff_weights", [[0,6,2],[4,10,5]], 5, 6.0),
    ]
    try:
        import copy
    except Exception:
        copy = None
    for name, segs, k, expected in cases:
        try:
            arg = copy.deepcopy(segs) if copy is not None else [list(s) for s in segs]
            got = f(arg, k)
            if got is None or abs(float(got) - expected) > 1e-6:
                defects.append(name)
        except Exception:
            defects.append(name)
    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["missing or invalid deliverable"]}))