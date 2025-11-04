-- Add geolocation fields to work_orders table
-- Migration: Add latitude and longitude for geolocation tracking

-- Add columns for geolocation
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geolocation_source VARCHAR(50) DEFAULT 'manual' CHECK (geolocation_source IN ('manual', 'gps', 'auto'));

-- Add comment to explain the fields
COMMENT ON COLUMN work_orders.latitude IS 'Latitude coordinate for work order location (-90 to 90)';
COMMENT ON COLUMN work_orders.longitude IS 'Longitude coordinate for work order location (-180 to 180)';
COMMENT ON COLUMN work_orders.geolocation_source IS 'Source of the geolocation data: manual, gps, or auto';

-- Add index for geolocation queries (useful for location-based searches)
CREATE INDEX IF NOT EXISTS idx_work_orders_geolocation ON work_orders(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

