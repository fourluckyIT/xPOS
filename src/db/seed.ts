import { db } from './schema';
import { generateId, hashPin, nowTimestamp } from '@/lib/utils';
import type { Store, User, Category, Product, Table, BusinessType } from '@/types';

const DEMO_STORE_ID = 'demo-store-001';

const demoStore: Store = {
  id: DEMO_STORE_ID,
  name: 'ร้านครัวคุณแม่',
  businessType: 'restaurant',
  address: '123/4 ถ.สุขุมวิท กรุงเทพฯ 10110',
  phone: '081-234-5678',
  taxId: '1234567890123',
  settings: {
    vatRate: 7,
    serviceChargeRate: 10,
    enableVat: true,
    enableServiceCharge: false,
    vatMode: 'add',
    roundingMode: 'none',
    receiptHeader: 'ร้านครัวคุณแม่\nขอบคุณที่มาอุดหนุน',
    receiptFooter: 'ขอบคุณค่ะ / Thank you!',
    currency: 'THB',
    lowStockAlertEnabled: true,
    autoBackupOnShiftClose: true,
  },
  createdAt: nowTimestamp(),
};

const demoUsers: User[] = [
  {
    id: generateId(),
    storeId: DEMO_STORE_ID,
    name: 'เจ้าของร้าน',
    pinHash: hashPin('1234'),
    role: 'manager',
    avatar: undefined,
    isActive: true,
    createdAt: nowTimestamp(),
  },
  {
    id: generateId(),
    storeId: DEMO_STORE_ID,
    name: 'พนักงาน A',
    pinHash: hashPin('0000'),
    role: 'staff',
    avatar: undefined,
    isActive: true,
    createdAt: nowTimestamp(),
  },
  {
    id: generateId(),
    storeId: DEMO_STORE_ID,
    name: 'พนักงาน B',
    pinHash: hashPin('1111'),
    role: 'staff',
    avatar: undefined,
    isActive: true,
    createdAt: nowTimestamp(),
  },
];

const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const demoCategories: Category[] = [
  { id: 'cat-rice', storeId: DEMO_STORE_ID, name: 'ข้าว/ก๋วยเตี๋ยว', sortOrder: 0, color: colors[0] },
  { id: 'cat-curry', storeId: DEMO_STORE_ID, name: 'แกง/ต้ม', sortOrder: 1, color: colors[1] },
  { id: 'cat-stirfry', storeId: DEMO_STORE_ID, name: 'ผัด/ทอด', sortOrder: 2, color: colors[2] },
  { id: 'cat-salad', storeId: DEMO_STORE_ID, name: 'ยำ/สลัด', sortOrder: 3, color: colors[3] },
  { id: 'cat-drink', storeId: DEMO_STORE_ID, name: 'เครื่องดื่ม', sortOrder: 4, color: colors[4] },
  { id: 'cat-dessert', storeId: DEMO_STORE_ID, name: 'ของหวาน', sortOrder: 5, color: colors[5] },
];

