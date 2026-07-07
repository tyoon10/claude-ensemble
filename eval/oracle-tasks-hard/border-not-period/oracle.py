import sys, re, json

def main():
    defects = []
    text = sys.stdin.read()
    blocks = re.findall(r"```python[^\n]*\n(.*?)```", text, re.DOTALL)
    if not blocks:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return
    code = blocks[-1]
    ns = {}
    try:
        exec(code, ns)
        f = ns.get("borders_non_periodic")
        if not callable(f):
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    cases = [
        ("aaaa", [1], "aaaa: b=1 has period 3 (4%3!=0) non-periodic; b=2,3 periodic"),
        ("abab", [], "abab: only border b=2 (period 2) is periodic-inducing"),
        ("aabaaab", [3], "aabaaab: border b=3 has period 4 (7%4!=0)"),
        ("abc", [], "abc: no borders"),
        ("", [], "empty string: no borders"),
        ("a", [], "single char: no borders"),
        ("abcabcabc", [3], "abcabcabc: b=3 non-periodic; b=6 (period 3) periodic excluded"),
        ("aaaaaa", [1, 2], "aaaaaa: only b=1(p5),b=2(p4) non-periodic"),
        ("ababa", [1, 3], "ababa: borders 1(p4) and 3(p2), both non-periodic"),
    ]
    for s, expected, msg in cases:
        try:
            res = f(s)
            if list(res) != expected:
                defects.append("wrong output for %r: got %r want %r" % (s, res, expected))
        except Exception as e:
            defects.append("exception on %r: %s" % (s, e))

    # sortedness / int-type check on a rich case
    try:
        r = f("aaaaaa")
        if list(r) != sorted(r) or any(not isinstance(x, int) for x in r):
            defects.append("result must be an ascending list of int lengths")
    except Exception as e:
        defects.append("exception on sortedness check: %s" % e)

    print(json.dumps({"defects": defects}))

main()