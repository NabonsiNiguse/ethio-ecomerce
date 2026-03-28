"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { getToken, isAuthenticated } from "@/lib/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { TrackingData } from "@/components/LiveTrackingMap";

const LiveTrackingMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>
  ),
});

interface IncomingOrder {
  delivery_id: number;
  order_id: number;
  address: string;
  distance_km: number | null;
  delivery_fee: number;
  received_at: string;
}

interface ActiveDelivery {
  id: number;
  order_id: number;
  status: string;
  shipping_address: string;
  distance_km: number | null;
  delivery_fee: number;
  otp_verified: boolean;
  buyer_lat?: number | null;
  buyer_lon?: number | null;
  seller_lat?: number | null;
  seller_lon?: number | null;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

const STATUS_COLORS: Record<string, string> = {
  assigned:  "bg-blue-100 text-blue-700",
  picked:    "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
};

export default function RiderDashboard() {
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [incoming, setIncoming] = useState<IncomingOrder[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [loadingOtp, setLoadingOtp] = useState<number | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<number | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/auth/login"); return; }
    connectWebSocket();
    fetchActiveDeliveries();
    startLocationTracking();
    return () => {
      wsRef.current?.close();
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const connectWebSocket = () => {
    const token = getToken();
    const ws = new WebSocket(`${WS_URL}/ws/dispatch/?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => { setConnected(true); toast.success("Connected to dispatch"); };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_order") {
          setIncoming(prev => [{
            delivery_id: msg.delivery_id,
            order_id: msg.order_id,
            address: msg.address,
            distance_km: msg.distance_km,
            delivery_fee: msg.delivery_fee,
            received_at: new Date().toISOString(),
          }, ...prev]);
          toast("📦 New delivery request!", { icon: "🚴" });
        }
      } catch {}
    };
    ws.onclose = () => { setConnected(false); setTimeout(connectWebSocket, 3000); };
    ws.onerror = () => ws.close();
  };

  const fetchActiveDeliveries = async () => {
    try {
      const { data } = await api.get<ActiveDelivery[]>("/api/delivery/my-deliveries");
      setActiveDeliveries(data);
      if (data.length > 0 && selectedDelivery === null) {
        setSelectedDelivery(data[0].id);
      }
    } catch {}
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setRiderPos({ lat, lon });
        api.put("/api/delivery/location", { current_lat: lat, current_lon: lon }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    watchIdRef.current = id;
  };

  const updateStatus = async (deliveryId: number, newStatus: string) => {
    setLoadingStatus(deliveryId);
    try {
      await api.put("/api/delivery/status", { delivery_id: deliveryId, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchActiveDeliveries();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to update status");
    } finally {
      setLoadingStatus(null);
    }
  };

  const confirmOtp = async (deliveryId: number) => {
    const otp = otpInputs[deliveryId]?.trim();
    if (!otp || otp.length !== 6) { toast.error("Enter the 6-digit OTP"); return; }
    setLoadingOtp(deliveryId);
    try {
      await api.post("/api/delivery/confirm-otp", { delivery_id: deliveryId, otp_code: otp });
      toast.success("Delivery confirmed!");
      setOtpInputs(p => ({ ...p, [deliveryId]: "" }));
      fetchActiveDeliveries();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Invalid OTP");
    } finally {
      setLoadingOtp(null);
    }
  };

  const STATUS_NEXT: Record<string, string | null> = { assigned: "picked", picked: null };

  // Build map data for selected delivery
  const selected = activeDeliveries.find(d => d.id === selectedDelivery);
  const mapData: TrackingData | null = selected ? {
    rider_lat:       riderPos?.lat ?? selected.seller_lat ?? 9.0350,
    rider_lon:       riderPos?.lon ?? selected.seller_lon ?? 38.7800,
    rider_name:      "You",
    dest_lat:        selected.buyer_lat ?? 9.0054,
    dest_lon:        selected.buyer_lon ?? 38.7636,
    dest_address:    selected.shipping_address || null,
    origin_lat:      selected.seller_lat ?? 9.0350,
    origin_lon:      selected.seller_lon ?? 38.7800,
    distance_km:     selected.distance_km,
    eta_minutes:     selected.distance_km ? Math.round((selected.distance_km / 25) * 60) : null,
    status:          selected.status,
    rider_updated_at: new Date().toISOString(),
  } : riderPos ? {
    rider_lat: riderPos.lat,
    rider_lon: riderPos.lon,
    rider_name: "You",
    dest_lat: null, dest_lon: null, dest_address: null,
    origin_lat: null, origin_lon: null,
    distance_km: null, eta_minutes: null,
    status: "assigned", rider_updated_at: new Date().toISOString(),
  } : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">🚴 Rider Dashboard</h1>
          <p className="text-sm text-gray-400">Real-time dispatch & delivery management</p>
        </div>
        <div className="flex items-center gap-3">
          {riderPos && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              📍 GPS Active
            </span>
          )}
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
            connected ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {connected ? "Live" : "Reconnecting..."}
          </div>
        </div>
      </div>

      {/* Live Map */}
      {(mapData || riderPos) && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {selected ? `Route to Order #${selected.order_id}` : "Your Location"}
              </span>
            </div>
            {selected && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {selected.distance_km && <span>📏 {selected.distance_km.toFixed(1)} km</span>}
                {selected.distance_km && <span>⏱ ~{Math.round((selected.distance_km / 25) * 60)} min</span>}
              </div>
            )}
          </div>
          {mapData && <LiveTrackingMap data={mapData} height="320px" />}
        </div>
      )}

      {/* Delivery selector (if multiple) */}
      {activeDeliveries.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {activeDeliveries.map(d => (
            <button key={d.id} onClick={() => setSelectedDelivery(d.id)}
              className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                selectedDelivery === d.id
                  ? "bg-orange-500 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}>
              Order #{d.order_id}
            </button>
          ))}
        </div>
      )}

      {/* Incoming orders */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold text-gray-800 dark:text-gray-100">
          📡 Incoming Orders
          {incoming.length > 0 && (
            <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">{incoming.length}</span>
          )}
        </h2>
        <AnimatePresence>
          {incoming.length === 0 ? (
            <Card className="py-10 text-center text-gray-400">
              <p className="text-3xl mb-2">📡</p>
              <p className="text-sm">Waiting for new orders...</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {incoming.map(order => (
                <motion.div key={order.delivery_id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card className="border-l-4 border-orange-500 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Order #{order.order_id}</span>
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">NEW</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">📍 {order.address || "Address not provided"}</p>
                        <div className="flex gap-4 text-xs text-gray-400">
                          {order.distance_km != null && <span>📏 {order.distance_km.toFixed(1)} km</span>}
                          {order.delivery_fee > 0 && <span>💰 {order.delivery_fee} ETB</span>}
                          <span>🕐 {new Date(order.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <button onClick={() => setIncoming(prev => prev.filter(o => o.delivery_id !== order.delivery_id))}
                        className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Dismiss">×</button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* Active deliveries */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">📦 My Active Deliveries</h2>
          <button onClick={fetchActiveDeliveries} className="text-xs font-semibold text-orange-500 hover:underline">Refresh</button>
        </div>

        {activeDeliveries.length === 0 ? (
          <Card className="py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">No active deliveries assigned to you.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {activeDeliveries.map(delivery => {
              const nextStatus = STATUS_NEXT[delivery.status];
              const canOtp = delivery.status === "picked" && !delivery.otp_verified;
              const isSelected = selectedDelivery === delivery.id;

              return (
                <Card key={delivery.id} className={`overflow-hidden p-0 transition ${isSelected ? "ring-2 ring-orange-400" : ""}`}>
                  <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-gray-800">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">Delivery #{delivery.id}</p>
                      <p className="text-xs text-gray-400">Order #{delivery.order_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLORS[delivery.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {delivery.status}
                      </span>
                      <button onClick={() => setSelectedDelivery(isSelected ? null : delivery.id)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition">
                        {isSelected ? "Unpin" : "📍 Pin"}
                      </button>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">Delivery Address</p>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{delivery.shipping_address || "—"}</p>
                      </div>
                      <div className="text-right">
                        {delivery.distance_km != null && <p className="text-xs text-gray-400">{delivery.distance_km.toFixed(1)} km</p>}
                        {delivery.delivery_fee > 0 && <p className="font-bold text-orange-500">{delivery.delivery_fee} ETB</p>}
                      </div>
                    </div>

                    {nextStatus && delivery.status !== "delivered" && (
                      <Button size="sm" loading={loadingStatus === delivery.id}
                        onClick={() => updateStatus(delivery.id, nextStatus)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        Mark as {nextStatus} →
                      </Button>
                    )}

                    {canOtp && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:bg-orange-900/10 dark:border-orange-800">
                        <p className="mb-2 text-sm font-bold text-orange-700 dark:text-orange-400">🔐 Enter Buyer OTP</p>
                        <div className="flex gap-2">
                          <input
                            type="text" maxLength={6} placeholder="6-digit OTP"
                            value={otpInputs[delivery.id] ?? ""}
                            onChange={e => setOtpInputs(p => ({ ...p, [delivery.id]: e.target.value.replace(/\D/g, "") }))}
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest text-gray-900 focus:border-orange-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                          />
                          <Button size="sm" loading={loadingOtp === delivery.id}
                            onClick={() => confirmOtp(delivery.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4">
                            Confirm
                          </Button>
                        </div>
                      </div>
                    )}

                    {delivery.status === "delivered" && (
                      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/10">
                        <span className="text-xl">✅</span>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">Delivery Complete</p>
                      </div>
                    )}

                    <a href={`/chat/order_${delivery.order_id}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-400">
                      💬 Chat with Buyer
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
