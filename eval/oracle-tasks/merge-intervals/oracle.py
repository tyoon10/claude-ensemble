import sys, re, json

def main():
    defects = []
    text = sys.stdin.read()
    try:
        blocks = re.findall(r"```python\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        code = blocks[-1]
        ns = {}
        exec(code, ns)
        f = ns.get("merge_intervals")
        if not callable(f):
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    def check(name, arg, expected):
        try:
            got = f([list(x) for x in arg])
            if got != expected:
                defects.append(name)
        except Exception:
            defects.append(name)

    # 1. empty list
    check("empty_list", [], [])
    # 2. single interval
    check("single_interval", [[5, 9]], [[5, 9]])
    # 3. touching endpoints merge
    check("touching_endpoints", [[1, 2], [2, 3]], [[1, 3]])
    # 4. fully nested interval
    check("fully_nested", [[1, 10], [3, 5]], [[1, 10]])
    # 5. duplicate intervals
    check("duplicate_intervals", [[2, 4], [2, 4], [2, 4]], [[2, 4]])
    # 6. unsorted input
    check("unsorted_input", [[8, 10], [1, 3], [2, 6], [15, 18]], [[1, 6], [8, 10], [15, 18]])
    # 7. negative coordinates
    check("negative_coords", [[-5, -3], [-4, -1], [0, 2]], [[-5, -1], [0, 2]])
    # 8. non-overlapping stay separate (gap of 1 is a real gap)
    check("gap_separate", [[1, 2], [4, 5]], [[1, 2], [4, 5]])
    # 9. classic leetcode example, unsorted
    check("classic_unsorted", [[15, 18], [2, 6], [1, 3], [8, 10]],
          [[1, 6], [8, 10], [15, 18]])
    # 10. all-overlap chain plus a separate interval
    check("overlap_chain", [[1, 4], [2, 5], [3, 6], [10, 12]], [[1, 6], [10, 12]])

    print(json.dumps({"defects": defects}))

main()