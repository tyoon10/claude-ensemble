import sys, re, json, itertools

def extract_last_python_block(text):
    blocks = re.findall(r"```(?:python|py)\s*\n(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if not blocks:
        return None
    return blocks[-1]

def ref_prev(a):
    perms = sorted(set(itertools.permutations(a)))
    t = tuple(a)
    idx = perms.index(t)
    return list(perms[idx - 1])

def main():
    text = sys.stdin.read()
    defects = []
    code = extract_last_python_block(text)
    if code is None:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return
    ns = {}
    try:
        exec(code, ns)
        f = ns["prev_permutation"]
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    def call(a):
        return list(f(list(a)))

    try:
        if call([7]) != [7]:
            defects.append("length-1 identity failed")
    except Exception:
        defects.append("length-1 crashed")

    try:
        if call([1, 2]) != [2, 1]:
            defects.append("length-2 ascending wrap failed")
    except Exception:
        defects.append("length-2 ascending crashed")

    try:
        if call([2, 1]) != [1, 2]:
            defects.append("length-2 descending failed")
    except Exception:
        defects.append("length-2 descending crashed")

    try:
        if call([1, 2, 3, 4]) != [4, 3, 2, 1]:
            defects.append("ascending-wrap failed")
    except Exception:
        defects.append("ascending-wrap crashed")

    try:
        if call([2, 1, 3]) != [1, 3, 2]:
            defects.append("middle case [2,1,3] failed")
    except Exception:
        defects.append("middle case crashed")

    try:
        if call([3, 2, 1]) != [3, 1, 2]:
            defects.append("descending [3,2,1] failed")
    except Exception:
        defects.append("descending crashed")

    try:
        if call([1, 5, 1]) != [1, 1, 5]:
            defects.append("duplicate [1,5,1] failed")
    except Exception:
        defects.append("duplicate [1,5,1] crashed")

    try:
        if call([3, 1, 3]) != [1, 3, 3]:
            defects.append("duplicate [3,1,3] failed")
    except Exception:
        defects.append("duplicate [3,1,3] crashed")

    m = [1, 1, 2, 3, 3, 4, 4]
    perms = sorted(set(itertools.permutations(m)))
    try:
        bad = False
        for idx in [0, 1, 37, len(perms) // 2, len(perms) - 1]:
            src = list(perms[idx])
            if call(src) != ref_prev(src):
                bad = True
                break
        if bad:
            defects.append("7-element multiset itertools mismatch")
    except Exception:
        defects.append("7-element multiset check crashed")

    try:
        base = [1, 2, 2, 3]
        allp = sorted(set(itertools.permutations(base)))
        cur = list(allp[-1])
        seq = [tuple(cur)]
        for _ in range(len(allp) - 1):
            cur = call(cur)
            seq.append(tuple(cur))
        expected = [tuple(p) for p in reversed(allp)]
        ok = (seq == expected)
        wrapped = call(cur)
        if tuple(wrapped) != tuple(allp[-1]):
            ok = False
        if not ok:
            defects.append("descending enumeration/cycle failed")
    except Exception:
        defects.append("enumeration check crashed")

    print(json.dumps({"defects": defects}))

main()