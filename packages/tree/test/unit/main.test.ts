import { TreeNode } from '../../src/index.js';
import { describe, expect, it } from 'vitest';

describe('Tree', () => {
  it('should test serialization', async () => {
    const root = new TreeNode('root');
    const child1 = new TreeNode('child1');
    const child2 = new TreeNode('child2');
    const child3 = new TreeNode('child3');

    root.addChild(child1);
    child1.addChild(child2);
    root.addChild(child3);

    // everything should start off collapsed
    [root, child1, child2, child3].forEach((c) => {
      expect((c as TreeNode).collapsed).toBe(true);
    });
    expect(root.serialize()).toMatchSnapshot();

    child1.open();

    // everything except child 1 should be open
    [root, child2, child3].forEach((c) => {
      expect((c as TreeNode).collapsed).toBe(true);
    });
    expect(child1.collapsed).toEqual(false);
    let serialized = root.serialize();
    expect(serialized).toMatchSnapshot();

    [root, child1, child2, child3].forEach((c) => {
      (c as TreeNode).setCollapsed(true);
      expect((c as TreeNode).collapsed).toBe(true);
    });

    // should deserialize properly
    root.deserialize(serialized);
    [root, child2, child3].forEach((c) => {
      expect((c as TreeNode).collapsed).toBe(true);
    });
    expect(child1.collapsed).toEqual(false);

    // flatten again
    [root, child1, child2, child3].forEach((c) => {
      (c as TreeNode).setCollapsed(true);
    });

    root.deserialize({
      [root.getPathAsString()]: {
        collapsed: true
      },
      [child1.getPathAsString()]: {
        collapsed: false
      },
      [child2.getPathAsString()]: {
        collapsed: true
      },
      [child3.getPathAsString()]: {
        collapsed: true
      }
    });

    [root, child2, child3].forEach((c) => {
      expect((c as TreeNode).collapsed).toBe(true);
    });
    expect(child1.collapsed).toEqual(false);
  });
});
