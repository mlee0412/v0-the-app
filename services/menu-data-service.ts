import { getSupabaseClient } from "@/lib/supabase/client";

// It's good practice to define types in a central location (e.g., /types/menu.ts)
// For now, keeping them here as per the original structure.
export interface MenuItem {
  id: string; // Should be UUID if from DB
  name: string;
  category: string;
  price: number;
  description: string;
  popularity: number; // 1-10 scale
  pairings: string[]; // IDs or names of items
  imageUrl?: string;
  isAvailable: boolean;
  created_at?: string; // Added from schema
  updated_at?: string; // Added from schema
}

export interface ComboItem {
  id: string; // Should be UUID if from DB
  name: string;
  price_weekday: number;
  price_weekend: number;
  billiard_time_minutes: number;
  max_guests: number;
  additional_guest_fee: number;
  is_available: boolean;
  includes_billiard_time: boolean;
  image_url?: string;
  description: string;
  created_at?: string; // Added from schema
  updated_at?: string; // Added from schema
}

export interface SalesData {
  id?: string; // Optional if auto-generated
  itemId: string;
  item_type?: 'menu_item' | 'combo'; // From schema
  date: string; // Should be DATE type in DB, string 'YYYY-MM-DD' here
  quantity: number;
  revenue: number;
  timeOfDay: string; // e.g., 'morning', 'afternoon', 'evening'
  dayOfWeek: string; // e.g., 'Monday', 'Tuesday'
  created_at?: string; // Added from schema
}

export interface MenuRecommendation {
  itemId: string;
  itemName: string;
  confidence: number; // 0-1 scale
  reason: string;
  price?: number;
  imageUrl?: string;
}

class MenuDataService {
  private supabase = getSupabaseClient(); // Initialize client once

  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const { data: buckets, error: getBucketsError } = await this.supabase.storage.listBuckets();
      if (getBucketsError) {
        console.error("MenuDataService: Error checking buckets:", getBucketsError);
        throw new Error("Failed to check storage buckets");
      }

