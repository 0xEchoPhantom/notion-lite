'use client';

import React, { useState } from 'react';
import { Block as BlockType, BlockType as BType } from '@/types/index';
import { TaskCompany } from '@/types/task';
import { SlashMenu } from './SlashMenu';
import { TokenSuggest } from './TokenSuggest';
import { useBlockLogic } from '@/hooks/useBlockLogic';
import { BlockWrapper, BlockIcon, DragHandle, BlockInput } from './block-parts';
import { TaskChips } from '@/components/tasks/TaskChips';
import { parseTaskTokens } from '@/utils/smartTokenParser';
import { processAllTokens, validateToken, TokenHistory, TokenSnapshot } from '@/utils/tokenProcessor';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { 
  addAssigneeToSettings, 
  addCompanyToSettings, 
  addValueToSettings, 
  addEffortToSettings,
  loadTokenSettings 
} from '@/lib/tokenSettings';

interface SimpleBlockProps {
  block: BlockType;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (event?: React.MouseEvent) => void;
  onNewBlock: (type?: BType, indentLevel?: number) => void;
  onCreateBlock?: (type: BType, content: string, afterBlockId: string, indentLevel?: number) => Promise<string>;
  onMergeUp: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onDragStart?: (blockId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, blockId: string) => void;
  onDrop?: (e: React.DragEvent, targetBlockId: string) => void;
  isDraggedOver?: boolean;
  isDragging?: boolean;
  dropPosition?: 'above' | 'below' | null;
  mode?: 'notes' | 'gtd'; // Add mode prop to control available block types
}

