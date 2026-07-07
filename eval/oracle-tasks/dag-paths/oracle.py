import sys, json, re

def main():
    defects = []
    try:
        text = sys.stdin.read()
        blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL)
        if not blocks:
            print(json.dumps({"defects": ["missing or invalid deliverable"]}))
            return
        data = json.loads(blocks[-1].strip())
        if not isinstance(data, dict):
            raise ValueError("not an object")
    except Exception:
        print(json.dumps({"defects": ["missing or invalid deliverable"]}))
        return

    # Hardcoded DAG (adjacency list). H is the sink (no outgoing edges).
    adj = {
        'A': ['B', 'C'],
        'B': ['D'],
        'C': ['D', 'F'],
        'D': ['E', 'F'],
        'E': ['G'],
        'F': ['G'],
        'G': ['H'],
        'H': [],
    }

    # Number of distinct directed paths s->t with length>=0
    # (so count(s,s)=1 via the empty path; DAG has no cycles).
    memo = {}
    def count(s, t):
        if (s, t) in memo:
            return memo[(s, t)]
        total = 1 if s == t else 0
        for w in adj[s]:
            total += count(w, t)
        memo[(s, t)] = total
        return total

    # Longest path length measured in EDGES.
    lm = {}
    def longest(u):
        if u in lm:
            return lm[u]
        best = 0
        for w in adj[u]:
            best = max(best, 1 + longest(w))
        lm[u] = best
        return best

    expected = {
        'paths_A_to_H': count('A', 'H'),
        'paths_A_to_F': count('A', 'F'),
        'paths_A_to_G': count('A', 'G'),
        'paths_C_to_H': count('C', 'H'),
        'paths_D_to_H': count('D', 'H'),
        'paths_A_to_A': count('A', 'A'),
        'paths_H_to_A': count('H', 'A'),
        'longest_path_length': max(longest(u) for u in adj),
    }

    for k, v in expected.items():
        try:
            if k not in data:
                defects.append("missing key: " + k)
            elif int(data[k]) != v:
                defects.append("wrong value for " + k)
        except Exception:
            defects.append("wrong value for " + k)

    print(json.dumps({"defects": defects}))

try:
    main()
except Exception:
    print(json.dumps({"defects": ["missing or invalid deliverable"]}))
