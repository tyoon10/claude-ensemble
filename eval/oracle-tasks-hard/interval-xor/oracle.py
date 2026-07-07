import sys, re, json

def extract_last_block(text, langs):
    pat = re.compile(r"```(?:" + "|".join(langs) + r")\s*\n(.*?)```", re.DOTALL | re.IGNORECASE)
    m = pat.findall(text)
    return m[-1] if m else None

def ref(A, B):
    def total(iv):
        return sum(e - s + 1 for s, e in iv)
    i = j = 0
    both = 0
    while i < len(A) and j < len(B):
        s = max(A[i][0], B[j][0]); e = min(A[i][1], B[j][1])
        if s <= e:
            both += e - s + 1
        if A[i][1] < B[j][1]:
            i += 1
        else:
            j += 1
    return total(A) + total(B) - 2 * both

def main():
    text = sys.stdin.read()
    defects = []
    code = extract_last_block(text, ["python", "py"])
    if code is None:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return
    ns = {}
    try:
        exec(code, ns)
        fn = ns.get("symmetric_difference_length")
        assert callable(fn)
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    checks = [
        ("identical",        [[2,5],[10,12]], [[2,5],[10,12]]),
        ("single_pt_same",   [[7,7]],         [[7,7]]),
        ("single_pt_disj",   [[7,7]],         [[9,9]]),
        ("adjacent_noshare", [[1,3]],         [[4,6]]),
        ("endpoint_share",   [[1,3]],         [[3,6]]),
        ("far_apart",        [[0,2]],         [[100,105]]),
        ("nested",           [[1,10]],        [[3,5]]),
        ("empty_side",       [],              [[3,4]]),
        ("complex",          [[1,5],[10,15],[20,20]], [[3,12],[14,14],[20,22]]),
    ]
    for name, A, B in checks:
        try:
            exp = ref(A, B)
            got = fn([list(x) for x in A], [list(x) for x in B])
            if got != exp:
                defects.append("wrong result on %s: expected %d got %r" % (name, exp, got))
        except Exception as e:
            defects.append("error on %s: %r" % (name, e))

    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["oracle error"]}))