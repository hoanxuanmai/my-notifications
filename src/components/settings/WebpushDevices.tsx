"use client";
import { useEffect, useState, useCallback } from "react";
import ConfirmModal from "@/components/common/ConfirmModal";
import { userMeApi, deliveryApi } from "@/lib/api";
import {
  getWebPushStatus,
  subscribeCurrentDevice,
  sendLocalTestNotification,
  WebPushStatus,
} from "@/lib/webpush";
import { Bell, Smartphone, ShieldCheck, AlertCircle, RefreshCw, Send, Trash2, CheckCircle2 } from "lucide-react";

interface Device {
  id: string;
  endpoint: string;
  createdAt: string;
  lastUsedAt?: string;
  deviceName?: string;
  os?: string;
  browser?: string;
  isActive?: boolean;
}

export default function WebpushDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local device status
  const [deviceStatus, setDeviceStatus] = useState<WebPushStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    const status = await getWebPushStatus();
    setDeviceStatus(status);
    return status;
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userMeApi.getWebPushDevices();
      setDevices(res);
    } catch (e: any) {
      setError(e.message || "Không thể tải danh sách thiết bị");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    fetchDevices();
  }, [checkStatus, fetchDevices]);

  // Register / Re-subscribe current device
  const handleRegisterDevice = async () => {
    setActionLoading(true);
    setTestResult(null);
    try {
      const res = await subscribeCurrentDevice(true);
      if (res.success) {
        setTestResult({
          ok: true,
          message: "Đăng ký thiết bị thành công! Thiết bị này đã sẵn sàng nhận thông báo đẩy.",
        });
        await checkStatus();
        await fetchDevices();
      } else {
        setTestResult({
          ok: false,
          message: res.error || "Không thể cấp quyền hoặc đăng ký thiết bị",
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || "Lỗi khi đăng ký thiết bị",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Test push notification directly
  const handleTestPush = async () => {
    setActionLoading(true);
    setTestResult(null);
    try {
      // 1. Try local service worker notification first
      const localRes = await sendLocalTestNotification(
        "🔔 Kiểm tra thông báo đẩy",
        "Thông báo hiển thị thành công trên thiết bị này!"
      );

      // 2. Also trigger a test through the webhook / delivery backend
      const deliveryRes = await deliveryApi.trigger({
        title: "Test Webhook Push",
        message: "Hệ thống Webhook đã đẩy thông báo thành công tới thiết bị của bạn!",
        type: "info",
        priority: "high",
      });

      if (localRes.success || deliveryRes.ok) {
        setTestResult({
          ok: true,
          message: "Đã gửi thông báo thử nghiệm! Vui lòng kiểm tra khay thông báo trên màn hình.",
        });
      } else {
        setTestResult({
          ok: false,
          message: localRes.error || deliveryRes.error || "Không thể gửi thông báo thử nghiệm",
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || "Lỗi kiểm tra thông báo",
      });
    } finally {
      setActionLoading(false);
    }
  };

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
      await checkStatus();
    } finally {
      setLoading(false);
      setPendingDeleteId(null);
    }
  };

  const isCurrentDeviceSubscribed = Boolean(
    deviceStatus?.subscribed &&
    deviceStatus?.endpoint &&
    devices.some((d) => d.endpoint === deviceStatus.endpoint)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Quản lý thiết bị nhận thông báo (Web Push)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Đăng ký trình duyệt hoặc điện thoại để nhận thông báo tức thời khi có webhook mới.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            checkStatus();
            fetchDevices();
          }}
          disabled={loading || actionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Current Device Diagnostic Box */}
      <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Trạng thái thiết bị hiện tại
          </span>

          {deviceStatus?.permission === "granted" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã cấp quyền thông báo
            </span>
          ) : deviceStatus?.permission === "denied" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700">
              <AlertCircle className="w-3.5 h-3.5" />
              Bị chặn trong trình duyệt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              <AlertCircle className="w-3.5 h-3.5" />
              Chưa cấp quyền
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Hỗ trợ Web Push:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {deviceStatus?.supported ? "✅ Có hỗ trợ (Service Worker & PushManager)" : "❌ Trình duyệt không hỗ trợ"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Đăng ký trên máy chủ:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {isCurrentDeviceSubscribed
                ? "🟢 Thiết bị này đã liên kết nhận Push"
                : deviceStatus?.subscribed
                ? "🟡 Có Push token nhưng cần đồng bộ máy chủ"
                : "⚪ Chưa đăng ký thiết bị này"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleRegisterDevice}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-60"
          >
            <Bell className="w-3.5 h-3.5" />
            {isCurrentDeviceSubscribed ? "Cập nhật / Đăng ký lại thiết bị" : "Bật & Đăng ký thiết bị này"}
          </button>

          <button
            type="button"
            onClick={handleTestPush}
            disabled={actionLoading || deviceStatus?.permission !== "granted"}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            Gửi thông báo đẩy thử nghiệm
          </button>
        </div>

        {/* Result notice */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              testResult.ok
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
            }`}
          >
            {testResult.ok ? "✅ " : "⚠️ "}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Registered Devices List */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Danh sách thiết bị đã đăng ký ({devices.length})
        </h3>

        {error ? (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : devices.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
            <Smartphone className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chưa có thiết bị nào được đăng ký
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Nhấn nút &quot;Bật &amp; Đăng ký thiết bị này&quot; ở trên để nhận thông báo đẩy tức thời khi có webhook.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {devices.map((d) => {
              const isThisDevice = deviceStatus?.endpoint && d.endpoint === deviceStatus.endpoint;
              return (
                <div
                  key={d.id}
                  className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                    isThisDevice
                      ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {d.deviceName || d.browser || "Thiết bị Web Push"}
                      </span>
                      {isThisDevice && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          Thiết bị này
                        </span>
                      )}
                      {d.isActive !== false ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate max-w-md">
                      {d.endpoint}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      <span>Đăng ký: {new Date(d.createdAt).toLocaleString()}</span>
                      {d.lastUsedAt && (
                        <span>Lần cuối: {new Date(d.lastUsedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Xóa thiết bị"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Hủy đăng ký thiết bị"
        description="Bạn có chắc chắn muốn xóa thiết bị này khỏi danh sách nhận thông báo đẩy không?"
        confirmText="Xóa thiết bị"
        cancelText="Hủy"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
