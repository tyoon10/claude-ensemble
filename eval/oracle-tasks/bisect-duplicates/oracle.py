import sys, json, re, random

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
        il = ns["insert_left"]
        ir = ns["insert_right"]
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    def exp_left(a, x):
        return sum(1 for v in a if v < x)
    def exp_right(a, x):
        return sum(1 for v in a if v <= x)

    def chk(name, cond):
        try:
            if not cond():
                defects.append(name)
        except Exception:
            defects.append(name)

    chk("empty list", lambda: il([], 5) == 0 and ir([], 5) == 0)
    chk("all-equal x present", lambda: il([2,2,2,2], 2) == 0 and ir([2,2,2,2], 2) == 4)
    chk("x smaller than all", lambda: il([1,2,3], 0) == 0 and ir([1,2,3], 0) == 0)
    chk("x larger than all", lambda: il([1,2,3], 9) == 3 and ir([1,2,3], 9) == 3)
    chk("run of duplicates", lambda: il([1,2,2,2,3], 2) == 1 and ir([1,2,2,2,3], 2) == 4)
    chk("x between groups absent", lambda: il([1,1,3,3], 2) == 2 and ir([1,1,3,3], 2) == 2)
    chk("single element", lambda: il([5],5)==0 and ir([5],5)==1 and il([5],4)==0 and ir([5],4)==0 and il([5],6)==1 and ir([5],6)==1)
    chk("all-equal x outside", lambda: il([5,5,5],1)==0 and ir([5,5,5],1)==0 and il([5,5,5],9)==3 and ir([5,5,5],9)==3)

    def rand_prop():
        random.seed(20260706)
        for _ in range(400):
            n = random.randint(0, 12)
            a = sorted(random.randint(0, 6) for _ in range(n))
            x = random.randint(-1, 7)
            if il(a, x) != exp_left(a, x):
                return False
            if ir(a, x) != exp_right(a, x):
                return False
            if il(a, x) > ir(a, x):
                return False
        return True
    chk("randomized property", rand_prop)

    print(json.dumps({"defects": defects}))

main()