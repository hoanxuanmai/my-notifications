# Issues Found - Logic & Security Review

## 🔴 Critical Issues

### 1. NotificationsController không có JWT Guard
**File**: `backend/src/notifications/notifications.controller.ts`

**Vấn đề**: 
- Controller không có `@UseGuards(JwtAuthGuard)`
- User có thể xem notifications mà không cần authenticate
- User có thể xem notifications của channels không thuộc về mình

**Impact**: 🔴 HIGH - Security vulnerability

**Fix**: Cần thêm guard và filter theo userId

---

### 2. NotificationsService.findAll() không filter theo userId

**File**: `backend/src/notifications/notifications.service.ts`

**Vấn đề**:
- Service không check ownership
- User có thể xem notifications của channels không thuộc về mình nếu biết channelId
- Không có validation để đảm bảo channelId thuộc về user hiện tại

**Impact**: 🔴 HIGH - Data leak vulnerability

**Fix**: Cần filter notifications chỉ của channels thuộc về user

---

### 3. findOne() methods không check ownership

**File**: `backend/src/notifications/notifications.service.ts`

**Vấn đề**:
- `findOne()`, `markAsRead()`, `remove()` không check xem notification có thuộc về channel của user không
- User có thể access/modify notifications của user khác

**Impact**: 🔴 HIGH - Unauthorized access

---

### 4. findByWebhookToken dùng findUnique sai cách

**File**: `backend/src/common/repositories/channels.repository.ts`

**Vấn đề**:
- `findUnique()` chỉ hoạt động với unique constraints
- Đang dùng với `where` condition phức tạp (isActive, expiresAt)
- Cần dùng `findFirst()` thay vì `findUnique()`

**Impact**: 🟡 MEDIUM - Logic error, có thể không tìm được channel

---

## 🟡 Medium Issues

### 5. findActiveChannels deprecated method có bug

**File**: `backend/src/common/repositories/channels.repository.ts`

**Vấn đề**:
- Method `findActiveChannels()` đang dùng empty string `''` làm userId
- Method đã deprecated nhưng vẫn tồn tại

**Impact**: 🟡 LOW - Method không dùng nữa, nhưng có thể gây confusion

---

### 6. Migration có thể fail nếu không có system user

**File**: `backend/prisma/migrations/20240101000001_add_user_safe_migration.sql`

**Vấn đề**:
- Nếu INSERT system user fail (ON CONFLICT), UPDATE channels vẫn chạy
- UPDATE có thể fail nếu không tìm thấy system user

**Impact**: 🟡 MEDIUM - Migration có thể fail

**Fix**: Cần check system user exists trước khi UPDATE

---

## ✅ Issues Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | NotificationsController missing JWT Guard | 🔴 HIGH | Need Fix |
| 2 | NotificationsService.findAll() no userId filter | 🔴 HIGH | Need Fix |
| 3 | findOne() methods no ownership check | 🔴 HIGH | Need Fix |
| 4 | findByWebhookToken wrong method | 🟡 MEDIUM | Need Fix |
| 5 | Deprecated method with bug | 🟡 LOW | Optional |
| 6 | Migration potential failure | 🟡 MEDIUM | Need Fix |