      if (!buckets || !buckets.some((bucket) => bucket.name === bucketName)) {
        console.log(`MenuDataService: Creating bucket: ${bucketName}`);
        const { error: createBucketError } = await this.supabase.storage.createBucket(bucketName, {
          public: false, // Keep private unless public access is explicitly needed for files
          fileSizeLimit: 10485760, // 10MB
        });
        if (createBucketError) {
          console.error("MenuDataService: Error creating bucket:", createBucketError);
          throw new Error(`Failed to create storage bucket: ${createBucketError.message}`);
        }
      }
    } catch (error) {
      console.error("MenuDataService: Error ensuring bucket exists:", error);
      throw error; // Re-throw to be handled by caller
    }
  }

  async uploadMenuFile(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const bucketName = "menu-data";
      await this.ensureBucketExists(bucketName);

      const fileName = `menu-files/${Date.now()}-${file.name}`;
      const { error } = await this.supabase.storage.from(bucketName).upload(fileName, file);
      if (error) throw error;

      // Placeholder: Actual processing logic would go here
      if (file.name.endsWith(".pdf")) {
        await this.processPdfMenu(fileName); // Assumes this will parse and insert data
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // await this.processExcelMenu(fileName); // Implement this
        console.warn("MenuDataService: Excel processing not yet implemented.");
        return { success: false, message: "Excel processing not yet implemented." };
      } else {
        return { success: false, message: "Unsupported file format for menu." };
      }

      return { success: true, message: "Menu file uploaded and processed successfully." };
    } catch (error) {
      console.error("MenuDataService: Error uploading menu file:", error);
      return { success: false, message: (error as Error).message || "Failed to upload menu file." };
    }
  }

  async uploadSalesData(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const bucketName = "menu-data";
      await this.ensureBucketExists(bucketName);

      const fileName = `sales-data/${Date.now()}-${file.name}`;
      const { error } = await this.supabase.storage.from(bucketName).upload(fileName, file);
      if (error) throw error;

      // await this.processSalesData(fileName); // Implement this
      console.warn("MenuDataService: Sales data processing not yet implemented.");
      return { success: false, message: "Sales data processing not yet implemented." };
      // return { success: true, message: "Sales data uploaded and processed successfully." };
    } catch (error) {
      console.error("MenuDataService: Error uploading sales data:", error);
      return { success: false, message: (error as Error).message || "Failed to upload sales data." };
    }
  }

  // DEV NOTE: The following processPdfMenu contains hardcoded data for development.
  // In production, this should parse the PDF file content.
  private async processPdfMenu(fileName: string): Promise<void> {
    console.log(`MenuDataService: Processing PDF menu (using hardcoded data): ${fileName}`);
    try {
      // This method should ideally parse the PDF. For now, it uses hardcoded data.
      // The schema_menu.sql file should be the source of truth for table structure.
      // This function currently assumes `menu_items` and `combos` tables exist as per schema_menu.sql.

      const menuItems = [
        { name: "Buffalo Chicken Dip", category: "Appetizers", price: 11, description: "Mildly spicy dip, served with corn tortilla nacho chips.", popularity: 8, pairings: ["Coors Light", "Miller Lite", "White Claw"], is_available: true,},
        { name: "French Fries", category: "Appetizers", price: 13, description: "Classic french fries. Add Cheese & Bacon Bits +2, Add Chili +2, Add Chili & Cheese +3", popularity: 9, pairings: ["Heineken", "Corona", "Beer"], is_available: true, },
        { name: "Jalapeño Poppers", category: "Appetizers", price: 13, description: "Cream cheese blend stuffed in crispy breading, served with dips.", popularity: 7, pairings: ["Corona", "Sangria"], is_available: true, },
        { name: "Chips & Dips", category: "Appetizers", price: 14, description: "Crispy corn tortilla nacho chips with salsa and cheese wizz dips.", popularity: 7, pairings: ["Corona", "Margarita"], is_available: true,},
        { name: "Cheese Quesadillas", category: "Appetizers", price: 13, description: "Triple cheese blend, grill-pressed flour tortillas, served with dip.", popularity: 8, pairings: ["Sangria", "Margarita"], is_available: true,},
        { name: "Onion Ring Tower", category: "Appetizers", price: 13, description: "Deep-fried stacked rings of gold, served with dips.", popularity: 7, pairings: ["Beer", "Cocktails"], is_available: true,},
        { name: "Tater Tots", category: "Appetizers", price: 13, description: "Classic tater tots. Add Cheese & Bacon Bits +2, Add Chili +2, Add Chili & Cheese +3", popularity: 8, pairings: ["Beer", "Soju"], is_available: true,},
        { name: "Mozzarella Sticks", category: "Appetizers", price: 13, description: "Cheese stuffed in crispy breading, served with marinara sauce.", popularity: 9, pairings: ["Beer", "Sangria"], is_available: true,},
        { name: "Crispy Dumplings", category: "Appetizers", price: 15, description: "Minced beef, pork, and vegetable potstickers, served with soy sauce.", popularity: 8, pairings: ["Soju", "Beer"], is_available: true,},
        { name: "Chicken Wings", category: "Appetizers", price: 19, description: "Your choice of sauce: Regular, Buffalo, or Lemon Pepper", popularity: 9, pairings: ["Beer", "Cocktails"], is_available: true,},
        { name: "Pulled Pork 'Dillas", category: "Main", price: 19, description: "Pulled pork & cheese, grill-pressed flour tortillas, served with dip.", popularity: 7, pairings: ["Beer", "Cocktails"], is_available: true,},
        { name: "Slider Trio", category: "Main", price: 19, description: "Your choice: Beef, K-BBQ Bulgogi, Buffalo Chicken, or Pulled Pork", popularity: 8, pairings: ["Beer", "Cocktails"], is_available: true,},
        { name: "Pulled Pork 'Wich", category: "Main", price: 21, description: "Tender pulled pork in between brioche buns, comes with fries.", popularity: 7, pairings: ["Beer", "Cocktails"], is_available: true,},
        { name: "Smashburger & Fries", category: "Main", price: 21, description: "Two beef patties, lettuce, tomato, cheese, brioche, comes with fries.", popularity: 9, pairings: ["Beer", "Cocktails"], is_available: true,},
        { name: "All-Star Platter", category: "Shareable", price: 33, description: "French Fries, Tater Tots, Onion Rings, Mozzarella Sticks, Jalapeño Poppers, Crispy Dumplings, Potato Pancakes", popularity: 10, pairings: ["Beer Tower", "Cocktails", "Soju"], is_available: true,},
        { name: "Fruit Medley", category: "Shareable", price: 35, description: "Apples, Cherry Tomatoes, Grapes, Honeydew, Oranges, Pineapples, Strawberries, Watermelon", popularity: 7, pairings: ["Sangria", "Champagne"], is_available: true,},
        { name: "Beer Bucket", category: "Beer", price: 39, description: "Pick any 5 beers", popularity: 9, pairings: ["All-Star Platter", "Chicken Wings"], is_available: true,},
        { name: "Beer Tower", category: "Beer", price: 65, description: "100 oz beer tower", popularity: 10, pairings: ["All-Star Platter", "Chicken Wings"], is_available: true,},
        { name: "Soju Bottle", category: "Soju", price: 19, description: "375ml bottle. Flavors: Chum-Churum, Saero, Apple, Peach, Strawberry, Yakult", popularity: 9, pairings: ["Crispy Dumplings", "Tater Tots"], is_available: true,},
        { name: "Spectrum Shots", category: "Soju", price: 21, description: "Seven 2oz Rainbow Soju Shooters", popularity: 8, pairings: ["Appetizers"], is_available: true,},
        { name: "Sangria", category: "Wine", price: 14, description: "Glass of sangria. Flavors: Red, Rosé, White", popularity: 7, pairings: ["Cheese Quesadillas", "Fruit Medley"], is_available: true,},
        { name: "Sangria Pitcher", category: "Wine", price: 55, description: "Pitcher of sangria. Flavors: Red, Rosé, White", popularity: 8, pairings: ["Cheese Quesadillas", "Fruit Medley"], is_available: true,},
        { name: "Wine Glass", category: "Wine", price: 12, description: "Glass of wine. Options: Chardonnay, Pinot Grigio, Sauvignon Blanc, Cabernet Sauvignon, Malbec, Pinot Noir", popularity: 6, pairings: ["Cheese Quesadillas", "Fruit Medley"], is_available: true,},
        { name: "Wine Bottle", category: "Wine", price: 49, description: "Bottle of wine. Options: Chardonnay, Pinot Grigio, Sauvignon Blanc, Cabernet Sauvignon, Malbec, Pinot Noir", popularity: 7, pairings: ["Cheese Quesadillas", "Fruit Medley"], is_available: true,},
        { name: "Moët & Chandon Impérial", category: "Champagne", price: 230, description: "Bottle of Moët & Chandon Impérial champagne", popularity: 7, pairings: ["Fruit Medley"], is_available: true,},
        { name: "Moët & Chandon Rosé", category: "Champagne", price: 230, description: "Bottle of Moët & Chandon Rosé champagne", popularity: 7, pairings: ["Fruit Medley"], is_available: true,},
      ];

      const combosData = [
          // Note: The original `processPdfMenu` inserted combo items also into `menu_items`.
          // This is okay if `menu_items` is a general catalog. If combos should only be in `combos` table, adjust this.
        { name: "Combo For Two", price_weekday: 59, price_weekend: 69, billiard_time_minutes: 60, max_guests: 2, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "1 Liquor Shot + 1 Beer Per Person + 1 Hour Billiard Rental" },
        { name: "Combo For Four", price_weekday: 95, price_weekend: 105, billiard_time_minutes: 60, max_guests: 4, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "1 Liquor Shot + 1 Beer Per Person + 1 Hour Billiard Rental" },
        { name: "Green Glass Bottle", price_weekday: 59, price_weekend: 69, billiard_time_minutes: 60, max_guests: 2, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "1 Soju Bottle Per Person + 1 Hour Billiard Rental" },
        { name: "Cocktail Combo", price_weekday: 59, price_weekend: 69, billiard_time_minutes: 60, max_guests: 2, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "1 Cocktail Per Person (<$20) + 1 Hour Billiard Rental" },
        { name: "Pub Grub Club", price_weekday: 59, price_weekend: 69, billiard_time_minutes: 60, max_guests: 2, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "1 Food Per Person (<$22) + 1 Hour Billiard Rental" },
        { name: "Six-Pack App Special", price_weekday: 128, price_weekend: 128, billiard_time_minutes: 60, max_guests: 4, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "4 Beers/Seltzers, 2 Soju Bottles, 1 Hour Billiard Rental" },
        { name: "Social Club Cooler", price_weekday: 349, price_weekend: 349, billiard_time_minutes: 120, max_guests: 6, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "1 Liquor Bottle 750mL, 6 Beers/Seltzers, 2 Red Bulls, includes 2 hours billiard rental (Up to 6 guests)" },
        { name: "Trust Fund Cooler", price_weekday: 495, price_weekend: 495, billiard_time_minutes: 120, max_guests: 12, additional_guest_fee: 5, is_available: true, includes_billiard_time: true, description: "2 Liquor Bottles 750mL, 12 Beers/Seltzers, 4 Red Bulls, includes 2 hours billiard rental (2 tables)" },
      ];

      // Upsert menu items
      const menuItemsToUpsert = menuItems.map(item => ({
        // id: item.id, // Let DB generate UUID if not provided or ensure unique
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        popularity: item.popularity,
        pairings: item.pairings,
        image_url: item.imageUrl,
        is_available: item.is_available,
      }));
      const { error: menuInsertError } = await this.supabase.from("menu_items").upsert(menuItemsToUpsert, { onConflict: "name" });
      if (menuInsertError) console.error("MenuDataService: Error upserting menu items:", menuInsertError.message);

      // Upsert combos
      const combosToUpsert = combosData.map(combo => ({
        // id: combo.id, // Let DB generate UUID
        name: combo.name,
        price_weekday: combo.price_weekday,
        price_weekend: combo.price_weekend,
        billiard_time_minutes: combo.billiard_time_minutes,
        max_guests: combo.max_guests,
        additional_guest_fee: combo.additional_guest_fee,
        is_available: combo.is_available,
        includes_billiard_time: combo.includes_billiard_time,
        image_url: combo.image_url,
        description: combo.description,
      }));
      const { error: comboInsertError } = await this.supabase.from("combos").upsert(combosToUpsert, { onConflict: "name" });
      if (comboInsertError) console.error("MenuDataService: Error upserting combos:", comboInsertError.message);

    } catch (error) {
      console.error("MenuDataService: Error in processPdfMenu (hardcoded data):", error);
    }
  }

  // Placeholder - implement actual Excel parsing
  private async processExcelMenu(fileName: string): Promise<void> {
    console.warn(`MenuDataService: Excel processing for ${fileName} not implemented. Using placeholder logic.`);
    // Similar to processPdfMenu, this would parse Excel and upsert to DB.
    // For now, it can also call processPdfMenu if the hardcoded data is desired for testing.
    await this.processPdfMenu(fileName);
  }

  // Placeholder - implement actual sales data processing
  private async processSalesData(fileName: string): Promise<void> {
    console.warn(`MenuDataService: Sales data processing for ${fileName} not implemented.`);
    // This method should parse the sales data file and insert records into the `sales_data` table.
    // Example structure for an insert:
    // const { error } = await this.supabase.from("sales_data").insert([
    //   { itemId: "some_item_id", item_type: "menu_item", date: "2024-05-25", quantity: 2, revenue: 22.00, timeOfDay: "evening", dayOfWeek: "Saturday" },
    // ]);
  }

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const { data, error } = await this.supabase.from("menu_items").select("*").order("category").order("name");
      if (error) throw error;
      return (data as MenuItem[]) || [];
    } catch (error) {
      console.error("MenuDataService: Error getting menu items:", error);
      return [];
    }
  }

  async getCombos(): Promise<ComboItem[]> {
    try {
      const { data, error } = await this.supabase.from("combos").select("*").eq("is_available", true).order("price_weekday");
      if (error) throw error;
      return (data as ComboItem[]) || [];
    } catch (error) {
      console.error("MenuDataService: Error getting combo items:", error);
      return [];
    }
  }

  async getSalesData(startDate?: string, endDate?: string): Promise<SalesData[]> {
    try {
      let query = this.supabase.from("sales_data").select("*");
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);
      const { data, error } = await query.order("date", { ascending: false });
      if (error) throw error;
      return (data as SalesData[]) || [];
    } catch (error) {
      console.error("MenuDataService: Error getting sales data:", error);
      return [];
    }
  }

  async getMenuRecommendations(
    tableId: number,
    guestCount: number,
    sessionDurationMs: number, // Changed from sessionDuration to sessionDurationMs for clarity
  ): Promise<MenuRecommendation[]> {
    console.log(`MenuDataService: getMenuRecommendations for tableId: ${tableId}, guestCount: ${guestCount}, sessionDurationMs: ${sessionDurationMs}`);
    try {
      const effectiveGuestCount = guestCount <= 0 ? 2 : guestCount;
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
      const hour = now.getHours();
      const isWeekend = dayOfWeek === "Friday" || dayOfWeek === "Saturday" || dayOfWeek === "Sunday"; // Expanded weekend
      let timeOfDay = (hour < 12) ? "morning" : (hour < 17) ? "afternoon" : "evening";

      const [menuItems, combos] = await Promise.all([this.getMenuItems(), this.getCombos()]);

      if (!menuItems || menuItems.length === 0 || !combos || combos.length === 0) {
        console.warn("MenuDataService: Menu items or combos missing, using fallback recommendations.");
        return this.getFallbackRecommendations(effectiveGuestCount, sessionDurationMs, isWeekend, timeOfDay);
      }
      
      let recommendations: MenuRecommendation[] = [];
      const sessionDurationMinutes = sessionDurationMs / 60000;

      // Prioritize combos
      const suitableCombos = combos
        .filter(combo => combo.is_available && combo.max_guests >= effectiveGuestCount)
        .sort((a, b) => this.calculateComboRelevance(b, effectiveGuestCount, sessionDurationMinutes, isWeekend) - 
                         this.calculateComboRelevance(a, effectiveGuestCount, sessionDurationMinutes, isWeekend));
      
      recommendations = suitableCombos.slice(0, 2).map(combo => ({ // Suggest up to 2 best combos
        itemId: combo.id,
        itemName: combo.name,
        confidence: 0.9, // High confidence for directly suitable combos
        reason: `${combo.description || `Great value for ${effectiveGuestCount} guests.`}${combo.includes_billiard_time ? ` Includes ${combo.billiard_time_minutes} min pool.` : ''}`,
        price: isWeekend ? combo.price_weekend : combo.price_weekday,
        imageUrl: combo.image_url,
      }));

      // Fill with popular individual items if not enough combos or if specifically requested
      const remainingSlots = Math.max(0, 3 - recommendations.length); // Aim for around 3-5 total recommendations
      if (remainingSlots > 0 || effectiveGuestCount < 2) { // Add individual items for smaller groups too
        const popularItems = menuItems
          .filter(item => item.isAvailable && !recommendations.find(r => r.itemId === item.id)) // Exclude already recommended items
          .sort((a, b) => b.popularity - a.popularity) // Sort by popularity
          .slice(0, remainingSlots + 2); // Get a few more individual items

        popularItems.forEach(item => {
          recommendations.push({
            itemId: item.id,
            itemName: item.name,
            confidence: (item.popularity / 10) * 0.8 + 0.1, // Scale popularity
            reason: `${item.description || `A popular choice in ${item.category}.`}${item.pairings && item.pairings.length > 0 ? ` Pairs well with ${item.pairings.slice(0,2).join(', ')}.` : ''}`,
            price: item.price,
            imageUrl: item.imageUrl,
          });
        });
      }
      
      // Ensure variety and limit total recommendations
      recommendations = recommendations.slice(0, 5);

      console.log(`MenuDataService: Returning ${recommendations.length} recommendations:`, recommendations);
      return recommendations;
    } catch (error) {
      console.error("MenuDataService: Error in getMenuRecommendations:", error);
      return this.getFallbackRecommendations(guestCount, sessionDurationMs, false, "evening");
    }
  }

  private getFallbackRecommendations(
    guestCount: number,
    sessionDurationMs: number, // Changed to Ms
    isWeekend: boolean,
    timeOfDay: string,
  ): MenuRecommendation[] {
    const recommendations: MenuRecommendation[] = [];
    const isLargeGroup = guestCount >= 6;

    if (isLargeGroup) {
      recommendations.push({ itemId: "social-club-cooler", itemName: "Social Club Cooler", confidence: 0.9, reason: "Excellent for large groups, includes drinks and pool time.", price: 349 });
      recommendations.push({ itemId: "all-star-platter", itemName: "All-Star Platter", confidence: 0.85, reason: "Variety of appetizers, perfect for sharing.", price: 33 });
    } else if (guestCount >= 4) {
      recommendations.push({ itemId: "combo-for-four", itemName: "Combo For Four", confidence: 0.9, reason: "Good value for a group of four.", price: isWeekend ? 105 : 95 });
      recommendations.push({ itemId: "chicken-wings", itemName: "Chicken Wings", confidence: 0.8, reason: "Popular shareable choice.", price: 19 });
    } else { // 1-3 guests
      recommendations.push({ itemId: "combo-for-two", itemName: "Combo For Two", confidence: 0.9, reason: "Ideal for pairs or small groups.", price: isWeekend ? 69 : 59 });
      recommendations.push({ itemId: "smashburger-fries", itemName: "Smashburger & Fries", confidence: 0.8, reason: "Classic and satisfying meal.", price: 21 });
    }

    if (timeOfDay === "evening" || isWeekend) {
        recommendations.push({ itemId: "beer-tower", itemName: "Beer Tower (if group > 3)", confidence: 0.75, reason: "Great for evening social gatherings.", price: 65 });
    } else {
        recommendations.push({ itemId: "chips-dips", itemName: "Chips & Dips", confidence: 0.7, reason: "Light snack for any time.", price: 14 });
    }
    
    // Ensure we don't have too many, prioritize based on confidence if needed
    return recommendations.sort((a,b) => b.confidence - a.confidence).slice(0, 4);
  }

  private calculateComboRelevance(
    combo: ComboItem,
    guestCount: number,
    sessionDurationMinutes: number,
    isWeekend: boolean,
  ): number {
    let score = 0;
    // Guest count match
    if (combo.max_guests >= guestCount && guestCount > (combo.max_guests / 2) ) score += 5; // Good fit
    else if (combo.max_guests >= guestCount) score += 2; // Okay fit
    else score -= 5; // Too small

    // Time match (if combo includes time)
    if (combo.includes_billiard_time) {
      const timeDiff = Math.abs(combo.billiard_time_minutes - sessionDurationMinutes);
      if (timeDiff < 15) score += 4; // Very close
      else if (timeDiff < 30) score += 2; // Reasonably close
    } else {
        score +=1; // No included time is also fine if user is paying for table separately
    }

    // Price factor (lower per person is better, but not too cheap to devalue)
    const price = isWeekend ? combo.price_weekend : combo.price_weekday;
    const pricePerPerson = price / Math.max(1, guestCount);
    if (pricePerPerson < 20) score += 1;
    else if (pricePerPerson < 35) score += 3;
    else if (pricePerPerson < 50) score += 2;
    
    // Bonus for popular combos (assuming a popularity field could be added to combos)
    // if (combo.popularity && combo.popularity > 7) score += 2;


    return Math.max(0, score); // Ensure score isn't negative
  }
}

const menuDataService = new MenuDataService();
export default menuDataService;
