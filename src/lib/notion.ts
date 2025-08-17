import { Client } from '@notionhq/client';

export interface NotionConfig {
  apiKey: string;
}

export interface NotionPageContent {
  id: string;
  title: string;
  icon?: string;
  cover?: string;
  url: string;
  lastEdited: Date;
  properties: Record<string, unknown>;
  blocks: NotionBlock[];
}

export interface NotionBlock {
  id: string;
  type: string;
  content: string;
  children?: NotionBlock[];
  rich_text?: Array<{
    type: 'text';
    text: { content: string; link?: { url: string } | null };
    annotations: {
      bold: boolean;
      italic: boolean;
      strikethrough: boolean;
      underline: boolean;
      code: boolean;
      color: string;
    };
    plain_text: string;
  }>;
}

export class NotionService {
  private client: Client | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new Client({
        auth: apiKey,
      });
    }
  }

  setApiKey(apiKey: string) {
    this.client = new Client({
      auth: apiKey,
    });
  }

  // Extract page ID from Notion URL
  extractPageId(url: string): string | null {
    const patterns = [
      // Standard Notion page URL
      /https:\/\/www\.notion\.so\/[^\/]+\/([a-f0-9]{32})/,
      /https:\/\/www\.notion\.so\/([a-f0-9]{32})/,
      // Short Notion URLs
      /https:\/\/notion\.so\/([a-f0-9]{32})/,
      // UUID with dashes
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        let id = match[1];
        // Remove dashes if present
        id = id.replace(/-/g, '');
        // Add dashes in UUID format
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;
      }
    }

    return null;
  }

  // Check if URL is a Notion URL
  isNotionUrl(url: string): boolean {
    return /https:\/\/(www\.)?notion\.so\//.test(url);
  }

  // Fetch page content
  async getPage(pageId: string): Promise<NotionPageContent | null> {
    if (!this.client) {
      throw new Error('Notion API key not configured');
    }

    try {
      // Get page properties
      const page = await this.client.pages.retrieve({ page_id: pageId });
      
      // Get page blocks
      const blocks = await this.getBlocks(pageId);

      // Extract title from properties
      let title = 'Untitled';
      if ('properties' in page && page.properties) {
        const titleProperty = Object.values(page.properties).find(
          (prop) => prop && typeof prop === 'object' && 'type' in prop && prop.type === 'title'
        );
        
        if (titleProperty && 'title' in titleProperty && Array.isArray(titleProperty.title) && titleProperty.title[0]) {
          const firstTitle = titleProperty.title[0];
          if ('plain_text' in firstTitle && typeof firstTitle.plain_text === 'string') {
            title = firstTitle.plain_text;
          }
        }
      }

      // Extract icon and cover
      const icon = 'icon' in page && page.icon ? 
        (page.icon.type === 'emoji' ? page.icon.emoji : 
         page.icon.type === 'file' ? page.icon.file.url : 
         page.icon.type === 'external' ? page.icon.external.url : undefined) : 
        undefined;

      const cover = 'cover' in page && page.cover ? 
        (page.cover.type === 'file' ? page.cover.file.url : 
         page.cover.type === 'external' ? page.cover.external.url : undefined) : 
        undefined;

      return {
        id: pageId,
        title,
        icon,
        cover,
        url: `https://www.notion.so/${pageId.replace(/-/g, '')}`,
        lastEdited: new Date('last_edited_time' in page ? page.last_edited_time : new Date()),
        properties: 'properties' in page ? page.properties : {},
        blocks
      };
    } catch (error) {
      console.error('Failed to fetch Notion page:', error);
      return null;
    }
  }

  // Fetch blocks from a page
  private async getBlocks(pageId: string, limit = 50): Promise<NotionBlock[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
        page_size: limit,
      });

      const blocks: NotionBlock[] = [];
      
      for (const block of response.results) {
        if ('type' in block) {
          const notionBlock = await this.processBlock(block);
          if (notionBlock) {
            blocks.push(notionBlock);
          }
        }
      }

      return blocks;
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
      return [];
    }
  }

  // Process individual block
  private async processBlock(block: unknown): Promise<NotionBlock | null> {
    if (!block || typeof block !== 'object' || !('id' in block) || !('type' in block)) {
      return null;
    }
    const { id, type } = block as { id: string; type: string; [key: string]: unknown };
    const blockData = block as Record<string, unknown>;
    let content = '';
    let children: NotionBlock[] = [];

    try {
      // Extract content based on block type
      switch (type) {
        case 'paragraph':
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
        case 'bulleted_list_item':
        case 'numbered_list_item':
        case 'to_do':
        case 'quote':
        case 'callout':
          if (blockData[type] && typeof blockData[type] === 'object' && 'rich_text' in (blockData[type] as object)) {
            const richTextData = (blockData[type] as { rich_text: unknown }).rich_text;
            if (Array.isArray(richTextData)) {
              content = richTextData.map((rt) => {
                if (rt && typeof rt === 'object' && 'plain_text' in rt && typeof rt.plain_text === 'string') {
                  return rt.plain_text;
                }
                return '';
              }).join('');
            }
          }
          break;
        
        case 'code':
          if ('code' in blockData && blockData.code && typeof blockData.code === 'object' && 'rich_text' in blockData.code) {
            const richTextData = (blockData.code as { rich_text: unknown }).rich_text;
            if (Array.isArray(richTextData)) {
              content = richTextData.map((rt) => {
                if (rt && typeof rt === 'object' && 'plain_text' in rt && typeof rt.plain_text === 'string') {
                  return rt.plain_text;
                }
                return '';
              }).join('');
            }
          }
          break;
        
        case 'image':
          if ('image' in blockData && blockData.image && typeof blockData.image === 'object') {
            const imageData = blockData.image as Record<string, unknown>;
            let imageUrl = '';
            if ('type' in imageData) {
              if (imageData.type === 'file' && 'file' in imageData && imageData.file && typeof imageData.file === 'object' && 'url' in imageData.file) {
                imageUrl = String(imageData.file.url);
              } else if (imageData.type === 'external' && 'external' in imageData && imageData.external && typeof imageData.external === 'object' && 'url' in imageData.external) {
                imageUrl = String(imageData.external.url);
              }
            }
            content = imageUrl;
          }
          break;
        
        case 'divider':
          content = '---';
          break;
        
        case 'embed':
          if ('embed' in blockData && blockData.embed && typeof blockData.embed === 'object' && 'url' in blockData.embed) {
            content = String(blockData.embed.url);
          }
          break;
        
        default:
          // For unsupported blocks, try to extract any text
          if (blockData[type] && typeof blockData[type] === 'object' && 'rich_text' in (blockData[type] as object)) {
            const richTextData = (blockData[type] as { rich_text: unknown }).rich_text;
            if (Array.isArray(richTextData)) {
              content = richTextData.map((rt) => {
                if (rt && typeof rt === 'object' && 'plain_text' in rt && typeof rt.plain_text === 'string') {
                  return rt.plain_text;
                }
                return '';
              }).join('');
            }
          }
      }

      // Get children blocks if they exist
      if ('has_children' in blockData && blockData.has_children) {
        children = await this.getBlocks(id);
      }

      return {
        id,
        type,
        content,
        children,
        rich_text: block[type]?.rich_text
      };
    } catch (error) {
      console.error(`Failed to process block ${id}:`, error);
      return null;
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Try to list users (minimal permission test)
      await this.client.users.list({ page_size: 1 });
      return true;
    } catch (error) {
      console.error('Notion API connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let notionService: NotionService | null = null;

export function getNotionService(): NotionService {
  if (!notionService) {
    notionService = new NotionService();
  }
  return notionService;
}

export function initializeNotionService(apiKey: string) {
  notionService = new NotionService(apiKey);
  return notionService;
}