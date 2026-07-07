import sys, re, json

def extract(text):
    blocks = re.findall(r"```python\s*(.*?)```", text, re.DOTALL)
    if not blocks:
        return None
    return blocks[-1]

def main():
    defects = []
    try:
        text = sys.stdin.read()
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return
    try:
        code = extract(text)
        if code is None:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        ns = {}
        exec(code, ns)
        LRU = ns.get("LRU")
        if LRU is None:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    # check 1: capacity 1 basic get/put + eviction
    try:
        c = LRU(1)
        c.put(1, 1)
        ok = c.get(1) == 1
        c.put(2, 2)  # evicts 1
        ok = ok and c.get(1) == -1 and c.get(2) == 2
        if not ok:
            defects.append("capacity 1: eviction/get incorrect")
    except Exception:
        defects.append("capacity 1: raised exception")

    # check 2: get on missing returns -1
    try:
        c = LRU(2)
        if c.get(99) != -1:
            defects.append("get on missing key must return -1")
    except Exception:
        defects.append("get missing: raised exception")

    # check 3: put existing updates value
    try:
        c = LRU(2)
        c.put(1, 1)
        c.put(1, 100)
        if c.get(1) != 100:
            defects.append("put on existing key must update value")
    except Exception:
        defects.append("put existing value: raised exception")

    # check 4: put existing refreshes recency
    try:
        c = LRU(2)
        c.put(1, 1)
        c.put(2, 2)
        c.put(1, 10)   # refresh 1
        c.put(3, 3)    # should evict 2, not 1
        if not (c.get(2) == -1 and c.get(1) == 10 and c.get(3) == 3):
            defects.append("put on existing key must refresh recency")
    except Exception:
        defects.append("put refresh recency: raised exception")

    # check 5: get refreshes recency
    try:
        c = LRU(2)
        c.put(1, 1)
        c.put(2, 2)
        _ = c.get(1)   # refresh 1
        c.put(3, 3)    # should evict 2
        if not (c.get(2) == -1 and c.get(1) == 1 and c.get(3) == 3):
            defects.append("get must refresh recency")
    except Exception:
        defects.append("get refresh recency: raised exception")

    # check 6: interleaved get/put eviction order
    try:
        c = LRU(3)
        c.put(1, 1); c.put(2, 2); c.put(3, 3)
        c.get(1)          # recency oldest->newest: 2,3,1
        c.put(4, 4)       # evict 2
        results = [c.get(2), c.get(1), c.get(3), c.get(4)]
        if results != [-1, 1, 3, 4]:
            defects.append("interleaved get/put eviction order incorrect")
    except Exception:
        defects.append("interleaved: raised exception")

    # check 7: capacity respected exactly (no over-fill)
    try:
        c = LRU(2)
        for i in range(5):
            c.put(i, i * 10)
        alive = [i for i in range(5) if c.get(i) != -1]
        if alive != [3, 4]:
            defects.append("capacity not respected exactly")
    except Exception:
        defects.append("capacity respected: raised exception")

    # check 8: mixed eviction + update-existing sequence
    try:
        c = LRU(2)
        c.put(1, 1); c.put(2, 2); c.put(3, 3)  # evict 1
        c.put(2, 22)  # update existing 2, refresh recency
        c.put(4, 4)   # should evict 3 (2 was just refreshed)
        if not (c.get(1) == -1 and c.get(3) == -1 and c.get(2) == 22 and c.get(4) == 4):
            defects.append("mixed eviction/update sequence incorrect")
    except Exception:
        defects.append("mixed sequence: raised exception")

    print(json.dumps({"defects": defects}))

main()