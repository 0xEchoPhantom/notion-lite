import { Block } from '@/types/index';

export const getBlockInputStyles = (block: Block): string => {
  const baseStyles = 'w-full bg-transparent border-none outline-none resize-none placeholder-gray-400';
  
  switch (block.type) {
    case 'heading-1':
      return `${baseStyles} text-2xl font-bold leading-8 text-gray-900`;
    case 'heading-2':
      return `${baseStyles} text-xl font-semibold leading-7 text-gray-900`;
    case 'heading-3':
      return `${baseStyles} text-lg font-medium leading-6 text-gray-900`;
    case 'quote':
      return `${baseStyles} text-sm leading-6 italic text-gray-700 border-l-4 border-gray-300 pl-4`;
    case 'code':
      return `${baseStyles} text-sm leading-6 font-mono bg-gray-100 px-2 py-1 rounded`;
    case 'divider':
      return `${baseStyles} text-sm leading-6 text-center`;
    case 'todo-list':
      return `${baseStyles} text-sm leading-6 ${block.isChecked 
        ? 'text-gray-500' 
        : 'text-gray-900'}`;
    default:
      return `${baseStyles} text-sm leading-6 text-gray-900`;
  }
};
