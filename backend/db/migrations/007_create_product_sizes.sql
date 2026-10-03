-- 007_create_product_sizes.sql
CREATE TABLE IF NOT EXISTS product_sizes (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(20) NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    CONSTRAINT uq_product_size UNIQUE (product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