const demoProducts: Product[] = [
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-rice', name: 'ข้าวผัดกระเพรา', price: 60, unit: 'จาน', isActive: true, variants: [{ name: 'ไข่ดาว', price: 10 }], modifiers: [{ name: 'พิเศษ', price: 20 }], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-rice', name: 'ข้าวมันไก่', price: 50, unit: 'จาน', isActive: true, variants: [], modifiers: [{ name: 'เพิ่มไก่', price: 20 }], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-rice', name: 'ผัดไทย', price: 60, unit: 'จาน', isActive: true, variants: [{ name: 'กุ้งสด', price: 30 }], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-rice', name: 'ข้าวคลุกกะปิ', price: 55, unit: 'จาน', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-curry', name: 'ต้มยำกุ้ง', price: 120, unit: 'ชาม', isActive: true, variants: [{ name: 'น้ำใส', price: 0 }, { name: 'น้ำข้น', price: 0 }], modifiers: [{ name: 'พิเศษ', price: 40 }], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-curry', name: 'แกงเขียวหวาน', price: 80, unit: 'ชาม', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-curry', name: 'ต้มข่าไก่', price: 80, unit: 'ชาม', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-stirfry', name: 'ผัดกระเพราหมูสับ', price: 60, unit: 'จาน', isActive: true, variants: [], modifiers: [{ name: 'ไข่ดาว', price: 10 }], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-stirfry', name: 'ไก่ทอดหาดใหญ่', price: 80, unit: 'จาน', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-stirfry', name: 'ผัดผักรวม', price: 50, unit: 'จาน', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-salad', name: 'ส้มตำไทย', price: 50, unit: 'จาน', isActive: true, variants: [], modifiers: [{ name: 'ใส่ปู', price: 20 }], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-salad', name: 'ยำวุ้นเส้น', price: 70, unit: 'จาน', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-drink', name: 'น้ำเปล่า', price: 15, unit: 'ขวด', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-drink', name: 'ชาเย็น', price: 35, unit: 'แก้ว', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-drink', name: 'กาแฟเย็น', price: 40, unit: 'แก้ว', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-drink', name: 'น้ำมะนาว', price: 30, unit: 'แก้ว', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-dessert', name: 'ข้าวเหนียวมะม่วง', price: 80, unit: 'จาน', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-dessert', name: 'ไอศกรีมกะทิ', price: 40, unit: 'ถ้วย', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
];

const demoTables: Table[] = [
  { id: 'tbl-1', storeId: DEMO_STORE_ID, zone: 'ในร้าน', name: 'T1', seats: 4, sortOrder: 0, status: 'available' },
  { id: 'tbl-2', storeId: DEMO_STORE_ID, zone: 'ในร้าน', name: 'T2', seats: 4, sortOrder: 1, status: 'available' },
  { id: 'tbl-3', storeId: DEMO_STORE_ID, zone: 'ในร้าน', name: 'T3', seats: 2, sortOrder: 2, status: 'available' },
  { id: 'tbl-4', storeId: DEMO_STORE_ID, zone: 'ในร้าน', name: 'T4', seats: 6, sortOrder: 3, status: 'available' },
  { id: 'tbl-5', storeId: DEMO_STORE_ID, zone: 'ในร้าน', name: 'T5', seats: 4, sortOrder: 4, status: 'available' },
  { id: 'tbl-6', storeId: DEMO_STORE_ID, zone: 'ในร้าน', name: 'T6', seats: 8, sortOrder: 5, status: 'available' },
  { id: 'tbl-7', storeId: DEMO_STORE_ID, zone: 'หน้าร้าน', name: 'F1', seats: 2, sortOrder: 6, status: 'available' },
  { id: 'tbl-8', storeId: DEMO_STORE_ID, zone: 'หน้าร้าน', name: 'F2', seats: 4, sortOrder: 7, status: 'available' },
  { id: 'tbl-9', storeId: DEMO_STORE_ID, zone: 'หน้าร้าน', name: 'F3', seats: 4, sortOrder: 8, status: 'available' },
  { id: 'tbl-10', storeId: DEMO_STORE_ID, zone: 'VIP', name: 'V1', seats: 10, sortOrder: 9, status: 'available' },
];

// ── Retail demo data ──
const retailCategories: Category[] = [
  { id: 'cat-snack', storeId: DEMO_STORE_ID, name: 'ขนม/ของว่าง', sortOrder: 0, color: colors[0] },
  { id: 'cat-bev', storeId: DEMO_STORE_ID, name: 'เครื่องดื่ม', sortOrder: 1, color: colors[4] },
  { id: 'cat-instant', storeId: DEMO_STORE_ID, name: 'อาหารสำเร็จรูป', sortOrder: 2, color: colors[1] },
  { id: 'cat-daily', storeId: DEMO_STORE_ID, name: 'ของใช้ประจำวัน', sortOrder: 3, color: colors[3] },
  { id: 'cat-fresh', storeId: DEMO_STORE_ID, name: 'ของสด/แช่เย็น', sortOrder: 4, color: colors[5] },
];

