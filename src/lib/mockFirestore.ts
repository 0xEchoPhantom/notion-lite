import { Block, Page, BlockType } from '@/types/index';

// In-memory storage for local development
const mockPages: Map<string, Page> = new Map();
const mockBlocks: Map<string, Block> = new Map();
let idCounter = 1;

const generateId = () => `mock-${idCounter++}`;

const createMockTimestamp = () => new Date();

// Mock Page operations
export const createPage = async (userId: string, title: string): Promise<string> => {
  const id = generateId();
  
  // Get the current highest order to append the new page at the end
  const existingPages = Array.from(mockPages.values());
  const maxOrder = existingPages.reduce((max, page) => {
    return Math.max(max, page.order || 0);
  }, 0);
  
  const page: Page = {
    id,
    title,
    order: maxOrder + 1,
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
  };
  mockPages.set(id, page);
  return id;
};

export const getPages = async (_userId: string): Promise<Page[]> => {
  return Array.from(mockPages.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const updatePage = async (_userId: string, pageId: string, updates: Partial<Page>): Promise<void> => {
  const page = mockPages.get(pageId);
  if (page) {
    mockPages.set(pageId, {
      ...page,
      ...updates,
      updatedAt: createMockTimestamp(),
    });
  }
};

export const deletePage = async (userId: string, pageId: string): Promise<void> => {
  mockPages.delete(pageId);
  // Also delete all blocks in this page
  for (const [blockId, block] of mockBlocks.entries()) {
    if (block.id.includes(pageId)) { // Simple association check
      mockBlocks.delete(blockId);
    }
  }
};

// Mock Block operations
export const createBlock = async (
  userId: string,
  pageId: string,
  blockData: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const id = generateId();
  const block: Block = {
    ...blockData,
    id,
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
  };
  mockBlocks.set(id, block);
  return id;
};

export const getBlocks = async (userId: string, pageId: string): Promise<Block[]> => {
  const blocks = Array.from(mockBlocks.values());
  return blocks.sort((a, b) => a.order - b.order);
};

export const updateBlock = async (
  userId: string,
  pageId: string,
  blockId: string,
  updates: Partial<Block>
): Promise<void> => {
  const block = mockBlocks.get(blockId);
  if (block) {
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    mockBlocks.set(blockId, {
      ...block,
      ...cleanUpdates,
      updatedAt: createMockTimestamp(),
    });
  }
};

export const deleteBlock = async (userId: string, pageId: string, blockId: string): Promise<void> => {
  mockBlocks.delete(blockId);
};

export const reorderBlocks = async (
  userId: string,
  pageId: string,
  blocks: Block[]
): Promise<void> => {
  blocks.forEach(block => {
    mockBlocks.set(block.id, {
      ...block,
      updatedAt: createMockTimestamp(),
    });
  });
};

// Initialize with some sample data
export const initializeMockData = () => {
  if (mockPages.size === 0) {
    // Create a default page
    const pageId = generateId();
    const page: Page = {
      id: pageId,
      title: 'Welcome to Notion Lite',
      order: 1,
      createdAt: createMockTimestamp(),
      updatedAt: createMockTimestamp(),
    };
    mockPages.set(pageId, page);

    // Create some sample blocks
    const blocks = [
      {
        id: generateId(),
        type: 'paragraph' as BlockType,
        content: 'Welcome to your Notion-like editor!',
        indentLevel: 0,
        order: 0,
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
      },
      {
        id: generateId(),
        type: 'paragraph' as BlockType,
        content: 'Try typing "- " to create a bullet list',
        indentLevel: 0,
        order: 1,
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
      },
      {
        id: generateId(),
        type: 'paragraph' as BlockType,
        content: 'Or type "[] " to create a todo list',
        indentLevel: 0,
        order: 2,
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
      },
    ];

    blocks.forEach(block => {
      mockBlocks.set(block.id, block);
    });
  }
};

export const updatePageTitle = async (userId: string, pageId: string, title: string): Promise<void> => {
  const page = mockPages.get(pageId);
  if (page) {
    mockPages.set(pageId, {
      ...page,
      title,
      updatedAt: createMockTimestamp(),
    });
  }
};

export const updatePageOrder = async (userId: string, pageId: string, order: number): Promise<void> => {
  const page = mockPages.get(pageId);
  if (page) {
    mockPages.set(pageId, {
      ...page,
      order,
      updatedAt: createMockTimestamp(),
    });
  }
};

export const reorderPages = async (userId: string, pageUpdates: { id: string; order: number }[]): Promise<void> => {
  pageUpdates.forEach(({ id, order }) => {
    const page = mockPages.get(id);
    if (page) {
      mockPages.set(id, {
        ...page,
        order,
        updatedAt: createMockTimestamp(),
      });
    }
  });
};

const mockFirestore = {
  createPage,
  getPages,
  updatePage,
  updatePageTitle,
  updatePageOrder,
  reorderPages,
  deletePage,
  createBlock,
  getBlocks,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  initializeMockData,
};

export default mockFirestore;
