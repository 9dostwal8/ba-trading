export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badge_fees: {
        Row: {
          badge_key: string
          is_paid: boolean
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge_key: string
          is_paid?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge_key?: string
          is_paid?: boolean
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      banner_slots: {
        Row: {
          created_at: string
          desc_ar: string | null
          desc_ku: string | null
          id: string
          is_active: boolean
          max_banners: number
          name_ar: string
          name_ku: string
          price: number
          slot_key: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          desc_ar?: string | null
          desc_ku?: string | null
          id?: string
          is_active?: boolean
          max_banners?: number
          name_ar: string
          name_ku: string
          price?: number
          slot_key: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          desc_ar?: string | null
          desc_ku?: string | null
          id?: string
          is_active?: boolean
          max_banners?: number
          name_ar?: string
          name_ku?: string
          price?: number
          slot_key?: string
          sort_order?: number
        }
        Relationships: []
      }
      banners: {
        Row: {
          bg_color: string | null
          created_at: string
          cta_ar: string | null
          cta_ku: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          slot_key: string
          sort_order: number
          starts_at: string | null
          subtitle_ar: string | null
          subtitle_ku: string | null
          text_color: string | null
          title_ar: string
          title_ku: string
          vendor_id: string | null
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          cta_ar?: string | null
          cta_ku?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          slot_key?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_ar?: string | null
          subtitle_ku?: string | null
          text_color?: string | null
          title_ar?: string
          title_ku?: string
          vendor_id?: string | null
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          cta_ar?: string | null
          cta_ku?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          slot_key?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_ar?: string | null
          subtitle_ku?: string | null
          text_color?: string | null
          title_ar?: string
          title_ku?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_cards: {
        Row: {
          chroma: number
          created_at: string
          hue: number
          id: string
          is_active: boolean
          logo_domain: string | null
          logo_url: string | null
          mark: string
          match_key: string
          name: string
          product_ids: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          chroma?: number
          created_at?: string
          hue?: number
          id?: string
          is_active?: boolean
          logo_domain?: string | null
          logo_url?: string | null
          mark?: string
          match_key?: string
          name: string
          product_ids?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chroma?: number
          created_at?: string
          hue?: number
          id?: string
          is_active?: boolean
          logo_domain?: string | null
          logo_url?: string | null
          mark?: string
          match_key?: string
          name?: string
          product_ids?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bundles: {
        Row: {
          chroma: number
          compare_price: number | null
          created_at: string
          ends_at: string | null
          expiry_date: string | null
          hue: number
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          price: number
          product_ids: string[]
          sort_order: number
          stock: number
          subtitle_ar: string
          subtitle_ku: string
          title_ar: string
          title_ku: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          chroma?: number
          compare_price?: number | null
          created_at?: string
          ends_at?: string | null
          expiry_date?: string | null
          hue?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          price?: number
          product_ids?: string[]
          sort_order?: number
          stock?: number
          subtitle_ar?: string
          subtitle_ku?: string
          title_ar?: string
          title_ku?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          chroma?: number
          compare_price?: number | null
          created_at?: string
          ends_at?: string | null
          expiry_date?: string | null
          hue?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          price?: number
          product_ids?: string[]
          sort_order?: number
          stock?: number
          subtitle_ar?: string
          subtitle_ku?: string
          title_ar?: string
          title_ku?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          brand: string
          category_id: string | null
          created_at: string
          description_ar: string
          description_ku: string
          id: string
          image_url: string | null
          match_key: string
          name_ar: string
          name_ku: string
          sku: string
          updated_at: string
        }
        Insert: {
          brand?: string
          category_id?: string | null
          created_at?: string
          description_ar?: string
          description_ku?: string
          id?: string
          image_url?: string | null
          match_key: string
          name_ar?: string
          name_ku?: string
          sku?: string
          updated_at?: string
        }
        Update: {
          brand?: string
          category_id?: string | null
          created_at?: string
          description_ar?: string
          description_ku?: string
          id?: string
          image_url?: string | null
          match_key?: string
          name_ar?: string
          name_ku?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          chroma: number
          created_at: string
          hue: number
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_ku: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          chroma?: number
          created_at?: string
          hue?: number
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_ku: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chroma?: number
          created_at?: string
          hue?: number
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_ku?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      clearance_rules: {
        Row: {
          chroma: number
          created_at: string
          discount_percent: number
          hue: number
          id: string
          is_active: boolean
          label_ar: string
          label_ku: string
          months_left: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          chroma?: number
          created_at?: string
          discount_percent?: number
          hue?: number
          id?: string
          is_active?: boolean
          label_ar?: string
          label_ku?: string
          months_left: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chroma?: number
          created_at?: string
          discount_percent?: number
          hue?: number
          id?: string
          is_active?: boolean
          label_ar?: string
          label_ku?: string
          months_left?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          starts_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          starts_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          starts_at?: string
          used_count?: number
        }
        Relationships: []
      }
      design_settings: {
        Row: {
          created_at: string
          draft: Json
          id: string
          published: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft?: Json
          id?: string
          published?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft?: Json
          id?: string
          published?: Json
          updated_at?: string
        }
        Relationships: []
      }
      flash_deals: {
        Row: {
          badge_ar: string
          badge_ku: string
          chroma: number
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          hue: number
          id: string
          image_url: string | null
          is_active: boolean
          max_discount: number | null
          max_qty_per_order: number | null
          min_qty: number
          priority: number
          product_id: string | null
          sort_order: number
          starts_at: string
          subtitle_ar: string
          subtitle_ku: string
          title_ar: string
          title_ku: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          badge_ar?: string
          badge_ku?: string
          chroma?: number
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          hue?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_discount?: number | null
          max_qty_per_order?: number | null
          min_qty?: number
          priority?: number
          product_id?: string | null
          sort_order?: number
          starts_at?: string
          subtitle_ar?: string
          subtitle_ku?: string
          title_ar?: string
          title_ku?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          badge_ar?: string
          badge_ku?: string
          chroma?: number
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          hue?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_discount?: number | null
          max_qty_per_order?: number | null
          min_qty?: number
          priority?: number
          product_id?: string | null
          sort_order?: number
          starts_at?: string
          subtitle_ar?: string
          subtitle_ku?: string
          title_ar?: string
          title_ku?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_deals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          chroma: number
          created_at: string
          hue: number
          id: string
          is_active: boolean
          item_limit: number
          kind: string
          layout: string
          show_title: boolean
          sort_order: number
          title_ar: string
          title_ku: string
          updated_at: string
        }
        Insert: {
          chroma?: number
          created_at?: string
          hue?: number
          id?: string
          is_active?: boolean
          item_limit?: number
          kind: string
          layout?: string
          show_title?: boolean
          sort_order?: number
          title_ar?: string
          title_ku?: string
          updated_at?: string
        }
        Update: {
          chroma?: number
          created_at?: string
          hue?: number
          id?: string
          is_active?: boolean
          item_limit?: number
          kind?: string
          layout?: string
          show_title?: boolean
          sort_order?: number
          title_ar?: string
          title_ku?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_plans: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          kind: string
          note_ar: string
          note_ku: string
          price: number
          sort_order: number
          updated_at: string
          vendor_allowed: boolean
        }
        Insert: {
          created_at?: string
          duration_days?: number
          id?: string
          kind: string
          note_ar?: string
          note_ku?: string
          price?: number
          sort_order?: number
          updated_at?: string
          vendor_allowed?: boolean
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          kind?: string
          note_ar?: string
          note_ku?: string
          price?: number
          sort_order?: number
          updated_at?: string
          vendor_allowed?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body_ar: string
          body_en: string
          body_ku: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string
          order_id: string | null
          title_ar: string
          title_en: string
          title_ku: string
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          body_ar?: string
          body_en?: string
          body_ku?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link?: string
          order_id?: string | null
          title_ar?: string
          title_en?: string
          title_ku?: string
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          body_ar?: string
          body_en?: string
          body_ku?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string
          order_id?: string | null
          title_ar?: string
          title_en?: string
          title_ku?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      offer_products: {
        Row: {
          offer_id: string
          product_id: string
        }
        Insert: {
          offer_id: string
          product_id: string
        }
        Update: {
          offer_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_products_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          badge_ar: string
          badge_ku: string
          brand: string
          buy_qty: number
          category_id: string | null
          chroma: number
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          get_qty: number
          hue: number
          id: string
          image_url: string | null
          is_active: boolean
          max_discount: number | null
          min_qty: number
          priority: number
          reward_bonus_points: number
          reward_multiplier: number
          scope: string
          sort_order: number
          starts_at: string
          subtitle_ar: string
          subtitle_ku: string
          title_ar: string
          title_ku: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          badge_ar?: string
          badge_ku?: string
          brand?: string
          buy_qty?: number
          category_id?: string | null
          chroma?: number
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          get_qty?: number
          hue?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_discount?: number | null
          min_qty?: number
          priority?: number
          reward_bonus_points?: number
          reward_multiplier?: number
          scope?: string
          sort_order?: number
          starts_at?: string
          subtitle_ar?: string
          subtitle_ku?: string
          title_ar: string
          title_ku: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          badge_ar?: string
          badge_ku?: string
          brand?: string
          buy_qty?: number
          category_id?: string | null
          chroma?: number
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          get_qty?: number
          hue?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_discount?: number | null
          min_qty?: number
          priority?: number
          reward_bonus_points?: number
          reward_multiplier?: number
          scope?: string
          sort_order?: number
          starts_at?: string
          subtitle_ar?: string
          subtitle_ku?: string
          title_ar?: string
          title_ku?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          accepted_at: string | null
          bundle_id: string | null
          commission_amount: number
          commission_scope: string | null
          commission_type: string | null
          commission_value: number | null
          fulfillment_status: string
          id: string
          image_url: string | null
          name_ar: string
          name_ku: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          vendor_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          bundle_id?: string | null
          commission_amount?: number
          commission_scope?: string | null
          commission_type?: string | null
          commission_value?: number | null
          fulfillment_status?: string
          id?: string
          image_url?: string | null
          name_ar: string
          name_ku: string
          order_id: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          vendor_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          bundle_id?: string | null
          commission_amount?: number
          commission_scope?: string | null
          commission_type?: string | null
          commission_value?: number | null
          fulfillment_status?: string
          id?: string
          image_url?: string | null
          name_ar?: string
          name_ku?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          city: string
          coins_discount: number
          coins_earned: number
          coins_spent: number
          coupon_code: string | null
          created_at: string
          customer_name: string
          discount: number
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          order_no: number
          paid_at: string | null
          payment_method: string
          payment_status: string
          phone: string
          qi_form_url: string | null
          qi_payment_id: string | null
          qi_request_id: string | null
          qi_status: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          coins_discount?: number
          coins_earned?: number
          coins_spent?: number
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          discount?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          order_no?: number
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          phone: string
          qi_form_url?: string | null
          qi_payment_id?: string | null
          qi_request_id?: string | null
          qi_status?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          coins_discount?: number
          coins_earned?: number
          coins_spent?: number
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          discount?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          order_no?: number
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string
          qi_form_url?: string | null
          qi_payment_id?: string | null
          qi_request_id?: string | null
          qi_status?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_blocks: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          kind: string
          page: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          page: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          page?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_documents: {
        Row: {
          created_at: string
          draft: Json
          id: string
          page: string
          published: Json
          published_at: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          draft?: Json
          id?: string
          page: string
          published?: Json
          published_at?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          draft?: Json
          id?: string
          page?: string
          published?: Json
          published_at?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          image_url: string | null
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          image_url?: string | null
          product_id: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tiers: {
        Row: {
          created_at: string
          id: string
          min_qty: number
          price: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_qty?: number
          price?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_qty?: number
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badges: string[]
          batch_no: string | null
          brand: string
          catalog_item_id: string | null
          category_id: string | null
          clearance_kind: string
          compare_price: number | null
          created_at: string
          description_ar: string
          description_ku: string
          expiry_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name_ar: string
          name_ku: string
          price: number
          reward_bonus_points: number
          reward_multiplier: number
          sku: string
          stock: number
          stocked_since: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          badges?: string[]
          batch_no?: string | null
          brand?: string
          catalog_item_id?: string | null
          category_id?: string | null
          clearance_kind?: string
          compare_price?: number | null
          created_at?: string
          description_ar?: string
          description_ku?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name_ar: string
          name_ku: string
          price?: number
          reward_bonus_points?: number
          reward_multiplier?: number
          sku?: string
          stock?: number
          stocked_since?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          badges?: string[]
          batch_no?: string | null
          brand?: string
          catalog_item_id?: string | null
          category_id?: string | null
          clearance_kind?: string
          compare_price?: number | null
          created_at?: string
          description_ar?: string
          description_ku?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name_ar?: string
          name_ku?: string
          price?: number
          reward_bonus_points?: number
          reward_multiplier?: number
          sku?: string
          stock?: number
          stocked_since?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string
          clinic_name: string
          created_at: string
          full_name: string
          id: string
          lang: string
          phone: string
          preferred_categories: string[]
          referral_code: string
          referred_by: string | null
          specialty: string
          updated_at: string
        }
        Insert: {
          city?: string
          clinic_name?: string
          created_at?: string
          full_name?: string
          id: string
          lang?: string
          phone?: string
          preferred_categories?: string[]
          referral_code?: string
          referred_by?: string | null
          specialty?: string
          updated_at?: string
        }
        Update: {
          city?: string
          clinic_name?: string
          created_at?: string
          full_name?: string
          id?: string
          lang?: string
          phone?: string
          preferred_categories?: string[]
          referral_code?: string
          referred_by?: string | null
          specialty?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          lang: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          lang?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          lang?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reward_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          points: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          points?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          points?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          accent_chroma: number
          accent_hue: number
          address_ar: string
          address_ku: string
          announcement_ar: string
          announcement_ku: string
          contact_email: string
          contact_phone: string
          cost_credits_per_dentist: number
          cost_credits_per_order: number
          cost_credits_per_vendor: number
          cost_fixed_credits: number
          cost_subscription_usd: number
          cost_usd_iqd_rate: number
          cost_usd_per_credit: number
          created_at: string
          currency_ar: string
          currency_ku: string
          default_lang: string
          delivery_fee: number
          facebook_url: string
          favicon_url: string | null
          free_delivery_over: number
          id: string
          instagram_url: string
          lang_ar_enabled: boolean
          lang_en_enabled: boolean
          lang_ku_enabled: boolean
          logo_emoji: string
          logo_url: string | null
          maintenance_mode: boolean
          maintenance_note_ar: string
          maintenance_note_ku: string
          meta_description_ar: string
          meta_description_ku: string
          meta_title_ar: string
          meta_title_ku: string
          min_order_total: number
          og_image_url: string | null
          points_per_1000_iqd: number
          price_badge: number
          price_bundle: number
          price_flash_deal: number
          price_offer: number
          primary_chroma: number
          primary_hue: number
          radius_px: number
          reward_bar_cta: Json
          reward_bar_icon: string
          reward_bar_items: Json
          reward_bar_link: string
          reward_vendor_cost_factor: number
          reward_vendor_enabled: boolean
          reward_vendor_max_bonus: number
          reward_vendor_max_multiplier: number
          rewards_enabled: boolean
          rewards_max_redeem_percent: number
          rewards_note_ar: string
          rewards_note_en: string
          rewards_note_ku: string
          show_announcement: boolean
          show_reward_bar: boolean
          show_search: boolean
          show_vendor_join_cta: boolean
          singleton: boolean
          site_name_ar: string
          site_name_ku: string
          tagline_ar: string
          tagline_ku: string
          telegram_url: string
          theme_gradient: string
          updated_at: string
          vendor_cta: Json
          vendor_join_cta_link: string
          wallet_enabled: boolean
          wallet_max_balance: number
          wallet_note_ar: string
          wallet_note_ku: string
          whatsapp: string
        }
        Insert: {
          accent_chroma?: number
          accent_hue?: number
          address_ar?: string
          address_ku?: string
          announcement_ar?: string
          announcement_ku?: string
          contact_email?: string
          contact_phone?: string
          cost_credits_per_dentist?: number
          cost_credits_per_order?: number
          cost_credits_per_vendor?: number
          cost_fixed_credits?: number
          cost_subscription_usd?: number
          cost_usd_iqd_rate?: number
          cost_usd_per_credit?: number
          created_at?: string
          currency_ar?: string
          currency_ku?: string
          default_lang?: string
          delivery_fee?: number
          facebook_url?: string
          favicon_url?: string | null
          free_delivery_over?: number
          id?: string
          instagram_url?: string
          lang_ar_enabled?: boolean
          lang_en_enabled?: boolean
          lang_ku_enabled?: boolean
          logo_emoji?: string
          logo_url?: string | null
          maintenance_mode?: boolean
          maintenance_note_ar?: string
          maintenance_note_ku?: string
          meta_description_ar?: string
          meta_description_ku?: string
          meta_title_ar?: string
          meta_title_ku?: string
          min_order_total?: number
          og_image_url?: string | null
          points_per_1000_iqd?: number
          price_badge?: number
          price_bundle?: number
          price_flash_deal?: number
          price_offer?: number
          primary_chroma?: number
          primary_hue?: number
          radius_px?: number
          reward_bar_cta?: Json
          reward_bar_icon?: string
          reward_bar_items?: Json
          reward_bar_link?: string
          reward_vendor_cost_factor?: number
          reward_vendor_enabled?: boolean
          reward_vendor_max_bonus?: number
          reward_vendor_max_multiplier?: number
          rewards_enabled?: boolean
          rewards_max_redeem_percent?: number
          rewards_note_ar?: string
          rewards_note_en?: string
          rewards_note_ku?: string
          show_announcement?: boolean
          show_reward_bar?: boolean
          show_search?: boolean
          show_vendor_join_cta?: boolean
          singleton?: boolean
          site_name_ar?: string
          site_name_ku?: string
          tagline_ar?: string
          tagline_ku?: string
          telegram_url?: string
          theme_gradient?: string
          updated_at?: string
          vendor_cta?: Json
          vendor_join_cta_link?: string
          wallet_enabled?: boolean
          wallet_max_balance?: number
          wallet_note_ar?: string
          wallet_note_ku?: string
          whatsapp?: string
        }
        Update: {
          accent_chroma?: number
          accent_hue?: number
          address_ar?: string
          address_ku?: string
          announcement_ar?: string
          announcement_ku?: string
          contact_email?: string
          contact_phone?: string
          cost_credits_per_dentist?: number
          cost_credits_per_order?: number
          cost_credits_per_vendor?: number
          cost_fixed_credits?: number
          cost_subscription_usd?: number
          cost_usd_iqd_rate?: number
          cost_usd_per_credit?: number
          created_at?: string
          currency_ar?: string
          currency_ku?: string
          default_lang?: string
          delivery_fee?: number
          facebook_url?: string
          favicon_url?: string | null
          free_delivery_over?: number
          id?: string
          instagram_url?: string
          lang_ar_enabled?: boolean
          lang_en_enabled?: boolean
          lang_ku_enabled?: boolean
          logo_emoji?: string
          logo_url?: string | null
          maintenance_mode?: boolean
          maintenance_note_ar?: string
          maintenance_note_ku?: string
          meta_description_ar?: string
          meta_description_ku?: string
          meta_title_ar?: string
          meta_title_ku?: string
          min_order_total?: number
          og_image_url?: string | null
          points_per_1000_iqd?: number
          price_badge?: number
          price_bundle?: number
          price_flash_deal?: number
          price_offer?: number
          primary_chroma?: number
          primary_hue?: number
          radius_px?: number
          reward_bar_cta?: Json
          reward_bar_icon?: string
          reward_bar_items?: Json
          reward_bar_link?: string
          reward_vendor_cost_factor?: number
          reward_vendor_enabled?: boolean
          reward_vendor_max_bonus?: number
          reward_vendor_max_multiplier?: number
          rewards_enabled?: boolean
          rewards_max_redeem_percent?: number
          rewards_note_ar?: string
          rewards_note_en?: string
          rewards_note_ku?: string
          show_announcement?: boolean
          show_reward_bar?: boolean
          show_search?: boolean
          show_vendor_join_cta?: boolean
          singleton?: boolean
          site_name_ar?: string
          site_name_ku?: string
          tagline_ar?: string
          tagline_ku?: string
          telegram_url?: string
          theme_gradient?: string
          updated_at?: string
          vendor_cta?: Json
          vendor_join_cta_link?: string
          wallet_enabled?: boolean
          wallet_max_balance?: number
          wallet_note_ar?: string
          wallet_note_ku?: string
          whatsapp?: string
        }
        Relationships: []
      }
      ui_texts: {
        Row: {
          ar: string
          created_at: string
          en: string | null
          key: string
          ku: string
          section: string
          updated_at: string
        }
        Insert: {
          ar?: string
          created_at?: string
          en?: string | null
          key: string
          ku?: string
          section?: string
          updated_at?: string
        }
        Update: {
          ar?: string
          created_at?: string
          en?: string | null
          key?: string
          ku?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usp_items: {
        Row: {
          chroma: number
          created_at: string
          hue: number
          icon: string
          id: string
          is_active: boolean
          sort_order: number
          title_ar: string
          title_ku: string
          updated_at: string
        }
        Insert: {
          chroma?: number
          created_at?: string
          hue?: number
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title_ar?: string
          title_ku?: string
          updated_at?: string
        }
        Update: {
          chroma?: number
          created_at?: string
          hue?: number
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title_ar?: string
          title_ku?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          address_line: string
          city: string
          created_at: string
          id: string
          note: string
          phone: string
          reviewed_at: string | null
          status: string
          store_name: string
          updated_at: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          address_line?: string
          city?: string
          created_at?: string
          id?: string
          note?: string
          phone: string
          reviewed_at?: string | null
          status?: string
          store_name: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          id?: string
          note?: string
          phone?: string
          reviewed_at?: string | null
          status?: string
          store_name?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_applications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_charges: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          label: string
          paid_at: string | null
          ref_id: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kind: string
          label?: string
          paid_at?: string | null
          ref_id?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          paid_at?: string | null
          ref_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_charges_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_members: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_reward_points: {
        Row: {
          cost: number
          created_at: string
          id: string
          note: string
          offer_id: string | null
          order_id: string
          order_item_id: string | null
          points: number
          product_id: string | null
          source: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          note?: string
          offer_id?: string | null
          order_id: string
          order_item_id?: string | null
          points?: number
          product_id?: string | null
          source?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          note?: string
          offer_id?: string | null
          order_id?: string
          order_item_id?: string | null
          points?: number
          product_id?: string | null
          source?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reward_points_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reward_points_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reward_points_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reward_points_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reward_points_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_settlements: {
        Row: {
          amount: number
          closed_at: string | null
          commission_total: number
          created_at: string
          id: string
          marketing_total: number
          note: string
          paid_amount: number
          paid_at: string | null
          period: string
          rewards_total: number
          sales_total: number
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          closed_at?: string | null
          commission_total?: number
          created_at?: string
          id?: string
          marketing_total?: number
          note?: string
          paid_amount?: number
          paid_at?: string | null
          period: string
          rewards_total?: number
          sales_total?: number
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          closed_at?: string | null
          commission_total?: number
          created_at?: string
          id?: string
          marketing_total?: number
          note?: string
          paid_amount?: number
          paid_at?: string | null
          period?: string
          rewards_total?: number
          sales_total?: number
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_settlements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_shipping_rates: {
        Row: {
          city: string
          created_at: string
          fee: number
          free_over: number
          id: string
          is_active: boolean
          updated_at: string
          vendor_id: string
        }
        Insert: {
          city: string
          created_at?: string
          fee?: number
          free_over?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          vendor_id: string
        }
        Update: {
          city?: string
          created_at?: string
          fee?: number
          free_over?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_shipping_rates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          about_ar: string
          about_ku: string
          brand_key: string
          brands: string[]
          chroma: number
          city: string
          code: string
          commission_type: string
          commission_value: number
          cover_url: string | null
          created_at: string
          hue: number
          id: string
          is_active: boolean
          is_verified: boolean
          logo_domain: string | null
          logo_url: string | null
          name: string
          phone: string
          slug: string
          tagline_ar: string
          tagline_ku: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          about_ar?: string
          about_ku?: string
          brand_key?: string
          brands?: string[]
          chroma?: number
          city?: string
          code?: string
          commission_type?: string
          commission_value?: number
          cover_url?: string | null
          created_at?: string
          hue?: number
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_domain?: string | null
          logo_url?: string | null
          name: string
          phone?: string
          slug?: string
          tagline_ar?: string
          tagline_ku?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          about_ar?: string
          about_ku?: string
          brand_key?: string
          brands?: string[]
          chroma?: number
          city?: string
          code?: string
          commission_type?: string
          commission_value?: number
          cover_url?: string | null
          created_at?: string
          hue?: number
          id?: string
          is_active?: boolean
          is_verified?: boolean
          logo_domain?: string | null
          logo_url?: string | null
          name?: string
          phone?: string
          slug?: string
          tagline_ar?: string
          tagline_ku?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      wallet_card_redemptions: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_card_redemptions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "wallet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_cards: {
        Row: {
          amount: number
          batch: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          updated_at: string
          used_count: number
        }
        Insert: {
          amount: number
          batch?: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          amount?: number
          batch?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string
          ref_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string
          ref_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string
          ref_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          is_frozen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          is_frozen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          is_frozen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_broadcast_notification: {
        Args: {
          _audience: string
          _body_ar: string
          _body_en: string
          _body_ku: string
          _kind?: string
          _link?: string
          _title_ar: string
          _title_en: string
          _title_ku: string
          _vendor_id?: string
        }
        Returns: number
      }
      admin_reset_data: { Args: { _scope?: string }; Returns: Json }
      badge_fee: { Args: { _key: string }; Returns: number }
      can_order: { Args: { _user_id: string }; Returns: boolean }
      catalog_key: { Args: { _brand: string; _name: string }; Returns: string }
      claim_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marketing_price: { Args: { _kind: string }; Returns: number }
      my_vendor_ids: { Args: never; Returns: string[] }
      notifications_mark_read: { Args: { _ids?: string[] }; Returns: number }
      notify_admins: {
        Args: {
          _body_ar?: string
          _body_en?: string
          _body_ku?: string
          _kind: string
          _link?: string
          _order_id?: string
          _title_ar: string
          _title_en: string
          _title_ku: string
          _vendor_id?: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body_ar?: string
          _body_en?: string
          _body_ku?: string
          _kind: string
          _link?: string
          _order_id?: string
          _title_ar: string
          _title_en: string
          _title_ku: string
          _user_id: string
          _vendor_id?: string
        }
        Returns: undefined
      }
      notify_vendor: {
        Args: {
          _body_ar?: string
          _body_en?: string
          _body_ku?: string
          _kind: string
          _link?: string
          _order_id?: string
          _title_ar: string
          _title_en: string
          _title_ku: string
          _vendor_id: string
        }
        Returns: undefined
      }
      order_has_my_vendor_items: {
        Args: { _order_id: string }
        Returns: boolean
      }
      order_item_price_floor: {
        Args: { _bundle_id: string; _product_id: string }
        Returns: number
      }
      owns_order: { Args: { _order_id: string }; Returns: boolean }
      push_subscription_prune: {
        Args: { _endpoint: string }
        Returns: undefined
      }
      push_targets: {
        Args: { _audience: string; _vendor_id?: string }
        Returns: {
          auth: string
          endpoint: string
          lang: string
          p256dh: string
        }[]
      }
      push_targets_self: {
        Args: never
        Returns: {
          auth: string
          endpoint: string
          lang: string
          p256dh: string
        }[]
      }
      recalc_order_money: { Args: { _order_id: string }; Returns: undefined }
      reward_award_order: { Args: { _order_id: string }; Returns: undefined }
      reward_claim_profile: { Args: never; Returns: number }
      reward_grant: {
        Args: {
          _kind: string
          _note?: string
          _once?: boolean
          _points: number
          _ref?: string
          _user_id: string
        }
        Returns: number
      }
      reward_my_summary: { Args: never; Returns: Json }
      reward_offer_for_product: {
        Args: { _product_id: string }
        Returns: {
          badge_ar: string
          badge_ku: string
          brand: string
          buy_qty: number
          category_id: string | null
          chroma: number
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          get_qty: number
          hue: number
          id: string
          image_url: string | null
          is_active: boolean
          max_discount: number | null
          min_qty: number
          priority: number
          reward_bonus_points: number
          reward_multiplier: number
          scope: string
          sort_order: number
          starts_at: string
          subtitle_ar: string
          subtitle_ku: string
          title_ar: string
          title_ku: string
          updated_at: string
          vendor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reward_redeem_order: {
        Args: { _order_id: string; _points: number }
        Returns: number
      }
      reward_rule: { Args: { _key: string }; Returns: number }
      reward_use_referral: { Args: { _code: string }; Returns: boolean }
      user_bought_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: { _code: string; _subtotal: number }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
          min_order: number
        }[]
      }
      vendor_order_counts: {
        Args: never
        Returns: {
          orders: number
          vendor_id: string
        }[]
      }
      vendor_shipping_cost: {
        Args: { _city: string; _vendor_id: string; _vendor_subtotal: number }
        Returns: number
      }
      vendor_slugify: { Args: { _id: string; _name: string }; Returns: string }
      vendor_statement: {
        Args: { _period: string; _vendor_id: string }
        Returns: Json
      }
      vendor_statements: {
        Args: { _period: string }
        Returns: {
          commission: number
          marketing: number
          paid_amount: number
          paid_at: string
          payout: number
          rewards: number
          sales: number
          status: string
          store_income: number
          units: number
          vendor_id: string
          vendor_name: string
        }[]
      }
      wallet_admin_adjust: {
        Args: { _amount: number; _note?: string; _user_id: string }
        Returns: number
      }
      wallet_ensure: { Args: { _user_id: string }; Returns: string }
      wallet_my_balance: { Args: never; Returns: number }
      wallet_pay_order: { Args: { _order_id: string }; Returns: number }
      wallet_redeem_card: { Args: { _code: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user" | "brand_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "brand_manager"],
    },
  },
} as const