const retailProducts: Product[] = [
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-snack', name: 'เลย์ คลาสสิค', price: 20, unit: 'ซอง', barcode: '8850718800100', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-snack', name: 'โปเต้ ออริจินัล', price: 22, unit: 'ซอง', barcode: '8850718800200', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-snack', name: 'ทิชชู่เปียก', price: 15, unit: 'ห่อ', barcode: '8850718800300', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-bev', name: 'น้ำดื่มสิงห์ 600ml', price: 10, unit: 'ขวด', barcode: '8850999220017', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-bev', name: 'โค้ก 325ml', price: 15, unit: 'กระป๋อง', barcode: '8851959131008', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-bev', name: 'เอ็ม-150', price: 10, unit: 'ขวด', barcode: '8851959131100', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-bev', name: 'นมหนองโพ จืด', price: 14, unit: 'กล่อง', barcode: '8851959131200', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-instant', name: 'มาม่า ต้มยำกุ้ง', price: 7, unit: 'ซอง', barcode: '8850987100109', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-instant', name: 'ไวไว ซอง', price: 6, unit: 'ซอง', barcode: '8850987100200', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-instant', name: 'ปลากระป๋อง ปุ้มปุ้ย', price: 18, unit: 'กระป๋อง', barcode: '8850987100300', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-daily', name: 'ผงซักฟอก บรีส', price: 30, unit: 'ถุง', barcode: '8851932310017', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-daily', name: 'น้ำยาล้างจาน ซันไลต์', price: 22, unit: 'ถุง', barcode: '8851932310100', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-daily', name: 'ยาสีฟัน คอลเกต', price: 35, unit: 'หลอด', barcode: '8851932310200', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-fresh', name: 'ไข่ไก่ (แผง)', price: 42, unit: 'แผง', barcode: '8851932310300', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
  { id: generateId(), storeId: DEMO_STORE_ID, categoryId: 'cat-fresh', name: 'นมเปรี้ยว ดัชมิลล์', price: 8, unit: 'ขวด', barcode: '8851932310400', isActive: true, variants: [], modifiers: [], createdAt: nowTimestamp() },
];

export async function seedDemoData(businessType: BusinessType = 'restaurant') {
  const storeCount = await db.stores.count();
  if (storeCount > 0) return false;

  const storeToAdd: Store = {
    ...demoStore,
    businessType,
    name: businessType === 'retail' ? 'ร้านโชห่วยสะดวกซื้อ' : 'ร้านครัวคุณแม่',
    settings: {
      ...demoStore.settings,
      enableServiceCharge: businessType === 'restaurant',
      vatMode: businessType === 'retail' ? 'included' : 'add',
      roundingMode: businessType === 'retail' ? 'baht' : 'none',
      receiptHeader: businessType === 'retail'
        ? 'ร้านโชห่วยสะดวกซื้อ\nขอบคุณที่มาอุดหนุน'
        : demoStore.settings.receiptHeader,
    },
  };

  const cats = businessType === 'retail' ? retailCategories : demoCategories;
  const prods = businessType === 'retail' ? retailProducts : demoProducts;

  const tables = businessType === 'retail' ? [] : demoTables;

  await db.transaction('rw',
    [db.stores, db.users, db.categories, db.products, db.diningTables],
    async () => {
      await db.stores.add(storeToAdd);
      await db.users.bulkAdd(demoUsers);
      await db.categories.bulkAdd(cats);
      await db.products.bulkAdd(prods);
      if (tables.length > 0) await db.diningTables.bulkAdd(tables);
    }
  );
  return true;
}

export { DEMO_STORE_ID };
