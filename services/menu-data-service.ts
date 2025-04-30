import { getSupabaseClient } from "@/lib/supabase/client"

// Types for menu and sales data based on your actual schema
export interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  description: string
  popularity: number // 1-10 scale based on sales data
  pairings: string[] // IDs of items that pair well with this item
  imageUrl?: string
  isAvailable: boolean
}

export interface ComboItem {
  id: string
  name: string
  price_weekday: number
  price_weekend: number
  billiard_time_minutes: number
  max_guests: number
  additional_guest_fee: number
  is_available: boolean
  includes_billiard_time: boolean
  image_url?: string
  description: string
}

export interface SalesData {
  itemId: string
  date: string
  quantity: number
  revenue: number
  timeOfDay: string // morning, afternoon, evening
  dayOfWeek: string
}

export interface MenuRecommendation {
  itemId: string
  itemName: string
  confidence: number // 0-1 scale
  reason: string
  price?: number
  imageUrl?: string
}

class MenuDataService {
  // Ensure the storage bucket exists
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Check if bucket exists
      const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets()

      if (getBucketsError) {
        console.error("Error checking buckets:", getBucketsError)
        throw new Error("Failed to check storage buckets")
      }

      // If bucket doesn't exist, create it
      if (!buckets || !buckets.some((bucket) => bucket.name === bucketName)) {
        console.log(`Creating bucket: ${bucketName}`)
        const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
        })

        if (createBucketError) {
          console.error("Error creating bucket:", createBucketError)
          throw new Error(`Failed to create storage bucket: ${createBucketError.message}`)
        }
      }
    } catch (error) {
      console.error("Error ensuring bucket exists:", error)
      throw error
    }
  }

  // Upload and process menu files
  async uploadMenuFile(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseClient()
      const bucketName = "menu-data"

      // Ensure bucket exists before uploading
      await this.ensureBucketExists(bucketName)

      // Upload file to Supabase storage
      const fileName = `menu-files/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file)

      if (error) throw error

      // Process file based on type
      if (file.name.endsWith(".pdf")) {
        await this.processPdfMenu(fileName)
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        await this.processExcelMenu(fileName)
      } else {
        return { success: false, message: "Unsupported file format" }
      }

      return { success: true, message: "Menu file uploaded and processed successfully" }
    } catch (error) {
      console.error("Error uploading menu file:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Upload and process sales data
  async uploadSalesData(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseClient()
      const bucketName = "menu-data"

      // Ensure bucket exists before uploading
      await this.ensureBucketExists(bucketName)

      // Upload file to Supabase storage
      const fileName = `sales-data/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file)

      if (error) throw error

      // Process sales data
      await this.processSalesData(fileName)

      return { success: true, message: "Sales data uploaded and processed successfully" }
    } catch (error) {
      console.error("Error uploading sales data:", error)
      return { success: false, message: (error as Error).message }
    }
  }

  // Process PDF menu (placeholder - would use a PDF parsing library in production)
  private async processPdfMenu(fileName: string): Promise<void> {
    console.log(`Processing PDF menu: ${fileName}`)

    try {
      const supabase = getSupabaseClient()

      // Check if the menu_items table exists, create it if not
      const { error: tableError } = await supabase.rpc("create_table_if_not_exists", {
        table_name: "menu_items",
        create_query: `
        CREATE TABLE menu_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          price NUMERIC(10,2) NOT NULL,
          description TEXT,
          popularity INTEGER DEFAULT 5,
          pairings TEXT[],
          image_url TEXT,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `,
      })

      if (tableError) {
        console.error("Error creating menu_items table:", tableError)
        // Continue anyway, table might already exist
      }

      // Insert menu items from the OCR data
      const menuItems = [
        // KITCHEN/FOOD ITEMS
        {
          name: "Buffalo Chicken Dip",
          category: "Appetizers",
          price: 11,
          description: "Mildly spicy dip, served with corn tortilla nacho chips.",
          popularity: 8,
          pairings: ["Coors Light", "Miller Lite", "White Claw"],
          is_available: true,
        },
        {
          name: "French Fries",
          category: "Appetizers",
          price: 13,
          description: "Classic french fries. Add Cheese & Bacon Bits +2, Add Chili +2, Add Chili & Cheese +3",
          popularity: 9,
          pairings: ["Heineken", "Corona", "Beer"],
          is_available: true,
        },
        {
          name: "Jalapeño Poppers",
          category: "Appetizers",
          price: 13,
          description: "Cream cheese blend stuffed in crispy breading, served with dips.",
          popularity: 7,
          pairings: ["Corona", "Sangria"],
          is_available: true,
        },
        {
          name: "Chips & Dips",
          category: "Appetizers",
          price: 14,
          description: "Crispy corn tortilla nacho chips with salsa and cheese wizz dips.",
          popularity: 7,
          pairings: ["Corona", "Margarita"],
          is_available: true,
        },
        {
          name: "Cheese Quesadillas",
          category: "Appetizers",
          price: 13,
          description: "Triple cheese blend, grill-pressed flour tortillas, served with dip.",
          popularity: 8,
          pairings: ["Sangria", "Margarita"],
          is_available: true,
        },
        {
          name: "Onion Ring Tower",
          category: "Appetizers",
          price: 13,
          description: "Deep-fried stacked rings of gold, served with dips.",
          popularity: 7,
          pairings: ["Beer", "Cocktails"],
          is_available: true,
        },
        {
          name: "Tater Tots",
          category: "Appetizers",
          price: 13,
          description: "Classic tater tots. Add Cheese & Bacon Bits +2, Add Chili +2, Add Chili & Cheese +3",
          popularity: 8,
          pairings: ["Beer", "Soju"],
          is_available: true,
        },
        {
          name: "Mozzarella Sticks",
          category: "Appetizers",
          price: 13,
          description: "Cheese stuffed in crispy breading, served with marinara sauce.",
          popularity: 9,
          pairings: ["Beer", "Sangria"],
          is_available: true,
        },
        {
          name: "Crispy Dumplings",
          category: "Appetizers",
          price: 15,
          description: "Minced beef, pork, and vegetable potstickers, served with soy sauce.",
          popularity: 8,
          pairings: ["Soju", "Beer"],
          is_available: true,
        },
        {
          name: "Chicken Wings",
          category: "Appetizers",
          price: 19,
          description: "Your choice of sauce: Regular, Buffalo, or Lemon Pepper",
          popularity: 9,
          pairings: ["Beer", "Cocktails"],
          is_available: true,
        },
        {
          name: "Pulled Pork 'Dillas",
          category: "Main",
          price: 19,
          description: "Pulled pork & cheese, grill-pressed flour tortillas, served with dip.",
          popularity: 7,
          pairings: ["Beer", "Cocktails"],
          is_available: true,
        },
        {
          name: "Slider Trio",
          category: "Main",
          price: 19,
          description: "Your choice: Beef, K-BBQ Bulgogi, Buffalo Chicken, or Pulled Pork",
          popularity: 8,
          pairings: ["Beer", "Cocktails"],
          is_available: true,
        },
        {
          name: "Pulled Pork 'Wich",
          category: "Main",
          price: 21,
          description: "Tender pulled pork in between brioche buns, comes with fries.",
          popularity: 7,
          pairings: ["Beer", "Cocktails"],
          is_available: true,
        },
        {
          name: "Smashburger & Fries",
          category: "Main",
          price: 21,
          description: "Two beef patties, lettuce, tomato, cheese, brioche, comes with fries.",
          popularity: 9,
          pairings: ["Beer", "Cocktails"],
          is_available: true,
        },
        {
          name: "All-Star Platter",
          category: "Shareable",
          price: 33,
          description:
            "French Fries, Tater Tots, Onion Rings, Mozzarella Sticks, Jalapeño Poppers, Crispy Dumplings, Potato Pancakes",
          popularity: 10,
          pairings: ["Beer Tower", "Cocktails", "Soju"],
          is_available: true,
        },
        {
          name: "Fruit Medley",
          category: "Shareable",
          price: 35,
          description: "Apples, Cherry Tomatoes, Grapes, Honeydew, Oranges, Pineapples, Strawberries, Watermelon",
          popularity: 7,
          pairings: ["Sangria", "Champagne"],
          is_available: true,
        },

        // DRINKS
        {
          name: "Beer Bucket",
          category: "Beer",
          price: 39,
          description: "Pick any 5 beers",
          popularity: 9,
          pairings: ["All-Star Platter", "Chicken Wings"],
          is_available: true,
        },
        {
          name: "Beer Tower",
          category: "Beer",
          price: 65,
          description: "100 oz beer tower",
          popularity: 10,
          pairings: ["All-Star Platter", "Chicken Wings"],
          is_available: true,
        },
        {
          name: "Soju Bottle",
          category: "Soju",
          price: 19,
          description: "375ml bottle. Flavors: Chum-Churum, Saero, Apple, Peach, Strawberry, Yakult",
          popularity: 9,
          pairings: ["Crispy Dumplings", "Tater Tots"],
          is_available: true,
        },
        {
          name: "Spectrum Shots",
          category: "Soju",
          price: 21,
          description: "Seven 2oz Rainbow Soju Shooters",
          popularity: 8,
          pairings: ["Appetizers"],
          is_available: true,
        },
        {
          name: "Sangria",
          category: "Wine",
          price: 14,
          description: "Glass of sangria. Flavors: Red, Rosé, White",
          popularity: 7,
          pairings: ["Cheese Quesadillas", "Fruit Medley"],
          is_available: true,
        },
        {
          name: "Sangria Pitcher",
          category: "Wine",
          price: 55,
          description: "Pitcher of sangria. Flavors: Red, Rosé, White",
          popularity: 8,
          pairings: ["Cheese Quesadillas", "Fruit Medley"],
          is_available: true,
        },
        {
          name: "Wine Glass",
          category: "Wine",
          price: 12,
          description:
            "Glass of wine. Options: Chardonnay, Pinot Grigio, Sauvignon Blanc, Cabernet Sauvignon, Malbec, Pinot Noir",
          popularity: 6,
          pairings: ["Cheese Quesadillas", "Fruit Medley"],
          is_available: true,
        },
        {
          name: "Wine Bottle",
          category: "Wine",
          price: 49,
          description:
            "Bottle of wine. Options: Chardonnay, Pinot Grigio, Sauvignon Blanc, Cabernet Sauvignon, Malbec, Pinot Noir",
          popularity: 7,
          pairings: ["Cheese Quesadillas", "Fruit Medley"],
          is_available: true,
        },
        {
          name: "Moët & Chandon Impérial",
          category: "Champagne",
          price: 230,
          description: "Bottle of Moët & Chandon Impérial champagne",
          popularity: 7,
          pairings: ["Fruit Medley"],
          is_available: true,
        },
        {
          name: "Moët & Chandon Rosé",
          category: "Champagne",
          price: 230,
          description: "Bottle of Moët & Chandon Rosé champagne",
          popularity: 7,
          pairings: ["Fruit Medley"],
          is_available: true,
        },
      ]

      // Insert combo items
      const comboItems = [
        {
          name: "Combo For Two",
          category: "Combo",
          price: 59,
          description: "2 Hands 2 Drinks: 1 Liquor Shot + 1 Beer Per Person + 1 Hour Billiard Rental",
          popularity: 9,
          pairings: [],
          is_available: true,
        },
        {
          name: "Combo For Four",
          category: "Combo",
          price: 95,
          description: "2 Hands 2 Drinks: 1 Liquor Shot + 1 Beer Per Person + 1 Hour Billiard Rental",
          popularity: 9,
          pairings: [],
          is_available: true,
        },
        {
          name: "Green Glass Bottle",
          category: "Combo",
          price: 59,
          description: "1 Soju Bottle Per Person + 1 Hour Billiard Rental",
          popularity: 8,
          pairings: [],
          is_available: true,
        },
        {
          name: "Cocktail Combo",
          category: "Combo",
          price: 69,
          description: "1 Cocktail Per Person (<$20) + 1 Hour Billiard Rental",
          popularity: 8,
          pairings: [],
          is_available: true,
        },
        {
          name: "Pub Grub Club",
          category: "Combo",
          price: 69,
          description: "1 Food Per Person (<$22) + 1 Hour Billiard Rental",
          popularity: 7,
          pairings: [],
          is_available: true,
        },
        {
          name: "Six-Pack App Special",
          category: "Special",
          price: 128,
          description: "4 Beers/Seltzers, 2 Soju Bottles, 1 Hour Billiard Rental",
          popularity: 9,
          pairings: [],
          is_available: true,
        },
        {
          name: "Six-Pack App with Food",
          category: "Special",
          price: 143,
          description: "4 Beers/Seltzers, 2 Soju Bottles, 1 Food (<$22), 1 Hour Billiard Rental",
          popularity: 8,
          pairings: [],
          is_available: true,
        },
        {
          name: "Social Club Cooler",
          category: "Special",
          price: 349,
          description:
            "1 Liquor Bottle 750mL, 6 Beers/Seltzers, 2 Red Bulls, includes 2 hours billiard rental (Up to 6 guests)",
          popularity: 8,
          pairings: [],
          is_available: true,
        },
        {
          name: "Trust Fund Cooler",
          category: "Special",
          price: 495,
          description:
            "2 Liquor Bottles 750mL, 12 Beers/Seltzers, 4 Red Bulls, includes 2 hours billiard rental (Up to 12 guests, 2 tables)",
          popularity: 7,
          pairings: [],
          is_available: true,
        },
      ]

      // Combine all items
      const allItems = [...menuItems, ...comboItems]

      // Insert items into database
      for (const item of allItems) {
        const { error: insertError } = await supabase.from("menu_items").upsert({ ...item }, { onConflict: "name" })

        if (insertError) {
          console.error(`Error inserting menu item ${item.name}:`, insertError)
        }
      }

      // Also create combos table if it doesn't exist
      const { error: combosTableError } = await supabase.rpc("create_table_if_not_exists", {
        table_name: "combos",
        create_query: `
        CREATE TABLE combos (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          price_weekday NUMERIC(10,2) NOT NULL,
          price_weekend NUMERIC(10,2) NOT NULL,
          billiard_time_minutes INTEGER NOT NULL,
          max_guests INTEGER NOT NULL,
          additional_guest_fee NUMERIC(10,2) DEFAULT 5.00,
          is_available BOOLEAN DEFAULT TRUE,
          includes_billiard_time BOOLEAN DEFAULT TRUE,
          image_url TEXT,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `,
      })

      if (combosTableError) {
        console.error("Error creating combos table:", combosTableError)
        // Continue anyway, table might already exist
      }

      // Insert combo data
      const combos = [
        {
          name: "Combo For Two",
          price_weekday: 59,
          price_weekend: 69,
          billiard_time_minutes: 60,
          max_guests: 2,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description: "1 Liquor Shot + 1 Beer Per Person + 1 Hour Billiard Rental",
        },
        {
          name: "Combo For Four",
          price_weekday: 95,
          price_weekend: 105,
          billiard_time_minutes: 60,
          max_guests: 4,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description: "1 Liquor Shot + 1 Beer Per Person + 1 Hour Billiard Rental",
        },
        {
          name: "Green Glass Bottle",
          price_weekday: 59,
          price_weekend: 69,
          billiard_time_minutes: 60,
          max_guests: 2,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description: "1 Soju Bottle Per Person + 1 Hour Billiard Rental",
        },
        {
          name: "Cocktail Combo",
          price_weekday: 59,
          price_weekend: 69,
          billiard_time_minutes: 60,
          max_guests: 2,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description: "1 Cocktail Per Person (<$20) + 1 Hour Billiard Rental",
        },
        {
          name: "Pub Grub Club",
          price_weekday: 59,
          price_weekend: 69,
          billiard_time_minutes: 60,
          max_guests: 2,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description: "1 Food Per Person (<$22) + 1 Hour Billiard Rental",
        },
        {
          name: "Six-Pack App Special",
          price_weekday: 128,
          price_weekend: 128,
          billiard_time_minutes: 60,
          max_guests: 4,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description: "4 Beers/Seltzers, 2 Soju Bottles, 1 Hour Billiard Rental",
        },
        {
          name: "Social Club Cooler",
          price_weekday: 349,
          price_weekend: 349,
          billiard_time_minutes: 120,
          max_guests: 6,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description:
            "1 Liquor Bottle 750mL, 6 Beers/Seltzers, 2 Red Bulls, includes 2 hours billiard rental (Up to 6 guests)",
        },
        {
          name: "Trust Fund Cooler",
          price_weekday: 495,
          price_weekend: 495,
          billiard_time_minutes: 120,
          max_guests: 12,
          additional_guest_fee: 5,
          is_available: true,
          includes_billiard_time: true,
          description:
            "2 Liquor Bottles 750mL, 12 Beers/Seltzers, 4 Red Bulls, includes 2 hours billiard rental (2 tables)",
        },
      ]

      for (const combo of combos) {
        const { error: insertError } = await supabase.from("combos").upsert({ ...combo }, { onConflict: "name" })

        if (insertError) {
          console.error(`Error inserting combo ${combo.name}:`, insertError)
        }
      }
    } catch (error) {
      console.error("Error processing PDF menu:", error)
    }
  }

  // Process Excel menu (placeholder - would use an Excel parsing library in production)
  private async processExcelMenu(fileName: string): Promise<void> {
    // In a real implementation, you would:
    // 1. Download the file from storage
    // 2. Use an Excel parsing library to extract data
    // 3. Map the data to menu item structure
    // 4. Store the structured data in the database

    console.log(`Processing Excel menu: ${fileName}`)
    // Similar implementation to processPdfMenu
  }

  // Process sales data (placeholder)
  private async processSalesData(fileName: string): Promise<void> {
    // Similar to above, but for sales data
    console.log(`Processing sales data: ${fileName}`)

    try {
      const supabase = getSupabaseClient()

      // Check if the sales_data table exists, create it if not
      const { error: tableError } = await supabase.rpc("create_table_if_not_exists", {
        table_name: "sales_data",
        create_query: `
          CREATE TABLE sales_data (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            item_id TEXT NOT NULL,
            date DATE NOT NULL,
            quantity INTEGER NOT NULL,
            revenue NUMERIC(10,2) NOT NULL,
            time_of_day TEXT NOT NULL,
            day_of_week TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `,
      })

      if (tableError) {
        console.error("Error creating sales_data table:", tableError)
        // Continue anyway, table might already exist
      }

      // Insert sample sales data
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const sampleSalesData = [
        {
          item_id: "Buffalo Chicken Dip",
          date: today.toISOString().split("T")[0],
          quantity: 12,
          revenue: 132,
          time_of_day: "evening",
          day_of_week: today.toLocaleDateString("en-US", { weekday: "long" }),
        },
        {
          item_id: "French Fries",
          date: today.toISOString().split("T")[0],
          quantity: 18,
          revenue: 234,
          time_of_day: "evening",
          day_of_week: today.toLocaleDateString("en-US", { weekday: "long" }),
        },
        {
          item_id: "Six-Pack App",
          date: yesterday.toISOString().split("T")[0],
          quantity: 5,
          revenue: 640,
          time_of_day: "evening",
          day_of_week: yesterday.toLocaleDateString("en-US", { weekday: "long" }),
        },
      ]

      for (const sale of sampleSalesData) {
        const { error: insertError } = await supabase.from("sales_data").insert(sale)

        if (insertError) {
          console.error(`Error inserting sales data for ${sale.item_id}:`, insertError)
        }
      }
    } catch (error) {
      console.error("Error processing sales data:", error)
    }
  }

  // Get menu items
  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase.from("menu_items").select("*").order("category")

      if (error) throw error

      return data as MenuItem[]
    } catch (error) {
      console.error("Error getting menu items:", error)
      return []
    }
  }

  // Get combo items from the existing combos table
  async getCombos(): Promise<ComboItem[]> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase.from("combos").select("*").eq("is_available", true).order("price_weekday")

      if (error) throw error

      return data as ComboItem[]
    } catch (error) {
      console.error("Error getting combo items:", error)
      return []
    }
  }

  // Get sales data
  async getSalesData(startDate?: string, endDate?: string): Promise<SalesData[]> {
    try {
      const supabase = getSupabaseClient()

      let query = supabase.from("sales_data").select("*")

      if (startDate) {
        query = query.gte("date", startDate)
      }

      if (endDate) {
        query = query.lte("date", endDate)
      }

      const { data, error } = await query.order("date", { ascending: false })

      if (error) throw error

      return data as SalesData[]
    } catch (error) {
      console.error("Error getting sales data:", error)
      return []
    }
  }

  // Get menu recommendations based on table data
  async getMenuRecommendations(
    tableId: number,
    guestCount: number,
    sessionDuration: number,
  ): Promise<MenuRecommendation[]> {
    try {
      console.log(
        `getMenuRecommendations called with tableId: ${tableId}, guestCount: ${guestCount}, sessionDuration: ${sessionDuration}`,
      )
      // Ensure we have a valid guest count (default to 2 if not provided)
      const effectiveGuestCount = guestCount <= 0 ? 2 : guestCount

      // Get current time info
      const now = new Date()
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" })
      const hour = now.getHours()
      let timeOfDay = "morning"
      const isWeekend = dayOfWeek === "Friday" || dayOfWeek === "Saturday"

      if (hour >= 12 && hour < 17) {
        timeOfDay = "afternoon"
      } else if (hour >= 17) {
        timeOfDay = "evening"
      }

      // Get menu items
      const menuItems = await this.getMenuItems()
      console.log(`getMenuItems returned ${menuItems.length} items`)

      // If no menu items found in database, use hardcoded fallback data
      if (!menuItems || menuItems.length === 0) {
        console.log("No menu items found, using fallback recommendations")
        return this.getFallbackRecommendations(effectiveGuestCount, sessionDuration, isWeekend, timeOfDay)
      }

      // Get combo items from the existing combos table
      const combos = await this.getCombos()
      console.log(`getCombos returned ${combos.length} combos`)

      // If no combos found, use hardcoded fallback data
      if (!combos || combos.length === 0) {
        console.log("No combos found, using fallback recommendations")
        return this.getFallbackRecommendations(effectiveGuestCount, sessionDuration, isWeekend, timeOfDay)
      }

      // Continue with the existing logic...
      const recommendations: MenuRecommendation[] = []
      const sessionDurationMinutes = sessionDuration / 60000
      const isShortSession = sessionDurationMinutes < 30
      const isLongSession = sessionDurationMinutes > 60

      // First, recommend appropriate combos based on guest count and session duration
      const appropriateCombos = combos.filter((combo) => {
        // Check if combo is suitable for the number of guests
        const guestMatch = combo.max_guests >= guestCount

        // Check if combo includes enough billiard time
        const timeMatch = !combo.includes_billiard_time || combo.billiard_time_minutes >= sessionDurationMinutes

        return guestMatch && timeMatch
      })

      // Sort combos by relevance
      appropriateCombos.sort((a, b) => {
        // Calculate a relevance score
        const scoreA = this.calculateComboRelevance(a, guestCount, sessionDurationMinutes, isWeekend)
        const scoreB = this.calculateComboRelevance(b, guestCount, sessionDurationMinutes, isWeekend)

        return scoreB - scoreA
      })

      // Take top 3 combos
      const topCombos = appropriateCombos.slice(0, 3)

      // Add combos to recommendations
      topCombos.forEach((combo) => {
        const price = isWeekend ? combo.price_weekend : combo.price_weekday
        let reason = `Perfect for ${guestCount} guests`

        if (combo.includes_billiard_time) {
          reason += `, includes ${combo.billiard_time_minutes} minutes of billiard time`
        }

        if (combo.max_guests > guestCount) {
          reason += `, can accommodate up to ${combo.max_guests} guests`
        }

        recommendations.push({
          itemId: combo.id,
          itemName: combo.name,
          confidence: 0.9,
          reason,
          price,
          imageUrl: combo.image_url,
        })
      })

      // If we don't have enough recommendations from combos, add individual menu items
      if (recommendations.length < 5 && menuItems.length > 0) {
        // Filter and sort menu items based on criteria
        const filteredItems = menuItems
          .filter((item) => item.isAvailable)
          .sort((a, b) => {
            // Calculate a score for each item
            let scoreA = a.popularity
            let scoreB = b.popularity

            // Adjust score based on session duration
            if (isShortSession && a.category.includes("Quick")) scoreA += 3
            if (isShortSession && b.category.includes("Quick")) scoreB += 3

            if (isLongSession && a.category.includes("Premium")) scoreA += 3
            if (isLongSession && b.category.includes("Premium")) scoreB += 3

            // Return comparison
            return scoreB - scoreA
          })

        // Take top items to fill remaining recommendations
        const remainingSlots = 5 - recommendations.length
        const topItems = filteredItems.slice(0, remainingSlots)

        // Add to recommendations
        topItems.forEach((item) => {
          let reason = `Popular ${item.category.toLowerCase()} item`

          if (isShortSession && item.category.includes("Quick")) {
            reason = "Quick to serve for shorter sessions"
          } else if (isLongSession && item.category.includes("Premium")) {
            reason = "Premium option for longer sessions"
          }

          if (guestCount > 3) {
            reason += `, great for groups of ${guestCount}`
          }

          recommendations.push({
            itemId: item.id,
            itemName: item.name,
            confidence: (item.popularity / 10) * 0.8 + 0.2, // Scale to 0-1
            reason,
            price: item.price,
            imageUrl: item.imageUrl,
          })
        })
      }

      // If the guest count is 6 or more, prioritize open bar and bottle packages
      if (effectiveGuestCount >= 6) {
        const openBarAndBottlePackages = menuItems.filter(
          (item) => item.category === "Special" && (item.name.includes("Cooler") || item.name.includes("Package")),
        )

        if (openBarAndBottlePackages.length > 0) {
          // Sort by price (highest first)
          openBarAndBottlePackages.sort((a, b) => b.price - a.price)

          // Add top 2 open bar and bottle packages
          const topPackages = openBarAndBottlePackages.slice(0, 2)
          topPackages.forEach((item) => {
            recommendations.push({
              itemId: item.id,
              itemName: item.name,
              confidence: 0.9,
              reason: `Perfect for larger groups, great value for ${effectiveGuestCount} guests`,
              price: item.price,
              imageUrl: item.imageUrl,
            })
          })
        }
      }

      console.log(`Returning ${recommendations.length} recommendations:`, recommendations)
      return recommendations
    } catch (error) {
      console.error("Error getting menu recommendations:", error)
      return this.getFallbackRecommendations(guestCount, sessionDuration, false, "evening")
    }
  }

  // Add a new method for fallback recommendations
  private getFallbackRecommendations(
    guestCount: number,
    sessionDuration: number,
    isWeekend: boolean,
    timeOfDay: string,
  ): MenuRecommendation[] {
    const recommendations: MenuRecommendation[] = []
    const sessionDurationMinutes = sessionDuration / 60000
    const isLargeGroup = guestCount >= 6

    // Add appropriate combo based on group size
    if (guestCount <= 2) {
      recommendations.push({
        itemId: "combo-for-two",
        itemName: "Combo For Two",
        confidence: 0.95,
        reason: `Perfect for ${guestCount} guests, includes drinks and 1 hour billiard rental`,
        price: isWeekend ? 69 : 59,
      })

      recommendations.push({
        itemId: "cocktail-combo",
        itemName: "Cocktail Combo",
        confidence: 0.85,
        reason: "1 Cocktail Per Person + 1 Hour Billiard Rental",
        price: isWeekend ? 69 : 59,
      })
    } else if (guestCount <= 4) {
      recommendations.push({
        itemId: "combo-for-four",
        itemName: "Combo For Four",
        confidence: 0.95,
        reason: `Great for your group of ${guestCount}, includes drinks and billiard time`,
        price: isWeekend ? 105 : 95,
      })

      recommendations.push({
        itemId: "six-pack-app",
        itemName: "Six-Pack App Special",
        confidence: 0.9,
        reason: "4 Beers/Seltzers, 2 Soju Bottles, includes 1 hour billiard rental",
        price: 128,
      })
    } else {
      recommendations.push({
        itemId: "social-club-cooler",
        itemName: "Social Club Cooler",
        confidence: 0.9,
        reason: `Perfect for groups of ${guestCount}, includes liquor, beer, and 2 hours of billiard time`,
        price: 349,
      })
    }

    // Add food recommendations based on group size
    if (guestCount > 3) {
      recommendations.push({
        itemId: "all-star-platter",
        itemName: "All-Star Platter",
        confidence: 0.9,
        reason: "Perfect for sharing with your group, variety of appetizers",
        price: 33,
      })

      recommendations.push({
        itemId: "chicken-wings",
        itemName: "Chicken Wings",
        confidence: 0.85,
        reason: "Our most popular shareable appetizer",
        price: 19,
      })
    } else {
      recommendations.push({
        itemId: "buffalo-chicken-dip",
        itemName: "Buffalo Chicken Dip",
        confidence: 0.85,
        reason: "Mildly spicy dip, perfect for sharing",
        price: 11,
      })

      recommendations.push({
        itemId: "mozzarella-sticks",
        itemName: "Mozzarella Sticks",
        confidence: 0.8,
        reason: "Classic appetizer, pairs well with drinks",
        price: 13,
      })
    }

    // Add drink recommendations
    if (timeOfDay === "evening") {
      if (guestCount > 3) {
        recommendations.push({
          itemId: "beer-tower",
          itemName: "Beer Tower",
          confidence: 0.9,
          reason: "100oz beer tower, perfect for groups",
          price: 65,
        })
      } else {
        recommendations.push({
          itemId: "beer-bucket",
          itemName: "Beer Bucket",
          confidence: 0.85,
          reason: "Pick any 5 beers, great value",
          price: 39,
        })
      }
    } else {
      recommendations.push({
        itemId: "sangria-pitcher",
        itemName: "Sangria Pitcher",
        confidence: 0.8,
        reason: "Refreshing choice for daytime sessions",
        price: 55,
      })
    }

    // If it's a large group, recommend open bar and bottle packages
    if (isLargeGroup) {
      recommendations.push({
        itemId: "social-club-cooler",
        itemName: "Social Club Cooler",
        confidence: 0.9,
        reason: "1 Liquor Bottle 750mL, 6 Beers/Seltzers, 2 Red Bulls, includes 2 hours billiard rental",
        price: 349,
      })
      recommendations.push({
        itemId: "trust-fund-cooler",
        itemName: "Trust Fund Cooler",
        confidence: 0.85,
        reason: "2 Liquor Bottles 750mL, 12 Beers/Seltzers, 4 Red Bulls, includes 2 hours billiard rental (2 tables)",
        price: 495,
      })
    }

    return recommendations
  }

  // Calculate relevance score for a combo
  private calculateComboRelevance(
    combo: ComboItem,
    guestCount: number,
    sessionDurationMinutes: number,
    isWeekend: boolean,
  ): number {
    let score = 0

    // Perfect guest count match gets highest score
    if (combo.max_guests === guestCount) {
      score += 5
    } else {
      // Penalize for wasted capacity
      score += 5 - Math.min(4, combo.max_guests - guestCount)
    }

    // Perfect time match gets highest score
    if (combo.includes_billiard_time) {
      const timeDifference = Math.abs(combo.billiard_time_minutes - sessionDurationMinutes)
      if (timeDifference < 15) {
        score += 5 // Perfect match
      } else if (timeDifference < 30) {
        score += 3 // Good match
      } else {
        score += 1 // Not ideal but acceptable
      }
    }

    // Price factor - lower price gets higher score
    const price = isWeekend ? combo.price_weekend : combo.price_weekday
    const pricePerPerson = price / Math.max(1, guestCount)
    if (pricePerPerson < 30) {
      score += 3
    } else if (pricePerPerson < 50) {
      score += 2
    } else {
      score += 1
    }

    return score
  }
}

const menuDataService = new MenuDataService()
export default menuDataService
