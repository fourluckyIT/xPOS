import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Banknote, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  total: number;
  onConfirm: (received: number) => void;
  onClose: () => void;
}

const quickAmounts = [20, 50, 100, 500, 1000];

export default function CashPaymentDialog({ total, onConfirm, onClose }: Props) {
  const [received, setReceived] = useState('');

  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;
  const isValid = receivedNum >= total;

  function handleQuick(amount: number) {
    setReceived(String(amount));
  }

  function handleExact() {
    setReceived(String(total));
  }

  function handleNumpad(key: string) {
    if (key === 'C') {
      setReceived('');
    } else if (key === '⌫') {
      setReceived((p) => p.slice(0, -1));
    } else if (key === '.') {
      if (!received.includes('.')) setReceived((p) => p + '.');
    } else {
      setReceived((p) => p + key);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Banknote className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold">ชำระเงินสด</h3>
        </div>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">ยอดที่ต้องชำระ</p>
          <p className="text-3xl font-bold text-primary">฿{formatCurrency(total)}</p>
        </div>

        {/* Received amount display */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3 text-center">
          <p className="text-xs text-muted-foreground">รับเงิน</p>
          <p className="text-2xl font-bold">{received ? `฿${received}` : '฿0'}</p>
        </div>

        {/* Change */}
        {receivedNum > 0 && (
          <div className={cn(
            'rounded-xl p-3 mb-3 text-center',
            isValid ? 'bg-green-50' : 'bg-red-50'
          )}>
            <p className="text-xs text-muted-foreground">เงินทอน</p>
            <p className={cn('text-2xl font-bold', isValid ? 'text-green-600' : 'text-red-500')}>
              {isValid ? `฿${formatCurrency(change)}` : `ขาด ฿${formatCurrency(Math.abs(change))}`}
            </p>
          </div>
        )}

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={handleExact}
            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-95"
          >
            พอดี
          </button>
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => handleQuick(amt)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 active:scale-95"
            >
              ฿{amt}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '.', '0', '00', '000', ''].map((key) => (
            <button
              key={key || 'blank'}
              onClick={() => key && handleNumpad(key)}
              disabled={!key}
              className={cn(
                'h-11 rounded-lg text-base font-semibold transition-all active:scale-95',
                key === '⌫' || key === 'C'
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : key
                    ? 'bg-gray-100 hover:bg-gray-200'
                    : 'bg-transparent'
              )}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={() => isValid && onConfirm(receivedNum)}
          disabled={!isValid}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          ยืนยันรับเงิน
        </button>
        <button onClick={onClose} className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
