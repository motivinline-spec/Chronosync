import { useState, useEffect } from 'react';
import { Watch, Bluetooth, BluetoothConnected, BluetoothSearching, X, ShieldCheck, Info, AlertTriangle } from 'lucide-react';

export const WatchConnect: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'connected' | 'error'>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!(navigator as any).bluetooth) {
      setSupported(false);
    }
  }, []);

  const connectDevice = async () => {
    setError(null);
    const nav = navigator as any;
    if (!nav.bluetooth) {
      setStatus('error');
      setError("Web Bluetooth is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    try {
      setStatus('scanning');
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'heart_rate'] // Generic services many watches have
      });

      setStatus('connected');
      setDeviceName(device.name || 'Smart Watch');
      
      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle');
        setDeviceName(null);
      });

    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setStatus('idle');
      } else {
        setStatus('error');
        setError(err.message || "Connection failed. Make sure your watch is in pairing mode.");
      }
    }
  };

  const disconnect = () => {
    setStatus('idle');
    setDeviceName(null);
  };

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          status === 'connected' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        }`}
      >
        {status === 'connected' ? <BluetoothConnected size={14} /> : <Watch size={14} />}
        {status === 'connected' ? deviceName : 'Connect Watch'}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Watch className="text-blue-600" /> Smartwatch Sync
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-xl">
                  {status === 'connected' ? (
                    <BluetoothConnected className="text-green-500 animate-pulse" />
                  ) : status === 'scanning' ? (
                    <BluetoothSearching className="text-blue-500 animate-spin" />
                  ) : (
                    <Bluetooth className="text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold dark:text-white">
                    {status === 'connected' ? 'Device Paired' : status === 'scanning' ? 'Searching...' : 'Not Connected'}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {status === 'connected' ? deviceName : 'Connect via Bluetooth BLE'}
                  </div>
                </div>
              </div>

              {!supported && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    Web Bluetooth is not supported by your browser. Please use Google Chrome or Edge on Android or Desktop.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Sync your ChronoSync timers and alerts directly to your wrist. Receive vibration and sound notifications even if your phone is in your pocket.
                </p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                    <ShieldCheck size={12} /> Secure Pairing
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                    <Info size={12} /> Low Energy (BLE)
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl text-[10px] text-red-600 dark:text-red-400 font-bold">
                  {error}
                </div>
              )}

              {status === 'connected' ? (
                <button 
                  onClick={disconnect}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-all"
                >
                  Disconnect Device
                </button>
              ) : (
                <button 
                  onClick={connectDevice}
                  disabled={status === 'scanning'}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {status === 'scanning' ? 'Pairing...' : 'Search for Watch'}
                </button>
              )}
            </div>

            <div className="text-[10px] text-center text-gray-400 font-medium">
              Note: ChronoSync supports Wear OS, Apple Watch (via Mirroring), and G-Shock BLE models.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
