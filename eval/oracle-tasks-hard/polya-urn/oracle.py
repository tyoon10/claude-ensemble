import sys, re, json
def main():
    defects=[]
    text=sys.stdin.read()
    blocks=re.findall(r"```json\s*(.*?)```", text, re.DOTALL|re.IGNORECASE)
    ans=None
    if blocks:
        try: ans=json.loads(blocks[-1].strip())
        except Exception: ans=None
    if not isinstance(ans,dict):
        print(json.dumps({"defects":["missing or invalid deliverable"]})); return
    from fractions import Fraction as F
    def step(r,b):
        tot=r+b; out=[(F(r,tot),r+2,b,'R')]
        if b>0:
            if b-1>=1: out.append((F(b,tot),r+1,b-1,'B'))
            else: out.append((F(b,tot),r,b+1,'B'))
        return out
    paths=[]
    def rec(r,b,p,seq):
        if len(seq)==3: paths.append((p,seq,(r,b))); return
        for pr,nr,nb,c in step(r,b): rec(nr,nb,p*pr,seq+[c])
    rec(2,2,F(1),[])
    # sanity: total probability is 1
    if sum(p for p,_,_ in paths)!=F(1):
        print(json.dumps({"defects":["oracle self-check failed"]})); return
    exp={
        'p_three_reds': sum(p for p,s,_ in paths if s==['R','R','R']),
        'p_exactly_one_blue_draw': sum(p for p,s,_ in paths if s.count('B')==1),
        'exp_red_after': sum(p*st[0] for p,s,st in paths),
        'exp_blue_after': sum(p*st[1] for p,s,st in paths),
        'p_second_draw_blue': sum(p for p,s,_ in paths if s[1]=='B'),
        'p_blue_two_after': sum(p for p,s,st in paths if st[1]==2),
    }
    for k,v in exp.items():
        try:
            got=float(ans[k])
        except Exception:
            defects.append(f"{k}: missing or non-numeric"); continue
        if abs(got-float(v))>1e-6:
            defects.append(f"{k}: expected {float(v):.10f} got {got}")
    print(json.dumps({"defects":defects}))
try: main()
except Exception: print(json.dumps({"defects":["missing or invalid deliverable"]}))