import { useEffect, useRef } from 'react';
import { Block } from '@/types/index';
import { isStatusConsistentWithPage, getStatusForPage, isGTDPage } from '@/utils/gtdStatusMapper';
import { updateBlock } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that ensures task blocks have status consistent with their page location
 * Automatically fixes inconsistencies when detected
 * @param autoFix - Whether to automatically fix inconsistencies (default: true)
 * @param delay - Delay before auto-fixing in ms (default: 3000)
 */
export const useStatusConsistency = (
  blocks: Block[], 
  pageId: string,
  options: { autoFix?: boolean; delay?: number } = {}
) => {
  const { autoFix = true, delay = 3000 } = options;
  const { user } = useAuth();
  const fixingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !pageId) return;
    
    // Only enforce consistency for GTD pages
    if (!isGTDPage(pageId)) return;

    // Check for blocks with inconsistent status
    const checkAndFixConsistency = async () => {
      const todoBlocks = blocks.filter(block => block.type === 'todo-list');
      
      for (const block of todoBlocks) {
        // Skip if we're already fixing this block
        if (fixingRef.current.has(block.id)) continue;
        
        // Check if status is consistent with page
        if (!isStatusConsistentWithPage(block.taskMetadata, pageId)) {
          const expectedStatus = getStatusForPage(pageId);
          
          // Skip if no expected status (shouldn't happen for GTD pages)
          if (!expectedStatus) continue;
          
          // Don't override 'done' status (this check is redundant now but kept for clarity)
          if (block.taskMetadata?.status === 'done') continue;
          
          console.log(`[Status Consistency] Fixing block ${block.id}: ${block.taskMetadata?.status} -> ${expectedStatus}`);
          
          // Mark as being fixed to prevent duplicate updates
          fixingRef.current.add(block.id);
          
          try {
            // Update the block with correct status
            await updateBlock(user.uid, pageId, block.id, {
              taskMetadata: {
                ...block.taskMetadata,
                status: expectedStatus
              }
            });
            
            console.log(`[Status Consistency] Fixed block ${block.id} status to ${expectedStatus}`);
          } catch (error) {
            console.error(`[Status Consistency] Failed to fix block ${block.id}:`, error);
          } finally {
            // Remove from fixing set after attempt
            setTimeout(() => {
              fixingRef.current.delete(block.id);
            }, 2000); // Wait 2 seconds before allowing another fix attempt
          }
        }
      }
    };

    // Run check after a short delay to avoid running during rapid updates
    const timer = setTimeout(checkAndFixConsistency, 1000);
    
    return () => clearTimeout(timer);
  }, [blocks, pageId, user]);
};