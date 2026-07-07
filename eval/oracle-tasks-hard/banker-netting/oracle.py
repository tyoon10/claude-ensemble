import sys, re, json
from decimal import Decimal, ROUND_HALF_EVEN

def main():
    defects = []
    text = sys.stdin.read()
    obj = None
    try:
        blocks = re.findall(r"```[ \t]*json[ \t]*\r?\n(.*?)```", text, re.DOTALL | re.IGNORECASE)
        if not blocks:
            blocks = re.findall(r"```[ \t]*\r?\n(.*?)```", text, re.DOTALL)
        if blocks:
            obj = json.loads(blocks[-1].strip())
    except Exception:
        obj = None
    if not isinstance(obj, dict):
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    Q = Decimal('0.01')
    def rq(x): return x.quantize(Q, rounding=ROUND_HALF_EVEN)
    def stepwise(flows):
        bal = Decimal('0.00'); hist = []
        for f in flows:
            bal = rq(bal + Decimal(str(f))); hist.append(bal)
        return bal, hist
    def exact_cum(flows):
        s = Decimal('0'); hist=[]
        for f in flows:
            s += Decimal(str(f)); hist.append(rq(s))
        return hist
    def naive(flows):
        s = Decimal('0')
        for f in flows: s += Decimal(str(f))
        return rq(s)
    def diverge(flows):
        sw = stepwise(flows)[1]; ex = exact_cum(flows)
        for i,(a,b) in enumerate(zip(sw,ex), start=1):
            if a != b: return i
        return -1

    A=[0.10,0.20,0.005,0.005,0.005]
    B=[1.005,-0.010,0.025,-0.005,0.015]
    C=[0.125,0.125,-0.005,2.675,-0.015]

    gt = {
        "final_a": float(stepwise(A)[0]),
        "final_b": float(stepwise(B)[0]),
        "final_c": float(stepwise(C)[0]),
        "naive_b": float(naive(B)),
        "diverge_step_a": diverge(A),
        "diverge_step_c": diverge(C),
    }

    def getnum(k):
        v = obj.get(k)
        if isinstance(v, bool): raise ValueError()
        if isinstance(v, (int, float)): return float(v)
        if isinstance(v, str): return float(v.strip())
        raise ValueError()
    def getint(k):
        v = obj.get(k)
        if isinstance(v, bool): raise ValueError()
        if isinstance(v, int): return v
        if isinstance(v, float):
            if abs(v - round(v)) < 1e-9: return int(round(v))
            raise ValueError()
        if isinstance(v, str): return int(v.strip())
        raise ValueError()

    for k in ["final_a","final_b","final_c","naive_b"]:
        try:
            if abs(getnum(k) - gt[k]) > 1e-6:
                defects.append(f"{k} incorrect")
        except Exception:
            defects.append(f"{k} missing or invalid")
    for k in ["diverge_step_a","diverge_step_c"]:
        try:
            if getint(k) != gt[k]:
                defects.append(f"{k} incorrect")
        except Exception:
            defects.append(f"{k} missing or invalid")

    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["oracle error"]}))