import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { Camera, Keyboard, ImageUp } from 'lucide-react';
import { useUI } from '../stores/ui';
import { Modal, Button, Input } from './ui';
import { api, apiError } from '../api/client';

/**
 * Global QR scanner. In normal mode a successful scan navigates to the asset.
 * When `auditMode` context is provided elsewhere, the AuditDetail screen renders
 * its own inline scanner. This one handles global navigation + manual entry.
 */
export function QRScanner() {
  const { scannerOpen, setScanner } = useUI();
  const nav = useNavigate();
  const [manual, setManual] = useState('');
  const [camActive, setCamActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!scannerOpen) { stop(); setManual(''); return; }
  }, [scannerOpen]);

  async function resolve(code: string) {
    try {
      const { data } = await api.post('/assets/lookup-qr', { code });
      toast.success(`Found ${data.assetTag}`);
      setScanner(false);
      nav(`/assets/${data.assetTag}`);
    } catch (e) {
      toast.error(apiError(e).message);
    }
  }

  async function start() {
    setCamActive(true);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (text) => { stop(); resolve(text); },
        () => {},
      );
    } catch {
      toast.error('Camera unavailable — use manual entry');
      setCamActive(false);
    }
  }

  async function stop() {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch { /* noop */ }
    scannerRef.current = null;
    setCamActive(false);
  }

  async function scanFromFile(file: File) {
    await stop();
    const s = new Html5Qrcode('qr-reader');
    try {
      const text = await s.scanFile(file, false);
      resolve(text);
    } catch {
      toast.error('No QR code found in that image');
    } finally {
      try { await s.clear(); } catch { /* noop */ }
    }
  }

  return (
    <Modal open={scannerOpen} onClose={() => setScanner(false)} title="Scan asset QR">
      <div className="space-y-4">
        <div id="qr-reader" className="mx-auto aspect-square w-full max-w-[15rem] overflow-hidden rounded-xl border border-border bg-black sm:max-w-xs" />
        <div className="grid grid-cols-2 gap-2">
          {!camActive ? (
            <Button variant="outline" onClick={start}><Camera size={16} /> Camera</Button>
          ) : (
            <Button variant="ghost" onClick={stop}>Stop camera</Button>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm text-txt transition-colors hover:bg-black/[0.05]">
            <ImageUp size={16} /> Upload image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) scanFromFile(f); e.target.value = ''; }} />
          </label>
        </div>
        <div className="flex items-center gap-2 text-xs text-txt-muted">
          <div className="h-px flex-1 bg-border" /> or enter tag manually <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) resolve(manual.trim()); }} className="flex gap-2">
          <div className="flex-1"><Input placeholder="AF-0114" value={manual} onChange={(e) => setManual(e.target.value)} /></div>
          <Button type="submit"><Keyboard size={16} /> Go</Button>
        </form>
      </div>
    </Modal>
  );
}
