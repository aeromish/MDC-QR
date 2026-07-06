import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1710000000000 implements MigrationInterface {
  name = 'Init1710000000000';

  public async up(q: QueryRunner): Promise<void> {
    // ---------- ENUM types ----------
    await q.query(`CREATE TYPE light_status AS ENUM ('in_stock','sold','installed','maintenance','faulty')`);
    await q.query(`CREATE TYPE warranty_status AS ENUM ('inactive','active','expired','void')`);
    await q.query(`CREATE TYPE maintenance_type AS ENUM ('inspection','repair','replacement','installation','other')`);
    await q.query(`CREATE TYPE qr_state AS ENUM ('created','activated','assigned')`);
    // Sequence sinh so serial toan cuc (prefix + so chay)
    await q.query(`CREATE SEQUENCE IF NOT EXISTS serial_seq START 1`);

    // ---------- ROLES ----------
    await q.query(`
      CREATE TABLE roles (
        role_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code        VARCHAR(50)  NOT NULL UNIQUE,
        name        VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        is_system   BOOLEAN      NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
      )`);
    await q.query(`
      INSERT INTO roles (code, name, description, is_system) VALUES
        ('admin','Quan tri vien','Toan quyen he thong', true),
        ('staff','Tro ly','Chi kiem tra & kich hoat ma QR', true),
        ('user','Nguoi dung','Tai khoan thuong / du phong', true)`);

    // ---------- USERS ----------
    await q.query(`
      CREATE TABLE users (
        user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username      VARCHAR(100) NOT NULL UNIQUE,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id       BIGINT       NOT NULL,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE RESTRICT
      )`);
    await q.query(`CREATE INDEX idx_users_role ON users (role_id)`);

    // ---------- PERMISSIONS / ROLE_PERMISSIONS ----------
    await q.query(`
      CREATE TABLE permissions (
        permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code          VARCHAR(60) NOT NULL UNIQUE,
        description   VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(`
      CREATE TABLE role_permissions (
        role_id       BIGINT NOT NULL,
        permission_id BIGINT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles       (role_id)       ON DELETE CASCADE,
        CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (permission_id) ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX idx_rp_permission ON role_permissions (permission_id)`);
    await q.query(`
      INSERT INTO permissions (code, description) VALUES
        ('dashboard.view','Xem dashboard tong quan'),
        ('product.view','Xem danh sach san pham'),
        ('product.manage','Them / sua / xoa san pham'),
        ('batch.view','Xem lo san xuat & ma QR'),
        ('batch.create','Tao lo & sinh ma QR'),
        ('batch.edit','Sua thong tin lo'),
        ('batch.delete','Xoa lo (chi lo con toan phoi)'),
        ('qr.activate','Kich hoat ma QR (ca lo hoac tung tem)'),
        ('qr.print','In tem QR'),
        ('qr.assign','Gan / doi / go san pham cho tem'),
        ('qr.reissue','Cap lai tem (vo hieu tem cu, tao tem moi)'),
        ('serial.view','Tra cuu / kiem tra tem serial'),
        ('serial.edit','Sua ma serial (khi con phoi)'),
        ('serial.delete','Xoa tem / don vi'),
        ('warranty.view','Xem danh sach bao hanh'),
        ('warranty.activate','Kich hoat bao hanh cho khach'),
        ('warranty.edit','Sua thong tin bao hanh'),
        ('warranty.void','Huy bao hanh'),
        ('maintenance.view','Xem nhat ky bao tri'),
        ('maintenance.create','Ghi log bao tri'),
        ('system.reset_demo','Khoi phuc du lieu mau')`);
    // admin: toan quyen
    await q.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id FROM roles r CROSS JOIN permissions p WHERE r.code = 'admin'`);
    // staff: xem tong quan, xem lo, tra cuu tem, kich hoat QR
    await q.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id FROM roles r
      JOIN permissions p ON p.code IN ('dashboard.view','batch.view','serial.view','qr.activate')
      WHERE r.code = 'staff'`);

    // ---------- PRODUCTS ----------
    await q.query(`
      CREATE TABLE products (
        product_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code            VARCHAR(50)  NOT NULL UNIQUE,
        name            VARCHAR(255) NOT NULL,
        category        VARCHAR(100),
        power_w         INT,
        cct_k           INT,
        power_factor    VARCHAR(20),
        cri             VARCHAR(20),
        ip_rating       VARCHAR(10),
        ik_rating       VARCHAR(10),
        dimming         VARCHAR(30),
        led_chip        VARCHAR(100),
        driver          VARCHAR(100),
        warranty_months INT          NOT NULL DEFAULT 60,
        application     TEXT,
        features        TEXT,
        description     TEXT,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
      )`);

    // ---------- PRODUCT_IMAGES ----------
    await q.query(`
      CREATE TABLE product_images (
        image_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_id BIGINT      NOT NULL,
        url        TEXT        NOT NULL,
        sort_order SMALLINT    NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_pimg_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX idx_pimg_product ON product_images (product_id)`);

    // ---------- BATCHES ----------
    await q.query(`
      CREATE TABLE batches (
        batch_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        batch_code      VARCHAR(50) NOT NULL UNIQUE,
        product_id      BIGINT,
        quantity        INT         NOT NULL CHECK (quantity > 0),
        manufactured_at TIMESTAMPTZ,
        created_by      BIGINT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_batch_product    FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE RESTRICT,
        CONSTRAINT fk_batch_created_by FOREIGN KEY (created_by) REFERENCES users (user_id)       ON DELETE SET NULL
      )`);
    await q.query(`CREATE INDEX idx_batches_product ON batches (product_id)`);

    // ---------- LIGHTS ----------
    await q.query(`
      CREATE TABLE lights (
        light_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        location     VARCHAR(255),
        status       light_status NOT NULL DEFAULT 'in_stock',
        installed_at TIMESTAMPTZ,
        product_id   BIGINT,
        batch_id     BIGINT,
        CONSTRAINT fk_light_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE SET NULL,
        CONSTRAINT fk_light_batch   FOREIGN KEY (batch_id)   REFERENCES batches  (batch_id)   ON DELETE SET NULL
      )`);
    await q.query(`CREATE INDEX idx_lights_status  ON lights (status)`);
    await q.query(`CREATE INDEX idx_lights_product ON lights (product_id)`);
    await q.query(`CREATE INDEX idx_lights_batch   ON lights (batch_id)`);

    // ---------- QR_CODES ----------
    await q.query(`
      CREATE TABLE qr_codes (
        qr_code_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        qr_code_value VARCHAR(255) NOT NULL UNIQUE,
        light_id      BIGINT       NOT NULL,
        state         qr_state     NOT NULL DEFAULT 'created',
        activated_at  TIMESTAMPTZ,
        voided_at     TIMESTAMPTZ,
        created_by    BIGINT,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT fk_qr_light      FOREIGN KEY (light_id)   REFERENCES lights (light_id) ON DELETE CASCADE,
        CONSTRAINT fk_qr_created_by FOREIGN KEY (created_by) REFERENCES users (user_id)  ON DELETE SET NULL
      )`);
    await q.query(`CREATE INDEX idx_qr_light_id   ON qr_codes (light_id)`);
    await q.query(`CREATE INDEX idx_qr_created_by ON qr_codes (created_by)`);
    await q.query(`CREATE INDEX idx_qr_state      ON qr_codes (state)`);
    // 1 tem con hieu luc / 1 den
    await q.query(`CREATE UNIQUE INDEX uq_qr_live_per_light ON qr_codes (light_id) WHERE voided_at IS NULL`);

    // ---------- WARRANTIES ----------
    await q.query(`
      CREATE TABLE warranties (
        warranty_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        light_id       BIGINT          NOT NULL UNIQUE,
        customer_name  VARCHAR(255),
        customer_phone VARCHAR(30),
        customer_email VARCHAR(255),
        status         warranty_status NOT NULL DEFAULT 'inactive',
        activated_at   TIMESTAMPTZ,
        expires_at     TIMESTAMPTZ,
        created_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT fk_warranty_light FOREIGN KEY (light_id) REFERENCES lights (light_id) ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX idx_warranty_status ON warranties (status)`);
    await q.query(`CREATE INDEX idx_warranty_phone  ON warranties (customer_phone)`);

    // ---------- MAINTENANCE_LOGS ----------
    await q.query(`
      CREATE TABLE maintenance_logs (
        maintenance_log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        light_id           BIGINT           NOT NULL,
        user_id            BIGINT,
        maintenance_type   maintenance_type NOT NULL DEFAULT 'other',
        description        TEXT,
        performed_at       TIMESTAMPTZ,
        created_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
        CONSTRAINT fk_mlog_light FOREIGN KEY (light_id) REFERENCES lights (light_id) ON DELETE CASCADE,
        CONSTRAINT fk_mlog_user  FOREIGN KEY (user_id)  REFERENCES users (user_id)  ON DELETE SET NULL
      )`);
    await q.query(`CREATE INDEX idx_mlog_light_id     ON maintenance_logs (light_id)`);
    await q.query(`CREATE INDEX idx_mlog_user_id      ON maintenance_logs (user_id)`);
    await q.query(`CREATE INDEX idx_mlog_performed_at ON maintenance_logs (performed_at)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS maintenance_logs`);
    await q.query(`DROP TABLE IF EXISTS warranties`);
    await q.query(`DROP TABLE IF EXISTS qr_codes`);
    await q.query(`DROP TABLE IF EXISTS lights`);
    await q.query(`DROP TABLE IF EXISTS batches`);
    await q.query(`DROP TABLE IF EXISTS product_images`);
    await q.query(`DROP TABLE IF EXISTS products`);
    await q.query(`DROP TABLE IF EXISTS role_permissions`);
    await q.query(`DROP TABLE IF EXISTS permissions`);
    await q.query(`DROP TABLE IF EXISTS users`);
    await q.query(`DROP TABLE IF EXISTS roles`);
    await q.query(`DROP TYPE IF EXISTS qr_state`);
    await q.query(`DROP TYPE IF EXISTS maintenance_type`);
    await q.query(`DROP TYPE IF EXISTS warranty_status`);
    await q.query(`DROP TYPE IF EXISTS light_status`);
    await q.query(`DROP SEQUENCE IF EXISTS serial_seq`);
  }
}
