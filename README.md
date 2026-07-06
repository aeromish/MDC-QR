# MDC Light Management System — Backend (Giai đoạn 1)

Backend thật cho hệ thống quản lý & xác thực sản phẩm chiếu sáng MDC:
**NestJS + PostgreSQL + TypeORM**, JWT auth, phân quyền RBAC theo dữ liệu, rate-limit,
migration + seed, đóng gói **Docker Compose** chạy một lệnh.

---

## 1. Yêu cầu

- **Cách khuyến nghị (Docker):** VPS cài `docker` + `docker compose`. Không cần cài Node/Postgres thủ công.
- **Cách thủ công:** Node.js 20+ và PostgreSQL 14+.

## 2. Chạy nhanh bằng Docker (khuyến nghị)

```bash
cp .env.example .env
# Mo .env va doi TAT CA gia tri 'change_me...' (mat khau DB, JWT secret, mat khau admin)
#   - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET: sinh bang:  openssl rand -base64 48
#   - DB_PASSWORD phai trung POSTGRES_PASSWORD

docker compose up -d --build
docker compose logs -f api      # xem log khoi dong (migration + seed)
```

Khi khởi động, container API tự động: chờ DB → chạy **migration** (tạo bảng, enum, seed roles/permissions) → **seed admin** → chạy API tại `http://127.0.0.1:3000` (prefix `/api`).

Kiểm tra: `curl http://127.0.0.1:3000/api/verify?sn=test` → trả `{"status":"not_found",...}`.

> API chỉ lắng nghe `127.0.0.1` trên VPS. Truy cập ra Internet đi qua Nginx/Cloudflare (mục 6). PostgreSQL **không** mở port ra ngoài.

## 3. Chạy thủ công (không Docker)

```bash
npm install
cp .env.example .env   # sua DB_HOST=localhost, dien thong tin Postgres cua ban
npm run build
npm run migration:run
npm run seed
npm run start:prod
```

## 4. Tài khoản admin đầu tiên

Được tạo từ `.env` (`ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
**Đăng nhập xong hãy đổi mật khẩu ngay** qua `POST /api/auth/change-password`.
Seed idempotent — chạy lại không tạo trùng.

## 5. Tóm tắt API (prefix `/api`)

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/change-password` | công khai / đăng nhập |
| Tra cứu khách | `GET /verify?sn=...` | công khai (rate-limit) |
| Dashboard | `GET /dashboard/stats` | `dashboard.view` |
| Sản phẩm | `GET/POST/PUT/DELETE /products`, `POST /uploads/image` | `product.view` / `product.manage` |
| Lô | `GET/POST/PUT/DELETE /batches` | `batch.view/create/edit/delete` |
| Tem/Serial | `GET /serials`, `GET /serials/:sn`, `POST /serials/:sn/activate`, `/assign`, `/unassign`, `/reissue`, `PUT /serials/:sn`, `DELETE /serials/:sn`, `POST /batches/:id/activate-all`, `/assign-all` | `qr.*` / `serial.*` |
| Bảo hành | `GET /warranties`, `POST /warranties/:sn/activate`, `PUT /warranties/:sn`, `POST /warranties/:sn/void` | `warranty.*` |
| Bảo trì | `GET/POST /maintenance` | `maintenance.*` |
| Người dùng | `GET/POST /users`, `GET /users/roles`, `PATCH /users/:id/role`, `PATCH /users/:id/password`, `DELETE /users/:id` | chỉ admin |

Gửi token: header `Authorization: Bearer <accessToken>`.

## 6. Đưa lên Internet (Nginx + SSL + Cloudflare) trên VPS Viettel

```bash
# 1) Cai Nginx + Certbot
sudo apt update && sudo apt install -y nginx
sudo snap install --classic certbot

# 2) Reverse proxy: /etc/nginx/sites-available/mdc-lms
server {
    server_name lms.chieusangmdc.com.vn;
    client_max_body_size 5m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
# 3) Bat site + SSL
sudo ln -s /etc/nginx/sites-available/mdc-lms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lms.chieusangmdc.com.vn
```

Trỏ domain qua **Cloudflare** (DNS + chống DDoS + SSL). Đặt `CORS_ORIGINS` và `PUBLIC_BASE_URL`
trong `.env` đúng domain thật.

## 7. Bảo mật đã tích hợp

- Mật khẩu băm **argon2id**; đăng nhập **JWT** (access + refresh), secret tách riêng.
- **RBAC** ở mức dữ liệu: bảng `permissions` + `role_permissions`; guard kiểm tra theo từng quyền; admin full.
- **Rate-limit**: chung 120/phút; đăng nhập **8/phút/IP** (chống brute-force); tra cứu QR **30/phút/IP** (chống dò serial).
- **Helmet** (HTTP headers), **CORS** khóa theo domain, **ValidationPipe** (lọc field lạ), truy vấn **tham số hóa** (chống SQL injection).
- Ràng buộc nghiệp vụ: chặn đổi/gỡ SP & xóa tem khi còn bảo hành; khóa sửa serial sau kích hoạt; unique index 1 tem hiệu lực / đèn.

## 8. Sao lưu database (khuyến nghị đặt cron hằng ngày)

```bash
docker exec mdc_lms_db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup_$(date +%F).sql.gz
```

## 9. Khắc phục sự cố

- Xem log: `docker compose logs -f api` / `docker compose logs -f postgres`.
- Chạy lại migration/seed thủ công trong container: `docker exec -it mdc_lms_api npm run migration:run && docker exec -it mdc_lms_api npm run seed`.
- Đổi mật khẩu admin nếu quên: tạo user admin mới qua `npm run seed` (đổi ADMIN_USERNAME trong .env) hoặc dùng endpoint quản lý người dùng.

---
**Giai đoạn 2** (frontend React nối API) và **Giai đoạn 3** (rà soát bảo mật tổng thể + tài liệu vận hành) sẽ làm khi bạn yêu cầu.
