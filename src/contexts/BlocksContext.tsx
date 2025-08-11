'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Block, BlockType } from '@/types/index';
import {
  createBlock,
  updateBlock,
  archiveBlock,
  subscribeToBlocks,
  reorderBlocks,
} from '@/lib/firestore';
import { useAuth } from './AuthContext';

interface BlocksState {
  blocks: Block[];
  loading: boolean;
}

type BlocksAction =
  | { type: 'SET_BLOCKS'; payload: Block[] }
  | { type: 'ADD_BLOCK'; payload: Block }
  | { type: 'UPDATE_BLOCK'; payload: { id: string; updates: Partial<Block> } }
  | { type: 'DELETE_BLOCK'; payload: string }
  | { type: 'REORDER_BLOCKS'; payload: Block[] }
  | { type: 'SET_LOADING'; payload: boolean };

const blocksReducer = (state: BlocksState, action: BlocksAction): BlocksState => {
  switch (action.type) {
    case 'SET_BLOCKS':
      return { ...state, blocks: action.payload, loading: false };
    case 'ADD_BLOCK':
      return { ...state, blocks: [...state.blocks, action.payload] };
    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map(block =>
          block.id === action.payload.id
            ? { ...block, ...action.payload.updates }
            : block
        ),
      };
    case 'DELETE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.filter(block => block.id !== action.payload),
      };
    case 'REORDER_BLOCKS':
      return { ...state, blocks: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

interface BlocksContextType {
  blocks: Block[];
  loading: boolean;
  pageId: string;
  addBlock: (block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBlockContent: (id: string, updates: Partial<Block>) => Promise<void>;
  deleteBlockById: (id: string) => Promise<void>;
  reorderBlocksList: (blockUpdates: { id: string; order: number }[]) => Promise<void>;
  convertBlockType: (id: string, newType: BlockType) => Promise<void>;
}

const BlocksContext = createContext<BlocksContextType | undefined>(undefined);

export const useBlocks = () => {
  const context = useContext(BlocksContext);
  if (context === undefined) {
    throw new Error('useBlocks must be used within a BlocksProvider');
  }
  return context;
};

interface BlocksProviderProps {
  children: React.ReactNode;
  pageId: string;
}

export const BlocksProvider: React.FC<BlocksProviderProps> = ({ children, pageId }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(blocksReducer, {
    blocks: [],
    loading: true,
  });

  useEffect(() => {
    if (!user || !pageId) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    const unsubscribe = subscribeToBlocks(user.uid, pageId, (blocks) => {
      dispatch({ type: 'SET_BLOCKS', payload: blocks });
    });

    return () => unsubscribe();
  }, [user, pageId]);

  const addBlock = async (block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    if (!pageId || pageId === '') {
      console.error('Invalid pageId for addBlock:', pageId);
      throw new Error('Invalid page ID');
    }
    
    const blockId = await createBlock(user.uid, pageId, block);
    return blockId;
  };

  const updateBlockContent = async (id: string, updates: Partial<Block>) => {
    if (!user) throw new Error('User not authenticated');
    if (!pageId || pageId === '') {
      console.error('Invalid pageId for updateBlockContent:', pageId);
      throw new Error('Invalid page ID');
    }
    
    await updateBlock(user.uid, pageId, id, updates);
  };

  const deleteBlockById = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    if (!pageId || pageId === '') {
      console.error('Invalid pageId for deleteBlockById:', pageId);
      throw new Error('Invalid page ID');
    }
    
    // Recycle Bin: archive block instead of permanent delete
    await archiveBlock(user.uid, pageId, id);
  };

  const reorderBlocksList = async (blockUpdates: { id: string; order: number }[]) => {
    if (!user) throw new Error('User not authenticated');
    
    await reorderBlocks(user.uid, blockUpdates);
  };

  const convertBlockType = async (id: string, newType: BlockType) => {
    if (!user) throw new Error('User not authenticated');
    if (!pageId || pageId === '') {
      console.error('Invalid pageId for convertBlockType:', pageId);
      throw new Error('Invalid page ID');
    }
    
    await updateBlock(user.uid, pageId, id, { type: newType });
  };

  const value = {
    blocks: state.blocks,
    loading: state.loading,
    pageId,
    addBlock,
    updateBlockContent,
    deleteBlockById,
    reorderBlocksList,
    convertBlockType,
  };

  return <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>;
};
