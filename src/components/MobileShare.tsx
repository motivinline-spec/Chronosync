import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, X, Copy, Check } from 'lucide-react';

export const MobileShare: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
        title="Open on Mobile"
      >
        <Share2 size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold dark:text-white">Mobile Access</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scan this QR code with your phone's camera to open ChronoSync on your mobile device.
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto border-4 border-blue-50 dark:border-blue-900/20 shadow-inner">
              <QRCodeSVG 
                value={currentUrl} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-3">
              <button 
                onClick={copyToClipboard}
                className="w-full py-3 flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 transition-all border dark:border-gray-700"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider leading-relaxed">
                Tip: Once opened on mobile, use "Add to Home Screen" to install as a native app!
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
