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

  private async processPdfMenu(fileName: string): Promise<void> {
    console.log(`MenuDataService: Processing PDF menu: ${fileName}`);
    try {
      const { data, error } = await this.supabase.storage.from("menu-data").download(fileName);
      if (error || !data) throw error || new Error("Failed to download PDF");
      const buffer = Buffer.from(await data.arrayBuffer());
      const { default: pdfParse } = await import("pdf-parse");
      const parsed = await pdfParse(buffer);
      const menuItems = this.parseMenuFromText(parsed.text);
      if (menuItems.length === 0 && process.env.NEXT_PUBLIC_USE_SAMPLE_MENU === "true") {
        console.warn("MenuDataService: No items parsed from PDF, using sample data");
        menuItems.push(...this.getSampleMenuItems());
      }
      const menuItemsToUpsert = menuItems.map(item => ({
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        popularity: item.popularity,
        pairings: item.pairings,
        image_url: item.imageUrl,
        is_available: item.isAvailable,
      }));
      const { error: menuInsertError } = await this.supabase.from("menu_items").upsert(menuItemsToUpsert, { onConflict: "name" });
      if (menuInsertError) console.error("MenuDataService: Error upserting menu items:", menuInsertError.message);
    } catch (error) {
      console.error("MenuDataService: Error in processPdfMenu:", error);
    }
  }


  private async processExcelMenu(fileName: string): Promise<void> {
    console.log(`MenuDataService: Processing Excel menu: ${fileName}`);
    try {
      const { data, error } = await this.supabase.storage.from("menu-data").download(fileName);
      if (error || !data) throw error || new Error("Failed to download Excel file");
      const buffer = Buffer.from(await data.arrayBuffer());
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      const menuItems: MenuItem[] = rows.map(row => ({
        id: "", // placeholder
        name: row.name || row.Name,
        category: row.category || row.Category,
        price: parseFloat(row.price || row.Price),
        description: row.description || row.Description || "",
        popularity: row.popularity ? parseInt(row.popularity, 10) : 5,
        pairings: row.pairings ? String(row.pairings).split(',').map((s: string) => s.trim()) : [],
        imageUrl: row.image_url || row.imageUrl,
        isAvailable: row.is_available !== undefined ? !!row.is_available : true,
      }));
      const menuItemsToUpsert = menuItems.map(item => ({
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        popularity: item.popularity,
        pairings: item.pairings,
        image_url: item.imageUrl,
        is_available: item.isAvailable,
      }));
      const { error: menuInsertError } = await this.supabase.from("menu_items").upsert(menuItemsToUpsert, { onConflict: "name" });
      if (menuInsertError) console.error("MenuDataService: Error upserting menu items:", menuInsertError.message);
    } catch (error) {
      console.error("MenuDataService: Error in processExcelMenu:", error);
    }
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
  private parseMenuFromText(text: string): MenuItem[] {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const items: MenuItem[] = [];
    for (const line of lines) {
      const parts = line.split("|");
      if (parts.length >= 3) {
        const [name, category, priceRaw, description = ""] = parts;
        const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
        if (!isNaN(price)) {
          items.push({ id: "", name: name.trim(), category: category.trim(), price, description: description.trim(), popularity: 5, pairings: [], imageUrl: undefined, isAvailable: true });
        }
      }
    }
    return items;
  }

  private getSampleMenuItems(): MenuItem[] {
    return [{ id: "", name: "Sample Item", category: "Sample", price: 0, description: "Example", popularity: 5, pairings: [], isAvailable: true }];
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
