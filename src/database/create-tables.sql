-- SQL script to create tables for the enhanced pricing system
-- Run this in Supabase SQL Editor

-- ========================================
-- Table 1: billboard_pricing
-- ========================================
CREATE TABLE IF NOT EXISTS billboard_pricing (
    id SERIAL PRIMARY KEY,
    billboard_size VARCHAR(20) NOT NULL,
    duration_months INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    price_category VARCHAR(1) NOT NULL CHECK (price_category IN ('A', 'B')),
    zone_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Create unique constraint to prevent duplicate entries
    UNIQUE(billboard_size, duration_months, price_category, zone_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billboard_pricing_size ON billboard_pricing(billboard_size);
CREATE INDEX IF NOT EXISTS idx_billboard_pricing_duration ON billboard_pricing(duration_months);
CREATE INDEX IF NOT EXISTS idx_billboard_pricing_category ON billboard_pricing(price_category);
CREATE INDEX IF NOT EXISTS idx_billboard_pricing_zone ON billboard_pricing(zone_name);

-- ========================================
-- Table 2: city_multipliers
-- ========================================
CREATE TABLE IF NOT EXISTS city_multipliers (
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure multiplier is positive
    CHECK (multiplier > 0)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_city_multipliers_name ON city_multipliers(city_name);
CREATE INDEX IF NOT EXISTS idx_city_multipliers_active ON city_multipliers(is_active);

-- ========================================
-- Enable Row Level Security (RLS)
-- ========================================
ALTER TABLE billboard_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_multipliers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Create RLS Policies
-- ========================================

-- Allow authenticated users to read pricing data
CREATE POLICY "Allow authenticated users to read billboard_pricing" ON billboard_pricing
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert pricing data
CREATE POLICY "Allow authenticated users to insert billboard_pricing" ON billboard_pricing
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update pricing data
CREATE POLICY "Allow authenticated users to update billboard_pricing" ON billboard_pricing
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete pricing data
CREATE POLICY "Allow authenticated users to delete billboard_pricing" ON billboard_pricing
    FOR DELETE
    TO authenticated
    USING (true);

-- Allow authenticated users to read city multipliers
CREATE POLICY "Allow authenticated users to read city_multipliers" ON city_multipliers
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert city multipliers
CREATE POLICY "Allow authenticated users to insert city_multipliers" ON city_multipliers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update city multipliers
CREATE POLICY "Allow authenticated users to update city_multipliers" ON city_multipliers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete city multipliers
CREATE POLICY "Allow authenticated users to delete city_multipliers" ON city_multipliers
    FOR DELETE
    TO authenticated
    USING (true);

-- ========================================
-- Create function to automatically update updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updated_at
CREATE TRIGGER update_billboard_pricing_updated_at
    BEFORE UPDATE ON billboard_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_city_multipliers_updated_at
    BEFORE UPDATE ON city_multipliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Insert default data
-- ========================================

-- Insert default city multipliers
INSERT INTO city_multipliers (city_name, multiplier, description, image_url, is_active) VALUES
('طرابلس', 1.20, 'العاصمة الليبية - أعلى كثافة سكانية وأنشطة تجارية', 'https://cdn.builder.io/api/v1/image/assets%2Ffc68c2d70dd74affa9a5bbf7eee66f4a%2F1c9e3c78f90d491896fc44d8e3acf961?format=webp&width=150', true),
('بنغازي', 1.10, 'ثاني أكبر المدن - مركز تجاري مهم في الشرق', 'https://cdn.builder.io/api/v1/image/assets%2Ffc68c2d70dd74affa9a5bbf7eee66f4a%2F1617ca2a62584070824c253b8a8a1c38?format=webp&width=150', true),
('مصراتة', 1.00, 'المدينة المرجعية للأسعار - مركز صناعي وتجاري', '/cities/misrata.jpg', true),
('صبراتة', 0.90, 'مدينة ساحلية تاريخية - نشاط سياحي متوسط', '/cities/sabratha.jpg', true),
('سبها', 0.80, 'عاصمة الجنوب - مركز تجاري للمناطق الجنوبية', '/cities/sebha.jpg', true),
('طبرق', 0.85, 'مدينة ساحلية شرقية - ميناء مهم للنفط', '/cities/tobruk.jpg', true)
ON CONFLICT (city_name) DO NOTHING;

-- Insert default pricing data
INSERT INTO billboard_pricing (billboard_size, duration_months, price, price_category, zone_name) VALUES
-- Zone: مصراتة
-- Size: 5x13
('5x13', 1, 4000.00, 'A', 'مصراتة'),
('5x13', 2, 3920.00, 'A', 'مصراتة'),
('5x13', 3, 3800.00, 'A', 'مصراتة'),
('5x13', 6, 3600.00, 'A', 'مصراتة'),
('5x13', 12, 3400.00, 'A', 'مصراتة'),
('5x13', 1, 3200.00, 'B', 'مصراتة'),
('5x13', 2, 3136.00, 'B', 'مصراتة'),
('5x13', 3, 3040.00, 'B', 'مصراتة'),
('5x13', 6, 2880.00, 'B', 'مصراتة'),
('5x13', 12, 2720.00, 'B', 'مصراتة'),

-- Size: 4x12
('4x12', 1, 3500.00, 'A', 'مصراتة'),
('4x12', 2, 3430.00, 'A', 'مصراتة'),
('4x12', 3, 3325.00, 'A', 'مصراتة'),
('4x12', 6, 3150.00, 'A', 'مصراتة'),
('4x12', 12, 2975.00, 'A', 'مصراتة'),
('4x12', 1, 2800.00, 'B', 'مصراتة'),
('4x12', 2, 2744.00, 'B', 'مصراتة'),
('4x12', 3, 2660.00, 'B', 'مصراتة'),
('4x12', 6, 2520.00, 'B', 'مصراتة'),
('4x12', 12, 2380.00, 'B', 'مصراتة'),

-- Size: 4x10
('4x10', 1, 3000.00, 'A', 'مصراتة'),
('4x10', 2, 2940.00, 'A', 'مصراتة'),
('4x10', 3, 2850.00, 'A', 'مصراتة'),
('4x10', 6, 2700.00, 'A', 'مصراتة'),
('4x10', 12, 2550.00, 'A', 'مصراتة'),
('4x10', 1, 2400.00, 'B', 'مص��اتة'),
('4x10', 2, 2352.00, 'B', 'مصراتة'),
('4x10', 3, 2280.00, 'B', 'مصراتة'),
('4x10', 6, 2160.00, 'B', 'مصراتة'),
('4x10', 12, 2040.00, 'B', 'مصراتة'),

-- Size: 3x8
('3x8', 1, 2500.00, 'A', 'مصراتة'),
('3x8', 2, 2450.00, 'A', 'مصراتة'),
('3x8', 3, 2375.00, 'A', 'مصراتة'),
('3x8', 6, 2250.00, 'A', 'مصراتة'),
('3x8', 12, 2125.00, 'A', 'مصراتة'),
('3x8', 1, 2000.00, 'B', 'مصراتة'),
('3x8', 2, 1960.00, 'B', 'مصراتة'),
('3x8', 3, 1900.00, 'B', 'مصراتة'),
('3x8', 6, 1800.00, 'B', 'مصراتة'),
('3x8', 12, 1700.00, 'B', 'مصراتة'),

-- Size: 3x6
('3x6', 1, 2000.00, 'A', 'مصراتة'),
('3x6', 2, 1960.00, 'A', 'مصراتة'),
('3x6', 3, 1900.00, 'A', 'مصراتة'),
('3x6', 6, 1800.00, 'A', 'مصراتة'),
('3x6', 12, 1700.00, 'A', 'مصراتة'),
('3x6', 1, 1600.00, 'B', 'مصراتة'),
('3x6', 2, 1568.00, 'B', 'مصراتة'),
('3x6', 3, 1520.00, 'B', 'مصراتة'),
('3x6', 6, 1440.00, 'B', 'مصراتة'),
('3x6', 12, 1360.00, 'B', 'مصراتة'),

-- Size: 3x4
('3x4', 1, 1500.00, 'A', 'مصراتة'),
('3x4', 2, 1470.00, 'A', 'مصراتة'),
('3x4', 3, 1425.00, 'A', 'مصراتة'),
('3x4', 6, 1350.00, 'A', 'مصراتة'),
('3x4', 12, 1275.00, 'A', 'مصراتة'),
('3x4', 1, 1200.00, 'B', 'م��راتة'),
('3x4', 2, 1176.00, 'B', 'مصراتة'),
('3x4', 3, 1140.00, 'B', 'مصراتة'),
('3x4', 6, 1080.00, 'B', 'مصراتة'),
('3x4', 12, 1020.00, 'B', 'مصراتة')

ON CONFLICT (billboard_size, duration_months, price_category, zone_name) DO NOTHING;

-- ========================================
-- Create additional zones (طرابلس، بنغازي)
-- ========================================

-- Note: You can add more zones by inserting similar data with different zone_name values
-- For example, for طرابلس zone, multiply all prices by 1.2 (city multiplier)
-- For بنغازي zone, multiply all prices by 1.1 (city multiplier)

-- This completes the basic table structure and default data
-- The application will handle creating additional zones and pricing data through the UI

COMMENT ON TABLE billboard_pricing IS 'Stores pricing information for different billboard sizes, durations, categories, and zones';
COMMENT ON TABLE city_multipliers IS 'Stores city-specific multipliers for pricing calculations';

COMMENT ON COLUMN billboard_pricing.billboard_size IS 'Size of the billboard (e.g., 5x13, 4x12)';
COMMENT ON COLUMN billboard_pricing.duration_months IS 'Rental duration in months';
COMMENT ON COLUMN billboard_pricing.price IS 'Base price for the billboard';
COMMENT ON COLUMN billboard_pricing.price_category IS 'Price category: A (premium) or B (standard)';
COMMENT ON COLUMN billboard_pricing.zone_name IS 'Pricing zone name';

COMMENT ON COLUMN city_multipliers.city_name IS 'Name of the city';
COMMENT ON COLUMN city_multipliers.multiplier IS 'Pricing multiplier for the city (1.0 = base price)';
COMMENT ON COLUMN city_multipliers.description IS 'Description of the city and its economic characteristics';
COMMENT ON COLUMN city_multipliers.image_url IS 'URL to the city image';
COMMENT ON COLUMN city_multipliers.is_active IS 'Whether the city multiplier is active';
