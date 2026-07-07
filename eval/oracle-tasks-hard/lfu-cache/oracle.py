import sys, re, json

def extract_last_python(text):
    try:
        blocks = re.findall(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
        return blocks[-1] if blocks else None
    except Exception:
        return None

def main():
    defects = []
    try:
        text = sys.stdin.read()
    except Exception:
        text = ""
    code = extract_last_python(text)
    if code is None:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return
    ns = {}
    try:
        exec(code, ns)
        LFU = ns.get("LFUCache")
        if LFU is None:
            raise ValueError("no LFUCache")
        _ = LFU(2)
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    # check1: capacity 1
    try:
        c = LFU(1)
        c.put(1, 1)
        ok = (c.get(1) == 1)
        c.put(2, 2)
        ok = ok and (c.get(1) == -1) and (c.get(2) == 2)
        if not ok:
            defects.append("capacity-1 eviction wrong")
    except Exception:
        defects.append("capacity-1 eviction wrong")

    # check2: put on existing key counts as a use (freq via update)
    try:
        c = LFU(2)
        c.put(1, 1)
        c.put(2, 2)
        c.put(1, 10)
        c.put(3, 3)
        ok = (c.get(2) == -1) and (c.get(1) == 10) and (c.get(3) == 3)
        if not ok:
            defects.append("put-update-counts-as-use wrong")
    except Exception:
        defects.append("put-update-counts-as-use wrong")

    # check3: get increments freq and affects eviction
    try:
        c = LFU(2)
        c.put(1, 1)
        c.put(2, 2)
        c.get(1)
        c.put(3, 3)
        ok = (c.get(2) == -1) and (c.get(1) == 1) and (c.get(3) == 3)
        if not ok:
            defects.append("get-increments-freq wrong")
    except Exception:
        defects.append("get-increments-freq wrong")

    # check4: tie broken by least-recently-used
    try:
        c = LFU(2)
        c.put(1, 1)
        c.put(2, 2)
        c.put(3, 3)
        ok = (c.get(1) == -1) and (c.get(2) == 2) and (c.get(3) == 3)
        if not ok:
            defects.append("lru-tie-break wrong")
    except Exception:
        defects.append("lru-tie-break wrong")

    # check5: get on missing returns -1 with no side effects
    try:
        c = LFU(2)
        ok = (c.get(99) == -1)
        c.put(1, 1)
        c.put(2, 2)
        ok = ok and (c.get(99) == -1)
        c.put(3, 3)
        ok = ok and (c.get(1) == -1) and (c.get(2) == 2) and (c.get(3) == 3)
        if not ok:
            defects.append("missing-key-side-effect wrong")
    except Exception:
        defects.append("missing-key-side-effect wrong")

    # check6: frequency carried across re-insertion (load-bearing deviation)
    try:
        c = LFU(2)
        c.put(1, 1)
        c.put(2, 2)
        c.get(1)
        c.put(3, 3)
        c.put(2, 20)
        c.put(4, 4)
        ok = (c.get(1) == -1) and (c.get(2) == 20) and (c.get(4) == 4) and (c.get(3) == -1)
        if not ok:
            defects.append("re-insertion-freq-resume wrong")
    except Exception:
        defects.append("re-insertion-freq-resume wrong")

    # check7: full interleaved trace (hand-simulated)
    try:
        c = LFU(2)
        outs = []
        c.put(1, 10)
        c.put(2, 20)
        outs.append(c.get(1))
        c.put(3, 30)
        outs.append(c.get(2))
        c.put(2, 25)
        outs.append(c.get(1))
        c.put(4, 40)
        outs.append(c.get(2))
        c.put(2, 26)
        outs.append(c.get(2))
        outs.append(c.get(1))
        c.put(5, 50)
        expect = [10, -1, 10, -1, 26, 10]
        finals = (c.get(2) == -1 and c.get(3) == -1 and c.get(4) == -1
                  and c.get(1) == 10 and c.get(5) == 50)
        if outs != expect or not finals:
            defects.append("interleaved-trace wrong")
    except Exception:
        defects.append("interleaved-trace wrong")

    # check8: capacity 0 stores nothing
    try:
        c = LFU(0)
        c.put(1, 1)
        ok = (c.get(1) == -1)
        if not ok:
            defects.append("capacity-0 boundary wrong")
    except Exception:
        defects.append("capacity-0 boundary wrong")

    print(json.dumps({"defects": defects}))

main()