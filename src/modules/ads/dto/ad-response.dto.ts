/**
 * Optimized Ad Response DTO
 * 
 * Returns only necessary ad fields
 * Includes minimal user info to avoid extra queries
 */
export class AdResponseDto {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  status: string;
  views: number;
  createdAt: Date;
  
  // Minimal user info (avoid full user object)
  user: {
    id: number;
    username: string;
  };

  constructor(ad: any) {
    this.id = ad.id;
    this.title = ad.title;
    this.description = ad.description;
    this.price = ad.price;
    this.category = ad.category;
    this.images = ad.images || [];
    this.status = ad.status;
    this.views = ad.views || 0;
    this.createdAt = ad.createdAt;
    
    // Only include minimal user info
    if (ad.user) {
      this.user = {
        id: ad.user.id,
        username: ad.user.username,
      };
    }
  }
}

/**
 * Ad List Item DTO
 * Minimal info for ad lists/feeds
 * Even faster than full ad response
 */
export class AdListItemDto {
  id: number;
  title: string;
  price: number;
  image: string; // Only first image
  category: string;
  createdAt: Date;

  constructor(ad: any) {
    this.id = ad.id;
    this.title = ad.title;
    this.price = ad.price;
    this.image = ad.images?.[0] || null;
    this.category = ad.category;
    this.createdAt = ad.createdAt;
  }
}

/**
 * Ad Details DTO
 * Full ad information for detail view
 */
export class AdDetailsDto extends AdResponseDto {
  location?: string;
  contactInfo?: string;
  totalViews?: number;
  totalComments?: number;

  constructor(ad: any) {
    super(ad);
    this.location = ad.location;
    this.contactInfo = ad.contactInfo;
    this.totalViews = ad.views || 0;
    this.totalComments = ad.commentsCount || 0;
  }
}
