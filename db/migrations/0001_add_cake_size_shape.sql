ALTER TABLE "cakes" ADD COLUMN "cake_size" TEXT NOT NULL DEFAULT '8in' CHECK ("cake_size" IN ('6in', '8in', '10in', '12in', 'half_sheet', 'sheet'));
ALTER TABLE "cakes" ADD COLUMN "cake_shape" TEXT NOT NULL DEFAULT 'round' CHECK ("cake_shape" IN ('round', 'square'));
