import React from 'react';
import { Block } from '@/types/index';
import { getBlockPlaceholder } from '@/utils/editor';
import { getBlockInputStyles } from './blockStyles';

interface BlockInputProps {
  block: Block;
  localContent: string;
  isFocused: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
}

export const BlockInput: React.FC<BlockInputProps> = ({
  block,
  localContent,
  isFocused,
  inputRef,
  onInput,
  onChange,
  onKeyDown,
  onPaste,
  onFocus,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
}) => {
  const placeholder = getBlockPlaceholder(block, localContent !== '', isFocused);

  if (block.type === 'divider') {
    return (
      <div className="py-2">
        <hr className="border-gray-300" />
      </div>
    );
  }

  return (
    <textarea
      ref={inputRef}
      value={localContent}
      onInput={onInput}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={onFocus}
      onBlur={onBlur}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      onMouseDown={(e) => e.stopPropagation()}
      placeholder={placeholder}
      className={getBlockInputStyles(block)}
      rows={1}
      style={{
        resize: 'none',
        overflow: 'hidden',
        minHeight: '1.5rem',
      }}
    />
  );
};
