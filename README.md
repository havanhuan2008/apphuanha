# HH SUPER • Deluxe UI (Full Code)

Bộ code gồm **login bằng key + Firebase Realtime Database**, UI **glass + neon**, HUD gaming, click sound **“tạch”**, ripple, overlay check **thiết bị + server**, và thêm nhiều tab chức năng (Tools / Devices / Settings).

> Lưu ý: Đây là bản **UI demo web**. Các preset/slider chỉ thay đổi giao diện, không can thiệp game.

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




## 1) Cấu trúc thư mục

```
HH_SUPER_DELUXE/
├─ index.html
├─ lienhe.html
├─ assets/
│  ├─ style.css
│  ├─ app.js
│  ├─ crown.png
│  └─ favicon.png
└─ README.md
```

---

## 2) Chạy local (khuyến nghị)

Một số API như **Clipboard** sẽ bị chặn nếu bạn mở file trực tiếp (file://).
Bạn nên chạy bằng local server:

### Cách 1: Python
```bash
cd HH_SUPER_DELUXE
python -m http.server 8080
```
Mở:
- `http://localhost:8080/index.html`

### Cách 2: VSCode Live Server
- Chuột phải `index.html` → **Open with Live Server**

---

## 3) Firebase Database (Realtime Database)

Code đang dùng cấu trúc:

- `keys/<keyString>/active` (boolean)
- `keys/<keyString>/expiresAt` (timestamp ms)
- `keys/<keyString>/maxDevices` (number)
- `keys/<keyString>/note` (string)
- `keys/<keyString>/lastLoginAt` (timestamp ms)
- `keys/<keyString>/devices/<deviceId>` (object: firstSeen, lastSeen, ua, ...)

### Ví dụ dữ liệu key:
```json
{
  "active": true,
  "expiresAt": 1893456000000,
  "maxDevices": 2,
  "note": "Key VIP",
  "lastLoginAt": 0,
  "devices": {}
}
```

---

## 4) Đổi logo PNG

- File logo: `assets/crown.png`
- Bạn chỉ cần thay ảnh PNG khác đúng tên `crown.png` là được.

---

## 5) Các điểm nổi bật đã thêm

- **Overlay check**: khi vào app → check Device, Browser, Network, Firebase, Server.
- **Click sound “tạch”** + **Ripple** cho mọi nút, menu, tile.
- **Particles nền** (canvas) có thể bật/tắt trong **Cài đặt**.
- **Quản lý thiết bị**: xem danh sách, copy ID, xóa từng device, reset toàn bộ (tùy rules).
- **Settings**: đổi accent (Gold/Aqua), bật/tắt sound/haptic/particles/reduce motion.

---

## 6) Lưu ý quan trọng

- Nếu Firebase rules đang chặn thao tác xóa thiết bị / reset, các nút sẽ báo lỗi (đúng behavior).
- Clipboard trên mobile đôi khi cần HTTPS hoặc localhost.
