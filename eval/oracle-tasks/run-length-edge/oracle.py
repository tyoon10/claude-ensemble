import sys, re, json


def main():
    defects = []
    text = sys.stdin.read()
    try:
        blocks = re.findall(r"```python\s*\n(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        code = blocks[-1]
        ns = {}
        exec(code, ns)
        enc = ns.get("rle_encode")
        dec = ns.get("rle_decode")
        if not callable(enc) or not callable(dec):
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    def norm(x):
        return [tuple(p) for p in x]

    try:
        if norm(enc("")) != []:
            defects.append("encode('') should be []")
    except Exception:
        defects.append("encode('') raised")

    try:
        if norm(enc("a")) != [("a", 1)]:
            defects.append("encode single char wrong")
    except Exception:
        defects.append("encode('a') raised")

    try:
        if norm(enc("abcd")) != [("a", 1), ("b", 1), ("c", 1), ("d", 1)]:
            defects.append("encode no-repeat wrong")
    except Exception:
        defects.append("encode('abcd') raised")

    try:
        if norm(enc("aaaaa")) != [("a", 5)]:
            defects.append("encode all-same wrong")
    except Exception:
        defects.append("encode('aaaaa') raised")

    try:
        if norm(enc("ααα\U0001F389\U0001F389")) != [("α", 3), ("\U0001F389", 2)]:
            defects.append("encode unicode wrong")
    except Exception:
        defects.append("encode unicode raised")

    try:
        import random
        random.seed(1234)
        t = "".join(random.choice("aab") for _ in range(200))
        if dec(enc(t)) != t:
            defects.append("round-trip on random string failed")
    except Exception:
        defects.append("round-trip raised")

    try:
        if dec([("a", 0)]) != "":
            defects.append("decode zero-count single should be ''")
    except Exception:
        defects.append("decode zero-count raised")

    try:
        if dec([("a", 2), ("b", 0), ("c", 1)]) != "aac":
            defects.append("decode with embedded zero-count wrong")
    except Exception:
        defects.append("decode embedded zero raised")

    try:
        if dec([]) != "":
            defects.append("decode empty list should be ''")
    except Exception:
        defects.append("decode empty raised")

    try:
        pairs = norm(enc("aabbbcccc"))
        if pairs != [("a", 2), ("b", 3), ("c", 4)] or dec(enc("aabbbcccc")) != "aabbbcccc":
            defects.append("encode/decode multi-run wrong")
    except Exception:
        defects.append("multi-run raised")

    print(json.dumps({"defects": defects}))


main()