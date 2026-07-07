import sys, re, json

def extract_last_json(text):
    blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if not blocks:
        return None
    for b in reversed(blocks):
        try:
            return json.loads(b.strip())
        except Exception:
            continue
    return None

def simulate(N, tokens, T):
    toks = [{'pos': p, 'dir': d, 'alive': True} for (p, d) in tokens]
    fb = -1; fv = -1; tot = 0
    for step in range(1, T + 1):
        alive = [t for t in toks if t['alive']]
        posmap = {t['pos']: t for t in alive}
        bounced = set()
        for t in alive:
            if id(t) in bounced:
                continue
            if t['dir'] == 1:
                fwd = (t['pos'] + 1) % N
                if fwd in posmap:
                    o = posmap[fwd]
                    if o['dir'] == -1 and id(o) not in bounced:
                        bounced.add(id(t)); bounced.add(id(o))
        if bounced and fb == -1:
            fb = step
        for t in alive:
            if id(t) in bounced:
                t['dir'] = -t['dir']
            else:
                t['pos'] = (t['pos'] + t['dir']) % N
        cell = {}
        for t in alive:
            cell.setdefault(t['pos'], []).append(t)
        vt = 0
        for c, lst in cell.items():
            if len(lst) >= 2:
                for t in lst:
                    t['alive'] = False; vt += 1
        if vt and fv == -1:
            fv = step
        tot += vt
    final = sorted([[t['pos'], t['dir']] for t in toks if t['alive']])
    surv = sum(1 for t in toks if t['alive'])
    return final, fb, fv, tot, surv

def norm_config(v):
    out = []
    for pair in v:
        out.append([int(pair[0]), int(pair[1])])
    return sorted(out)

def main():
    text = sys.stdin.read()
    defects = []
    ans = extract_last_json(text)
    if ans is None or not isinstance(ans, dict):
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    cA, fbA, fvA, totA, survA = simulate(6, [[0,1],[3,-1],[1,1]], 4)
    cB, fbB, fvB, totB, survB = simulate(7, [[0,1],[4,-1],[2,1],[5,-1]], 5)
    cC, fbC, fvC, totC, survC = simulate(8, [[0,1],[2,-1],[4,1],[6,-1],[1,-1]], 6)

    try:
        if norm_config(ans["config_A"]) != cA:
            defects.append("config_A wrong")
    except Exception:
        defects.append("config_A missing/invalid")
    try:
        if norm_config(ans["config_B"]) != cB:
            defects.append("config_B wrong")
    except Exception:
        defects.append("config_B missing/invalid")
    try:
        if norm_config(ans["config_C"]) != cC:
            defects.append("config_C wrong")
    except Exception:
        defects.append("config_C missing/invalid")
    try:
        if int(ans["first_vanish_A"]) != fvA:
            defects.append("first_vanish_A wrong")
    except Exception:
        defects.append("first_vanish_A missing/invalid")
    try:
        if int(ans["first_bounce_B"]) != fbB:
            defects.append("first_bounce_B wrong")
    except Exception:
        defects.append("first_bounce_B missing/invalid")
    try:
        if int(ans["total_vanished_B"]) != totB:
            defects.append("total_vanished_B wrong")
    except Exception:
        defects.append("total_vanished_B missing/invalid")
    try:
        if int(ans["total_vanished_C"]) != totC:
            defects.append("total_vanished_C wrong")
    except Exception:
        defects.append("total_vanished_C missing/invalid")
    try:
        if int(ans["surviving_C"]) != survC:
            defects.append("surviving_C wrong")
    except Exception:
        defects.append("surviving_C missing/invalid")

    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["oracle error"]}))