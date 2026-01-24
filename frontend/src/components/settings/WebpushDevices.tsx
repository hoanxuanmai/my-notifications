"use client";
import { useEffect, useState } from "react";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useAuthStore } from '@/stores/auth-store';
import { userMeApi } from "@/lib/api";
import { useGlobalStore } from "@/stores/global-store";

interface Device {
  id: string;
  endpoint: string;
  createdAt: string;
  userAgent?: string;
  os?: string;
  browser?: string;
}

export default function WebpushDevices() {

  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const setLoading = useGlobalStore((s) => s.setLoading);

  // Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userMeApi.getWebPushDevices();
      setDevices(res);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDevices();
  }, [token]);


  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setConfirmOpen(false);
    setLoading(true);
    try {
      await userMeApi.deleteWebPushDevice(pendingDeleteId);
      await fetchDevices();
    } finally {
      setLoading(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold mb-2">Notification Devices</h2>
      {error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : devices.length === 0 ? (
        <div className="text-gray-500 text-sm">No devices registered for notifications.</div>
      ) : (
        <ul className="divide-y divide-gray-200 bg-gray-50 rounded-md border border-gray-200">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center px-3 py-2 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">
                  {d.browser || "Unknown browser"} <span className="text-gray-400">/</span> {d.os || "Unknown OS"}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-xs">{d.endpoint}</div>
                <div className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
              <button
                className="btn-close ml-2 text-gray-400 hover:text-red-500 text-lg"
                title="Remove device"
                onClick={() => handleDelete(d.id)}
              >×</button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmModal
        open={confirmOpen}
        title="Remove Device"
        description="Remove this device from receiving notifications?"
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}
