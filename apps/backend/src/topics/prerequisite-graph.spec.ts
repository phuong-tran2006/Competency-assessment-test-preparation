import { prerequisiteAncestors, prerequisiteMap, wouldCreateCycle } from './prerequisite-graph';

describe('Prerequisite graph', () => {
  const edges = [
    { topicId: 'd', prerequisiteId: 'b' }, { topicId: 'd', prerequisiteId: 'c' },
    { topicId: 'b', prerequisiteId: 'a' }, { topicId: 'c', prerequisiteId: 'a' },
  ];
  it('returns unique ancestors at their shortest distance', () => {
    expect(prerequisiteAncestors(prerequisiteMap(edges), 'd')).toEqual([
      { id: 'b', level: 1 }, { id: 'c', level: 1 }, { id: 'a', level: 2 },
    ]);
  });
  it('rejects self references and transitive cycles', () => {
    expect(wouldCreateCycle(edges, 'a', 'a')).toBe(true);
    expect(wouldCreateCycle(edges, 'a', 'd')).toBe(true);
    expect(wouldCreateCycle(edges, 'e', 'd')).toBe(false);
  });
  it('terminates even if legacy data already contains a cycle', () => {
    expect(prerequisiteAncestors(prerequisiteMap([...edges, { topicId: 'a', prerequisiteId: 'd' }]), 'd')).toHaveLength(3);
  });
});
