import React, { useEffect, useState } from "react";
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@roketid/windmill-react-ui";
import {
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  PlusCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type MealSession = {
  mealSessionId: number;
  title: string;
  mealDate: string;
  status: string;
};

type FoodSupply = {
  supplyId: number;
  foodItem: string;
  vendorName: string;
  quantitySupplied: number;
  quantityDistributed: number;
  quantityRemaining: number;
  supplyDate: string;
  mealSessionTitle: string;
  mealSessionId: number;
  notes?: string;
  createdAt: string;
};

type FoodInventory = {
  foodItem: string;
  overallTotal: number;
  overallDistributed: number;
  overallRemaining: number;
  bySessions: Array<{
    mealSessionId: number;
    mealSessionTitle: string;
    totalSupplied: number;
    totalDistributed: number;
    totalRemaining: number;
  }>;
  supplies: FoodSupply[];
};

export default function FoodInventoryPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<FoodSupply | null>(null);
  const [inventory, setInventory] = useState<FoodInventory[]>([]);
  const [recentSupplies, setRecentSupplies] = useState<FoodSupply[]>([]);
  const [mealSessions, setMealSessions] = useState<MealSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  // Form state
  const [selectedMealSessionId, setSelectedMealSessionId] = useState("");
  const [foodItem, setFoodItem] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplyDate, setSupplyDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  // Top-up form state
  const [topUpQuantity, setTopUpQuantity] = useState("");

  useEffect(() => {
    loadMealSessions();
    loadInventory();
    loadRecentSupplies();
  }, []);

  async function loadMealSessions() {
    try {
      const { data } = await api.get("/events/meal-sessions/all", {
        params: { status: "active", per_page: 50 },
      });
      
      setMealSessions(data.data?.data || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load meal sessions"
      );
    }
  }

  async function loadInventory() {
    try {
      setLoading(true);
      const { data } = await api.get("/food/inventory");
      setInventory(data.inventory || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentSupplies() {
    try {
      const { data } = await api.get("/food/supplies/recent");
      setRecentSupplies(data.supplies || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load recent supplies"
      );
    }
  }

  async function handleAddSupply(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMealSessionId || !foodItem.trim() || !vendorName.trim() || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data } = await api.post("/food/supplies", {
        mealSessionId: parseInt(selectedMealSessionId),
        foodItem: foodItem.trim(),
        vendorName: vendorName.trim(),
        quantitySupplied: parseInt(quantity),
        supplyDate,
        notes: notes.trim(),
      });

      toast.success(data.message || "Food supply recorded successfully");

      setSelectedMealSessionId("");
      setFoodItem("");
      setVendorName("");
      setQuantity("");
      setNotes("");
      setSupplyDate(new Date().toISOString().split("T")[0]);
      setIsAddModalOpen(false);

      loadInventory();
      loadRecentSupplies();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to record food supply"
      );
    }
  }

  async function handleTopUpSupply(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSupply || !topUpQuantity) {
      toast.error("Please enter quantity to add");
      return;
    }

    try {
      const { data } = await api.post(`/food/supplies/${selectedSupply.supplyId}/topup`, {
        additionalQuantity: parseInt(topUpQuantity),
      });

      toast.success(data.message || "Supply topped up successfully");

      setTopUpQuantity("");
      setSelectedSupply(null);
      setIsTopUpModalOpen(false);

      loadInventory();
      loadRecentSupplies();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to top up supply"
      );
    }
  }

  function openTopUpModal(supply: FoodSupply) {
    setSelectedSupply(supply);
    setIsTopUpModalOpen(true);
  }

  async function handleExportReport() {
    try {
      const { data } = await api.get("/food/reports/daily", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `food-report-${new Date().toISOString().split("T")[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Report exported successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to export report"
      );
    }
  }

  const toggleSessionExpand = (index: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSessions(newExpanded);
  };

  const totalSupplied = inventory.reduce(
    (sum, item) => sum + item.overallTotal,
    0
  );
  const totalDistributed = inventory.reduce(
    (sum, item) => sum + item.overallDistributed,
    0
  );
  const totalRemaining = inventory.reduce(
    (sum, item) => sum + item.overallRemaining,
    0
  );

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        {/* Header Section - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <PageTitle>Food Inventory</PageTitle>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Record vendor supplies, track inventory, and monitor food
              distribution
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExportReport}
              layout="outline"
              className="rounded-2xl h-11 w-full sm:w-auto"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </span>
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Record Supply
              </span>
            </Button>
          </div>
        </div>

        {/* Hero Banner - Responsive */}
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-4 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 sm:px-3 sm:py-1 text-[8px] sm:text-xs font-semibold tracking-wide uppercase">
                Food Inventory System
              </div>

              <h2 className="mt-2 sm:mt-3 text-lg sm:text-3xl font-bold leading-tight">
                Track food from vendors to participants
              </h2>

              <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-200 leading-5 sm:leading-6">
                Record incoming supplies and monitor real-time distribution as
                QR codes are scanned
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - Responsive Grid */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 dark:bg-blue-900/20 p-2 sm:p-3">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Total Supplied
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {totalSupplied}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-100 dark:bg-green-900/20 p-2 sm:p-3">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Distributed
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {totalDistributed}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-100 dark:bg-orange-900/20 p-2 sm:p-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Remaining
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {totalRemaining}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Inventory */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5 mb-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Inventory by Food Item
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No food in inventory yet
            </p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
              Click "Record Supply" to add food from vendors
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {inventory.map((item, index) => {
              const percentage =
                item.overallTotal > 0
                  ? (item.overallRemaining / item.overallTotal) * 100
                  : 0;
              const isLow = item.overallRemaining < 10;

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-100 dark:border-gray-700 p-3 sm:p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {item.foodItem}
                    </h4>
                    {isLow && (
                      <Badge type="danger" className="w-fit">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </span>
                      </Badge>
                    )}
                  </div>

                  {/* Dynamic Progress Bar with Smart Text Color */}
                  <div className="relative w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all ${
                        isLow
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : "bg-gradient-to-r from-green-500 to-green-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span 
                      className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none"
                      style={{
                        background: `linear-gradient(to right, white ${percentage}%, #111827 ${percentage}%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      {item.overallRemaining} / {item.overallTotal}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm mb-3">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Supplied
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.overallTotal}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Distributed
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.overallDistributed}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Remaining
                      </p>
                      <p
                        className={`font-semibold ${
                          isLow
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {item.overallRemaining}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown by Session - Responsive */}
                  {item.bySessions.length > 1 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleSessionExpand(index)}
                        className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <span>
                          View breakdown by meal session ({item.bySessions.length} sessions)
                        </span>
                        {expandedSessions.has(index) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {expandedSessions.has(index) && (
                        <div className="mt-2 space-y-2">
                          {item.bySessions.map((session) => {
                            // Find the supply for this session to enable top-up
                            const sessionSupply = item.supplies.find(
                              s => s.mealSessionId === session.mealSessionId
                            );
                            
                            return (
                              <div
                                key={session.mealSessionId}
                                className="text-xs bg-gray-50 dark:bg-gray-900/30 p-2 rounded flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-medium text-xs sm:text-sm">
                                    {session.mealSessionTitle}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                                    {session.totalRemaining} / {session.totalSupplied} remaining
                                  </p>
                                </div>
                                {sessionSupply && (
                                  <button
                                    onClick={() => openTopUpModal(sessionSupply)}
                                    className="ml-2 p-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                                    title="Top up this supply"
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Supplies - Responsive Table */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5 mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Supplies
        </h3>

        {recentSupplies.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No supplies recorded yet
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Food Item</TableCell>
                    <TableCell>Session</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Remaining</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSupplies.map((supply) => {
                    const percentage =
                      supply.quantitySupplied > 0
                        ? (supply.quantityRemaining / supply.quantitySupplied) * 100
                        : 0;
                    const isLow = supply.quantityRemaining < 10;

                    return (
                      <TableRow key={supply.supplyId}>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(supply.supplyDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{supply.foodItem}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{supply.mealSessionTitle}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{supply.vendorName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-sm">
                            {supply.quantitySupplied}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold text-sm ${
                              isLow ? "text-red-600 dark:text-red-400" : ""
                            }`}
                          >
                            {supply.quantityRemaining}
                          </span>
                        </TableCell>
                        <TableCell>
                          {percentage > 50 ? (
                            <Badge type="success">Available</Badge>
                          ) : percentage > 20 ? (
                            <Badge type="warning">Running Low</Badge>
                          ) : percentage > 0 ? (
                            <Badge type="danger">Critical</Badge>
                          ) : (
                            <Badge type="neutral">Depleted</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => openTopUpModal(supply)}
                            className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                            title="Top up this supply"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {recentSupplies.map((supply) => {
                const percentage =
                  supply.quantitySupplied > 0
                    ? (supply.quantityRemaining / supply.quantitySupplied) * 100
                    : 0;
                const isLow = supply.quantityRemaining < 10;

                return (
                  <div
                    key={supply.supplyId}
                    className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {supply.foodItem}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(supply.supplyDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {percentage > 50 ? (
                          <Badge type="success">Available</Badge>
                        ) : percentage > 20 ? (
                          <Badge type="warning">Running Low</Badge>
                        ) : percentage > 0 ? (
                          <Badge type="danger">Critical</Badge>
                        ) : (
                          <Badge type="neutral">Depleted</Badge>
                        )}
                        <button
                          onClick={() => openTopUpModal(supply)}
                          className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                          title="Top up"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Session</p>
                        <p className="text-gray-900 dark:text-white text-sm">
                          {supply.mealSessionTitle}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Vendor</p>
                        <p className="text-gray-900 dark:text-white text-sm">
                          {supply.vendorName}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Supplied</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {supply.quantitySupplied}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Remaining</p>
                        <p className={`font-semibold ${isLow ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                          {supply.quantityRemaining}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Supply Modal - Responsive */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsAddModalOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAddSupply}>
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Record Food Supply from Vendor
                  </h3>
                  
                  {/* Meal Session Field */}
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Meal Session *
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={selectedMealSessionId}
                      onChange={(e) => setSelectedMealSessionId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Meal Session --</option>
                      {mealSessions.map((session) => (
                        <option
                          key={session.mealSessionId}
                          value={session.mealSessionId}
                        >
                          {session.title} - {new Date(session.mealDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Food Item Field */}
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Food Item *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={foodItem}
                      onChange={(e) => setFoodItem(e.target.value)}
                      placeholder="e.g., Jollof Rice, Fried Rice & Chicken"
                      required
                    />
                  </div>

                  {/* Vendor Name Field */}
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vendor Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g., ABC Catering"
                      required
                    />
                  </div>

                  {/* Quantity Supplied Field */}
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Quantity Supplied *
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Number of servings"
                      min="1"
                      required
                    />
                  </div>

                  {/* Supply Date Field */}
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Supply Date *
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={supplyDate}
                      onChange={(e) => setSupplyDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes (Optional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional information..."
                    />
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    layout="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    type="button"
                    className="rounded-xl sm:rounded-2xl w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl sm:rounded-2xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto order-1 sm:order-2"
                  >
                    Record Supply
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Top-up Modal */}
      {isTopUpModalOpen && selectedSupply && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsTopUpModalOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-md mx-auto">
              <form onSubmit={handleTopUpSupply}>
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Top Up Supply
                  </h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Food Item</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedSupply.foodItem}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Meal Session</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedSupply.mealSessionTitle}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSupply.quantityRemaining} remaining of {selectedSupply.quantitySupplied} supplied
                    </p>
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Additional Quantity *
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={topUpQuantity}
                      onChange={(e) => setTopUpQuantity(e.target.value)}
                      placeholder="Enter quantity to add"
                      min="1"
                      required
                    />
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    layout="outline"
                    onClick={() => {
                      setIsTopUpModalOpen(false);
                      setSelectedSupply(null);
                      setTopUpQuantity("");
                    }}
                    type="button"
                    className="rounded-xl sm:rounded-2xl w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl sm:rounded-2xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto order-1 sm:order-2"
                  >
                    Add to Supply
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}