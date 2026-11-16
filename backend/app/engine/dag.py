from typing import List, Dict, Set
from collections import defaultdict, deque

class DAGValidationError(Exception):
    pass

class WorkflowDAG:
    """
    Represents and validates the Directed Acyclic Graph of a workflow.
    Provides topological sorting and parent/child relationship resolution.
    """
    def __init__(self, nodes: List[Dict], edges: List[Dict]):
        self.nodes = {n["id"]: n for n in nodes}
        self.edges = edges
        
        # In-degree, parents and children maps
        self.parents: Dict[str, Set[str]] = defaultdict(set)
        self.children: Dict[str, Set[str]] = defaultdict(set)
        self.outgoing_edges: Dict[str, List[Dict]] = defaultdict(list)
        self.incoming_edges: Dict[str, List[Dict]] = defaultdict(list)
        
        for edge in edges:
            src = edge["source"]
            tgt = edge["target"]
            if src in self.nodes and tgt in self.nodes:
                self.children[src].add(tgt)
                self.parents[tgt].add(src)
                self.outgoing_edges[src].append(edge)
                self.incoming_edges[tgt].append(edge)

    def validate_and_sort(self) -> List[List[str]]:
        """
        Kahn's Algorithm returning parallel execution tiers (waves).
        Each tier contains node IDs that can run concurrently!
        Raises DAGValidationError if cyclic loops are found.
        """
        in_degree = {nid: len(self.parents[nid]) for nid in self.nodes}
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        
        tiers: List[List[str]] = []
        visited_count = 0
        
        while queue:
            current_tier = list(queue)
            tiers.append(current_tier)
            queue.clear()
            
            for u in current_tier:
                visited_count += 1
                for v in self.children[u]:
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        queue.append(v)
                        
        if visited_count != len(self.nodes):
            raise DAGValidationError("Workflow graph contains illegal cyclic dependencies.")
            
        return tiers

    def get_parent_ids(self, node_id: str) -> Set[str]:
        return self.parents.get(node_id, set())

    def get_child_ids(self, node_id: str) -> Set[str]:
        return self.children.get(node_id, set())

    def get_outgoing_edges(self, node_id: str) -> List[Dict]:
        return self.outgoing_edges.get(node_id, [])

    def get_descendants(self, node_id: str) -> Set[str]:
        """Returns all descendant node IDs downstream of node_id."""
        descendants: Set[str] = set()
        stack = list(self.children.get(node_id, []))
        while stack:
            curr = stack.pop()
            if curr not in descendants:
                descendants.add(curr)
                stack.extend(self.children.get(curr, []))
        return descendants

