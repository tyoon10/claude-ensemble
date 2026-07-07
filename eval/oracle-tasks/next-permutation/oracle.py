import sys, re, json, itertools

def extract_last_block(text, lang):
    pat = re.compile(r"```" + lang + r"[ \t]*\r?\n(.*?)```", re.DOTALL)
    m = pat.findall(text)
    if not m:
        return None
    return m[-1]

def main():
    defects = []
    try:
        text = sys.stdin.read()
        code = extract_last_block(text, "python")
        if code is None:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        ns = {}
        exec(code, ns)
        fn = ns.get("next_permutation")
        if not callable(fn):
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return

        cases = [
            ([3,2,1], [1,2,3], "descending [3,2,1] should wrap to [1,2,3]"),
            ([1,5,1], [5,1,1], "duplicates [1,5,1] -> [5,1,1]"),
            ([7], [7], "length 1 [7] -> [7]"),
            ([1,2], [2,1], "length 2 [1,2] -> [2,1]"),
            ([2,1], [1,2], "length 2 [2,1] wraps to [1,2]"),
            ([1,2,3], [1,3,2], "sorted [1,2,3] -> [1,3,2]"),
            ([2,2,2], [2,2,2], "all-equal [2,2,2] -> [2,2,2]"),
            ([1,1,5], [1,5,1], "duplicates [1,1,5] -> [1,5,1]"),
        ]
        for inp, exp, msg in cases:
            try:
                if fn(list(inp)) != exp:
                    defects.append(msg)
            except Exception:
                defects.append(msg)

        # long multiset cyclic verification against itertools
        try:
            base = [1,1,2,3,3]
            perms = sorted(set(itertools.permutations(base)))
            ok = True
            for idx, p in enumerate(perms):
                expected = list(perms[(idx+1) % len(perms)])
                if fn(list(p)) != expected:
                    ok = False
                    break
            if not ok:
                defects.append("long multiset case must match itertools cyclic order")
        except Exception:
            defects.append("long multiset case must match itertools cyclic order")

        # must not mutate input
        try:
            src = [1,2,3]
            fn(src)
            if src != [1,2,3]:
                defects.append("must not mutate the input list")
        except Exception:
            defects.append("must not mutate the input list")

    except Exception:
        defects = ["missing or invalid deliverable"]
    print(json.dumps({"defects": defects}))

main()