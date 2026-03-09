# xPOS — ระบบ POS ฟรี 100% สำหรับร้านอาหารไทย

> **Local-first** — ข้อมูลทั้งหมดอยู่ที่เครื่อง + Google Drive ของร้าน ไม่มี server storage  
> **Zero hosting cost** — Backend จิ๋วบน Cloudflare Workers free tier  
> **Revenue** — Affiliate links เมื่อวัตถุดิบใกล้หมด → LINE push → สั่งซื้อ → commission

## Quick Start

```bash
npm install
npm run dev
```

เปิด http://localhost:5173 — จะเจอหน้า login

### Demo Login
| ผู้ใช้ | PIN | Role |
|--------|-----|------|
| เจ้าของร้าน | `1234` | Manager |
| พนักงาน A | `0000` | Staff |
| พนักงาน B | `1111` | Staff |

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | TailwindCSS v4 + Lucide icons |
| Local DB | IndexedDB via Dexie.js |
| State | Zustand |
| Routing | React Router v7 |
| Fonts | Noto Sans Thai + Inter |
| PWA | manifest.json + offline-first design |

## Features (Phase 1 — POS Core)

- **PIN Login** — เลือก user + ใส่ PIN 4 หลัก, role-based access (Super Admin / Manager / Staff)
- **เมนูสินค้า** — grid layout, filter ตามหมวด, ค้นหา, emoji ตาม category
- **ตัวเลือก/เพิ่มเติม** — variant + modifier dialog + หมายเหตุ + จำนวน
- **ตะกร้า** — เพิ่ม/ลด/ลบ/ล้าง + แสดง modifier + note
- **ประเภทออเดอร์** — ทานที่ร้าน / กลับบ้าน / เดลิเวอรี่
- **จัดการโต๊ะ** — แบ่งโซน, สถานะสี, กดโต๊ะแล้วไปหน้าขาย
- **ชำระเงิน** — เงินสด (คำนวณเงินทอน) / QR Code / บัตร
- **เปิด/ปิดกะ** — ตั้งเงินเปิด, ดูยอดขายระหว่างกะ, ปิดพร้อมนับเงิน
- **Kitchen Display** — หน้าจอครัว dark mode, timer ต่อออเดอร์, กดเสร็จ
- **ประวัติบิล** — รายการ + detail panel + ข้อมูลครบ
- **รายงาน** — ยอดขายรายวัน, เมนูขายดี, ช่องทางชำระ
- **คำนวณ VAT + Service Charge** — ตั้งค่าได้

## Architecture

```
IndexedDB (เครื่อง)  <-->  Google Drive (backup/sync)
         |                         |
    React PWA              Web Portal (read-only)
         |
  Cloudflare Workers (store registry + LINE + affiliate)
```

## Project Structure

```
src/
├── types/          # TypeScript interfaces
├── db/             # Dexie schema + seed data
├── lib/            # Utilities (calc, roles, utils)
├── store/          # Zustand global state
├── components/
│   ├── pos/        # ShiftBar, ModifierDialog, CashPaymentDialog
│   └── shared/     # Sidebar, Layout
└── routes/
    ├── auth/       # PIN login
    ├── pos/        # POS page + Order history
    ├── tables/     # Table management
    ├── kitchen/    # Kitchen Display System
    ├── inventory/  # Stock (Phase 2)
    ├── employees/  # Employee mgmt (Phase 3)
    ├── reports/    # Sales reports
    └── settings/   # Store settings (Phase 3)
```

## Roadmap

- [ ] Phase 2 — Inventory: วัตถุดิบ, สูตรอาหาร, ตัดสต๊อกอัตโนมัติ
- [ ] Phase 3 — Shift/Employee: Timecard, รายงานพนักงาน
- [ ] Phase 4 — Google Drive sync: auto backup + live_summary
- [ ] Phase 5 — Reports: hourly heatmap, profit margin, export CSV/PDF
- [ ] Phase 6 — LINE + Affiliate: low-stock alert -> revenue
- [ ] Phase 7 — CRM: สมาชิก, สะสมแต้ม, โปรโมชั่น
- [ ] Phase 8 — Delivery: sales channel, QR self-order
- [ ] Phase 9 — Web Portal: read-only admin dashboard

## License

Free for all Thai restaurant owners.
