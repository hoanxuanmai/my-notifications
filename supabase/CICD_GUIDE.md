# 🚀 Hướng dẫn kích hoạt CI/CD Supabase tự động

Hệ thống CI/CD đã được cấu hình tự động thông qua **GitHub Actions** tại file `.github/workflows/deploy-supabase.yml`.
Mỗi khi bạn `git push` code vào nhánh `supabase` (khi thay đổi SQL migrations hoặc Edge Functions), GitHub Actions sẽ tự động deploy lên project Supabase Cloud của bạn.

---

## 🔑 Bước 1: Lấy 3 thông số bí mật từ Supabase Cloud

Truy cập vào [Supabase Dashboard](https://supabase.com/dashboard):

1. **`SUPABASE_PROJECT_ID` (Project Reference ID)**:
   - Vào dự án của bạn trên Supabase.
   - Nhìn trên thanh URL: `https://supabase.com/dashboard/project/<PROJECT_REF_ID>` (chuỗi khoảng 20 ký tự, ví dụ: `abcdefghijklmnopqrst`).
   - Hoặc vào **Project Settings ➔ General ➔ Reference ID**.

2. **`SUPABASE_ACCESS_TOKEN` (Personal Access Token của bạn)**:
   - Truy cập: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
   - Nhấn **"Generate new token"**, đặt tên (vd: `github-actions-deploy`), copy token được tạo ra.

3. **`SUPABASE_DB_PASSWORD` (Mật khẩu cơ sở dữ liệu Postgres)**:
   - Mật khẩu bạn đã đặt khi tạo dự án Supabase.
   - *(Nếu quên: Vào Project Settings ➔ Database ➔ Reset database password)*.

---

## 🔒 Bước 2: Thêm 3 Secrets này vào GitHub Repository

1. Mở Repository của bạn trên GitHub: `https://github.com/hoanxuanmai/my-notifications`
2. Vào tab **Settings** (ở thanh menu trên cùng của repo).
3. Ở thanh menu bên trái, tìm mục **Security** ➔ chọn **Secrets and variables** ➔ chọn **Actions**.
4. Nhấn nút xanh **"New repository secret"** và lần lượt thêm 3 secrets sau:

| Tên Secret (Name) | Giá trị (Secret Value) |
| :--- | :--- |
| `SUPABASE_PROJECT_ID` | `<Project Ref ID của bạn>` |
| `SUPABASE_ACCESS_TOKEN` | `<Token bắt đầu bằng sbp_...>` |
| `SUPABASE_DB_PASSWORD` | `<Mật khẩu Database của bạn>` |

---

## ⚡ Bước 3: Kiểm tra CI/CD tự động hoạt động

1. Vào tab **Actions** trên GitHub repo: `https://github.com/hoanxuanmai/my-notifications/actions`
2. Bạn sẽ thấy Workflow **"Deploy Supabase Schema & Edge Functions"**.
3. Bạn có thể nhấn **"Run workflow"** thủ công hoặc chỉ cần push commit mới vào nhánh `supabase`, GitHub Actions sẽ tự động:
   - ✅ Kiểm tra tính hợp lệ của mã SQL.
   - ✅ Chạy `supabase db push` để tạo/cập nhật bảng, RLS, Stored Procedures.
   - ✅ Deploy 4 Edge Functions (`send-notification`, `kafka-bridge`, `read-notification`, `cancel-notification`).
