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
  properties: Record<string, any>;
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
          (prop: any) => prop.type === 'title'
        ) as any;
        
        if (titleProperty && titleProperty.title && titleProperty.title[0]) {
          title = titleProperty.title[0].plain_text;
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
          const notionBlock = await this.processBlock(block as any);
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
  private async processBlock(block: any): Promise<NotionBlock | null> {
    const { id, type } = block;
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
          if (block[type].rich_text) {
            content = block[type].rich_text.map((rt: any) => rt.plain_text).join('');
          }
          break;
        
        case 'code':
          content = block.code.rich_text.map((rt: any) => rt.plain_text).join('');
          break;
        
        case 'image':
          const imageUrl = block.image.type === 'file' ? 
            block.image.file.url : 
            block.image.external?.url;
          content = imageUrl || '';
          break;
        
        case 'divider':
          content = '---';
          break;
        
        case 'embed':
          content = block.embed.url;
          break;
        
        default:
          // For unsupported blocks, try to extract any text
          if (block[type]?.rich_text) {
            content = block[type].rich_text.map((rt: any) => rt.plain_text).join('');
          }
      }

      // Get children blocks if they exist
      if (block.has_children) {
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