export const SimpleBlock: React.FC<SimpleBlockProps> = (props) => {
  const {
    block,
    isSelected,
    isMultiSelected = false,
    onSelect,
    onNewBlock,
    onCreateBlock,
    onMergeUp,
    onMoveUp,
    onMoveDown,
    onIndent,
    onOutdent,
    onDeleteBlock,
    onDuplicateBlock,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    isDraggedOver = false,
    isDragging = false,
    dropPosition = null,
    mode = 'notes',
  } = props;

  const { updateBlockContent } = useBlocksWithKeyboard();
  const { user } = useAuth();
  const [showTokenSuggest, setShowTokenSuggest] = useState(false);
  const [tokenSuggestPosition, setTokenSuggestPosition] = useState({ x: 0, y: 0 });
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [tokenHistory] = useState(new TokenHistory());
  const [processingTokens, setProcessingTokens] = useState(false);
  
  // Handle @ token detection for todo-list blocks
  const handleTokenTrigger = (input: string, cursorPos: number | null, inputElement: HTMLTextAreaElement) => {
    if (block.type !== 'todo-list') return;
    if (cursorPos === null || cursorPos === undefined) return;
    
    const textBeforeCursor = input.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're still in a token (no space after @)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        // Calculate approximate position of the @ symbol
        const rect = inputElement.getBoundingClientRect();
        
        // Create a temporary element to measure text width
        const measureElement = document.createElement('span');
        measureElement.style.font = window.getComputedStyle(inputElement).font;
        measureElement.style.position = 'absolute';
        measureElement.style.visibility = 'hidden';
        measureElement.style.whiteSpace = 'pre';
        measureElement.textContent = input.substring(0, lastAtIndex);
        document.body.appendChild(measureElement);
        
        const textWidth = measureElement.offsetWidth;
        document.body.removeChild(measureElement);
        
        // Position menu near the @ symbol
        const scrollLeft = inputElement.scrollLeft;
        const x = rect.left + textWidth - scrollLeft + 10; // Add small offset
        const y = rect.bottom + 4;
        
        setTokenSearchQuery(textAfterAt);
        setTokenSuggestPosition({ x, y });
        setShowTokenSuggest(true);
      } else {
        setShowTokenSuggest(false);
      }
    } else {
      setShowTokenSuggest(false);
    }
  };
  
  const handleTokenSelect = async (token: string) => {
    // Remove the @token from content and update metadata
    if (inputRef.current) {
      const cursorPos = inputRef.current.selectionStart;
      const content = inputRef.current.value;
      const textBeforeCursor = content.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        // Remove the @ and everything after it up to cursor from content
        const newContent = 
          content.substring(0, lastAtIndex) + 
          content.substring(cursorPos);
        
        // Update the input value directly (removing the @token)
        inputRef.current.value = newContent;
        
        // Parse the selected token to extract metadata
        const parsed = parseTaskTokens(token);
        
        // Build the updated taskMetadata, removing undefined values
        const updatedMetadata: Record<string, unknown> = {
          ...(block.taskMetadata || {})
        };
        
        // Only add defined values from parsed tokens
        if (parsed.values.value !== undefined) updatedMetadata.value = parsed.values.value;
        if (parsed.values.effort !== undefined) updatedMetadata.effort = parsed.values.effort;
        if (parsed.values.dueDate !== undefined) updatedMetadata.dueDate = parsed.values.dueDate;
        if (parsed.values.assignee !== undefined) updatedMetadata.assignee = parsed.values.assignee;
        if (parsed.values.company !== undefined) updatedMetadata.company = parsed.values.company;
        
        // Auto-save new values to Token Manager for "Create new" selections
        // We detect this by checking if the token closely matches what the user typed
        if (user && tokenSearchQuery) {
          const tokenWithoutAt = token.replace('@', '').toLowerCase();
          const queryLower = tokenSearchQuery.toLowerCase();
          
          // Check if this is a new value (query matches token, indicating "Create new" was selected)
          // Also handle case where user selected a value that's not in Manager but frequently used
          const isNewCreation = tokenWithoutAt === queryLower || tokenWithoutAt.includes(queryLower);
          
          if (isNewCreation) {
            try {
              // Save based on the type of token created
              if (parsed.values.assignee !== undefined) {
                const assigneeName = String(parsed.values.assignee);
                // Check if not already in settings (case-insensitive)
                const settings = await loadTokenSettings(user.uid);
                const exists = settings?.assignees?.some(a => a.toLowerCase() === assigneeName.toLowerCase());
                if (!exists) {
                  await addAssigneeToSettings(user.uid, assigneeName);
                }
              }
              if (parsed.values.company !== undefined) {
                const companyName = String(parsed.values.company);
                // Companies are always uppercase
                const normalizedCompany = companyName.toUpperCase();
                const settings = await loadTokenSettings(user.uid);
                const exists = settings?.companies?.includes(normalizedCompany as TaskCompany);
                if (!exists) {
                  await addCompanyToSettings(user.uid, normalizedCompany);
                }
              }
              if (parsed.values.value !== undefined) {
                const value = parsed.values.value;
                const settings = await loadTokenSettings(user.uid);
                const exists = settings?.commonValues?.includes(value);
                if (!exists) {
                  await addValueToSettings(user.uid, value);
                }
              }
              if (parsed.values.effort !== undefined) {
                const effort = parsed.values.effort;
                const settings = await loadTokenSettings(user.uid);
                const exists = settings?.commonEfforts?.includes(effort);
                if (!exists) {
                  await addEffortToSettings(user.uid, effort);
                }
              }
            } catch (error) {
              console.error('Error saving to token settings:', error);
            }
          }
        }
        
        // Update block with clean content and new metadata
        await updateBlockContent(block.id, { 
          content: newContent,
          taskMetadata: updatedMetadata
        });
        
        // Create and dispatch input event to trigger UI update
        const inputEvent = new Event('input', { bubbles: true });
        Object.defineProperty(inputEvent, 'target', {
          writable: false,
          value: inputRef.current
        });
        
        // Manually trigger the input handler for local state
        if (handleInput) {
          const typedEvent = inputEvent as unknown as React.FormEvent<HTMLTextAreaElement>;
          handleInput(typedEvent);
        }
        
        // Move cursor to where the @ was
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(lastAtIndex, lastAtIndex);
            inputRef.current.focus();
          }
        }, 0);
      }
    }
    
    setShowTokenSuggest(false);
    setTokenSearchQuery('');
  };

  // Process all @ tokens in the content
  const processAllTokensInContent = async (content: string) => {
    if (block.type !== 'todo-list' || !user) return { content, metadata: {} };
    
    setProcessingTokens(true);
    
    try {
      // Save current state for undo
      const currentSnapshot: TokenSnapshot = {
        content: block.content,
        tokens: [],
        metadata: (block.taskMetadata || {}) as Record<string, unknown>,
        timestamp: Date.now()
      };
      tokenHistory.push(currentSnapshot);
      
      // Process all tokens
      const processed = processAllTokens(content);
      
      // Validate all tokens
      const validationErrors: string[] = [];
      for (const token of processed.tokens) {
        const validation = validateToken(token.value, token.type);
        if (!validation.valid) {
          validationErrors.push(`${token.fullMatch}: ${validation.error}`);
        }
      }
      
      // If there are validation errors, show them but continue processing
      if (validationErrors.length > 0) {
        console.warn('Token validation errors:', validationErrors);
        // Could show a toast notification here
      }
      
      // Auto-save new values to Token Manager
      for (const token of processed.tokens) {
        try {
          switch (token.type) {
            case 'assignee':
              const settings = await loadTokenSettings(user.uid);
              const exists = settings?.assignees?.some(a => 
                a.toLowerCase() === token.value.toLowerCase()
              );
              if (!exists) {
                await addAssigneeToSettings(user.uid, token.value);
              }
              break;
              
            case 'company':
              const companySettings = await loadTokenSettings(user.uid);
              const companyExists = companySettings?.companies?.includes(
                token.value.toUpperCase() as TaskCompany
              );
              if (!companyExists) {
                await addCompanyToSettings(user.uid, token.value.toUpperCase());
              }
              break;
              
            case 'value':
              // Parse the value
              const numericValue = parseFloat(token.value.replace(/[kmb]/i, ''));
              let multiplier = 1;
              if (token.value.toLowerCase().includes('k')) multiplier = 1000;
              else if (token.value.toLowerCase().includes('m')) multiplier = 1000000;
              else if (token.value.toLowerCase().includes('b')) multiplier = 1000000000;
              
              const finalValue = numericValue * multiplier;
              const valueSettings = await loadTokenSettings(user.uid);
              const valueExists = valueSettings?.commonValues?.includes(finalValue);
              if (!valueExists) {
                await addValueToSettings(user.uid, finalValue);
              }
              break;
              
            case 'effort':
              // Parse the effort
              const effortValue = parseFloat(token.value.replace(/[mhdw]/i, ''));
              let effortMultiplier = 1; // hours
              const unit = token.value.toLowerCase().slice(-1);
              if (unit === 'm') effortMultiplier = 1/60;
              else if (unit === 'd') effortMultiplier = 8;
              else if (unit === 'w') effortMultiplier = 40;
              
              const finalEffort = effortValue * effortMultiplier;
              const effortSettings = await loadTokenSettings(user.uid);
              const effortExists = effortSettings?.commonEfforts?.includes(finalEffort);
              if (!effortExists) {
                await addEffortToSettings(user.uid, finalEffort);
              }
              break;
          }
        } catch (error) {
          console.error(`Error saving token ${token.fullMatch}:`, error);
        }
      }
      
      return {
        content: processed.cleanContent,
        metadata: processed.metadata
      };
      
    } catch (error) {
      console.error('Error processing tokens:', error);
      return { content, metadata: block.taskMetadata || {} };
    } finally {
      setProcessingTokens(false);
    }
  };

  const {
    inputRef,
    slashMenuRef,
    localContent,
    isFocused,
    showSlashMenu,
    slashMenuPosition,
    slashSearchQuery,
    handleInput,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleFocus,
    handleBlur,
    handleCompositionStart,
    handleCompositionEnd,
    handleSlashMenuSelect,
    handleToggleCheck,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleBlockClick,
    setShowSlashMenu,
    setSlashSearchQuery,
  } = useBlockLogic({
    block,
    isSelected,
    onDragStart,
    onDragEnd,
    onCreateBlock,
    onNewBlock,
    onSelect,
    onMoveUp,
    onMoveDown,
    onIndent,
    onOutdent,
    onDeleteBlock,
    onMergeUp,
    onDuplicateBlock,
    onDragOver,
    onDrop,
  });

  return (
    <>
      <BlockWrapper
        blockId={block.id}
        isSelected={isSelected}
        isMultiSelected={isMultiSelected}
        isDragging={isDragging}
        isDraggedOver={isDraggedOver}
        dropPosition={dropPosition}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBlockClick}
      >
        <DragHandle
          isSelected={isSelected}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onSelect={() => onSelect()}
        />
        
        <BlockIcon
          block={block}
          onToggleCheck={handleToggleCheck}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <BlockInput
              block={block}
              localContent={localContent}
              isFocused={isFocused}
              inputRef={inputRef}
              onChange={(e) => {
                handleChange(e);
                // Check for @ trigger
                const target = e.target as HTMLTextAreaElement;
                handleTokenTrigger(target.value, target.selectionStart, target);
              }}
              onKeyDown={async (e) => {
                // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo) for token operations
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                  const snapshot = tokenHistory.undo();
                  if (snapshot && inputRef.current) {
                    e.preventDefault();
                    inputRef.current.value = snapshot.content;
                    await updateBlockContent(block.id, {
                      content: snapshot.content,
                      taskMetadata: snapshot.metadata
                    });
                    return;
                  }
                }
                
                if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
                    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                  const snapshot = tokenHistory.redo();
                  if (snapshot && inputRef.current) {
                    e.preventDefault();
                    inputRef.current.value = snapshot.content;
                    await updateBlockContent(block.id, {
                      content: snapshot.content,
                      taskMetadata: snapshot.metadata
                    });
                    return;
                  }
                }
                
                // While the token suggest menu is open, keep navigation scoped to the menu
                if (showTokenSuggest) {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab') {
                    // Prevent textarea caret movement or block-level shortcuts,
                    // but allow the native event to bubble to the menu's window listener
                    e.preventDefault();
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowTokenSuggest(false);
                    // Remove the incomplete @ token when escaping
                    if (inputRef.current) {
                      const content = inputRef.current.value;
                      const cursorPos = inputRef.current.selectionStart;
                      const textBeforeCursor = content.substring(0, cursorPos);
                      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                      if (lastAtIndex !== -1) {
                        const newContent = content.substring(0, lastAtIndex) + content.substring(cursorPos);
                        inputRef.current.value = newContent;
                        inputRef.current.setSelectionRange(lastAtIndex, lastAtIndex);
                        // Trigger change event
                        const event = new Event('input', { bubbles: true });
                        inputRef.current.dispatchEvent(event);
                      }
                    }
                    return;
                  }
                }
                handleKeyDown(e);
              }}
              onPaste={async (e) => {
                // Handle pasted content with @ tokens
                if (block.type === 'todo-list') {
                  const pastedText = e.clipboardData?.getData('text') || '';
                  
                  // Check if pasted content contains @ tokens
                  if (pastedText.includes('@')) {
                    e.preventDefault();
                    
                    // Get current cursor position and content
                    const input = e.target as HTMLTextAreaElement;
                    const currentContent = input.value;
                    const cursorPos = input.selectionStart || 0;
                    const selectionEnd = input.selectionEnd || cursorPos;
                    
                    // Insert pasted text
                    const newContent = 
                      currentContent.substring(0, cursorPos) + 
                      pastedText + 
                      currentContent.substring(selectionEnd);
                    
                    // Update input value
                    input.value = newContent;
                    
                    // Set cursor position after pasted text
                    const newCursorPos = cursorPos + pastedText.length;
                    input.setSelectionRange(newCursorPos, newCursorPos);
                    
                    // Process all tokens in the new content after a short delay
                    setTimeout(async () => {
                      if (inputRef.current) {
                        const processed = await processAllTokensInContent(newContent);
                        
                        if (processed.content !== newContent || 
                            Object.keys(processed.metadata).length > 0) {
                          
                          inputRef.current.value = processed.content;
                          
                          await updateBlockContent(block.id, {
                            content: processed.content,
                            taskMetadata: { 
                              ...(block.taskMetadata || {}), 
                              ...processed.metadata 
                            }
                          });
                          
                          // Trigger change event
                          const event = new Event('input', { bubbles: true });
                          inputRef.current.dispatchEvent(event);
                        }
                      }
                    }, 100);
                    
                    return;
                  }
                }
                
                // Default paste handling
                handlePaste(e);
              }}
              onFocus={handleFocus}
              onBlur={async () => {
                // Process all @ tokens when leaving the input
                if (inputRef.current && block.type === 'todo-list') {
                  const currentContent = inputRef.current.value;
                  
                  // Remove incomplete @ token if menu is open
                  let contentToProcess = currentContent;
                  if (showTokenSuggest) {
                    const cursorPos = inputRef.current.selectionStart || 0;
                    const textBeforeCursor = currentContent.substring(0, cursorPos);
                    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                    if (lastAtIndex !== -1) {
                      contentToProcess = 
                        currentContent.substring(0, lastAtIndex) + 
                        currentContent.substring(cursorPos);
                    }
                    setShowTokenSuggest(false);
                  }
                  
                  // Process all @ tokens in the content
                  const processed = await processAllTokensInContent(contentToProcess);
                  
                  // Update the input and block with processed content
                  if (processed.content !== contentToProcess || 
                      Object.keys(processed.metadata).length > 0) {
                    
                    inputRef.current.value = processed.content;
                    
                    // Update block with clean content and metadata
                    await updateBlockContent(block.id, {
                      content: processed.content,
                      taskMetadata: { 
                        ...(block.taskMetadata || {}), 
                        ...processed.metadata 
                      }
                    });
                    
                    // Trigger change event for consistency
                    const event = new Event('input', { bubbles: true });
                    inputRef.current.dispatchEvent(event);
                  }
                }
                
                handleBlur();
              }}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
            />
            {block.type === 'todo-list' && (
              <div className="flex-shrink-0 mt-1 flex items-center gap-2">
                {block.taskMetadata && (
                  <TaskChips taskMetadata={block.taskMetadata} blockId={block.id} />
                )}
                {processingTokens && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </BlockWrapper>

      <SlashMenu
        ref={slashMenuRef}
        isOpen={showSlashMenu}
        onClose={() => {
          setShowSlashMenu(false);
          setSlashSearchQuery('');
        }}
        onSelectType={handleSlashMenuSelect}
        position={slashMenuPosition}
        searchQuery={slashSearchQuery}
        mode={mode}
      />
      
      <TokenSuggest
        isOpen={showTokenSuggest}
        position={tokenSuggestPosition}
        searchQuery={tokenSearchQuery}
        onSelect={handleTokenSelect}
        onClose={() => {
          setShowTokenSuggest(false);
          setTokenSearchQuery('');
        }}
      />
    </>
  );
};
