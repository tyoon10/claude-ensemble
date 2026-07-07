import sys, re, json

def main():
    defects = []
    text = sys.stdin.read()
    try:
        blocks = re.findall(r"```python\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
        code = blocks[-1]
        ns = {}
        exec(code, ns)
        failure = ns.get("failure")
        if not callable(failure):
            print(json.dumps({"defects": ["missing or invalid deliverable"]})); return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]})); return

    def call(p):
        return list(failure(p))

    def bf(p):
        res = []
        for i in range(len(p)):
            s = p[:i+1]; best = 0
            for L in range(1, len(s)):
                if s[:L] == s[len(s)-L:]: best = L
            res.append(best)
        return res

    # 1 empty
    try:
        if call("") != []: defects.append("empty string: failure('') must be []")
    except Exception: defects.append("empty string: raised exception")
    # 2 single char
    try:
        if call("a") != [0]: defects.append("single char: failure('a') must be [0]")
    except Exception: defects.append("single char: raised exception")
    # 3 all-same
    try:
        if call("aaaa") != [0,1,2,3]: defects.append("all-same 'aaaa' must be [0,1,2,3]")
    except Exception: defects.append("all-same: raised exception")
    # 4 abab
    try:
        if call("abab") != [0,0,1,2]: defects.append("'abab' must be [0,0,1,2]")
    except Exception: defects.append("abab: raised exception")
    # 5 classic aabaaab
    try:
        if call("aabaaab") != [0,1,0,1,2,2,3]: defects.append("'aabaaab' must be [0,1,0,1,2,2,3]")
    except Exception: defects.append("aabaaab: raised exception")
    # 6 no-repeat
    try:
        if call("abcdef") != [0,0,0,0,0,0]: defects.append("no-repeat 'abcdef' must be all zeros")
    except Exception: defects.append("no-repeat: raised exception")
    # 7 cascade (requires multi-step fallback)
    try:
        if call("aaacaa") != [0,1,2,0,1,2]: defects.append("cascade 'aaacaa' must be [0,1,2,0,1,2]")
    except Exception: defects.append("cascade: raised exception")
    # 8 brute-force agreement on hard strings
    try:
        for s in ["abacababadabacaba","aabaacaabaac","abababab","xxyxxyxxx"]:
            if call(s) != bf(s):
                defects.append("brute-force mismatch on '%s'" % s); break
    except Exception: defects.append("brute-force check: raised exception")
    # 9 consistency: 0 <= fail[i] <= i, ints
    try:
        s = "abracadabracabra"
        r = call(s); ok = True
        if len(r) != len(s): ok = False
        else:
            for i, v in enumerate(r):
                if not isinstance(v, int) or v < 0 or v >= i+1: ok = False; break
        if not ok: defects.append("consistency: each fail[i] must be an int with 0<=fail[i]<i+1")
    except Exception: defects.append("consistency: raised exception")

    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["missing or invalid deliverable"]}))