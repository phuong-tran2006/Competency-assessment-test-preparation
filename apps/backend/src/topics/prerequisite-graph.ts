export const PREREQUISITE_GRAPH_LOCK_ID = 742031;

export type PrerequisiteEdge = { topicId: string; prerequisiteId: string };

export function prerequisiteMap(edges: PrerequisiteEdge[]) {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    const parents = graph.get(edge.topicId) ?? [];
    parents.push(edge.prerequisiteId);
    graph.set(edge.topicId, parents);
  }
  return graph;
}

export function prerequisiteAncestors(graph: Map<string, string[]>, topicId: string) {
  const visited = new Set([topicId]);
  const queue = [{ id: topicId, level: 0 }];
  const ancestors: Array<{ id: string; level: number }> = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const id of graph.get(current.id) ?? []) {
      if (visited.has(id)) continue;
      visited.add(id);
      const ancestor = { id, level: current.level + 1 };
      ancestors.push(ancestor);
      queue.push(ancestor);
    }
  }
  return ancestors;
}

export function wouldCreateCycle(edges: PrerequisiteEdge[], topicId: string, prerequisiteId: string) {
  return topicId === prerequisiteId || prerequisiteAncestors(prerequisiteMap(edges), prerequisiteId)
    .some((ancestor) => ancestor.id === topicId);
}
