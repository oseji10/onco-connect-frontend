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
  Pill,
  AlertCircle,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MedicationSupply = {
  supplyId: number;
  drugName: string;
  batchNumber: string;
  expiryDate: string;
  quantitySupplied: number;
  quantityDispensed: number;
  quantityRemaining: number;
  supplyDate: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  createdAt: string;
};

type MedicationInventory = {
  drugName: string;
  overallTotal: number;
  overallDispensed: number;
  overallRemaining: number;
  byBatches: Array<{
    supplyId: number;
    batchNumber: string;
    expiryDate: string;
    quantitySupplied: number;
    quantityDispensed: number;
    quantityRemaining: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  }>;
};

export default function MedicationInventoryPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<MedicationSupply | null>(null);
  const [inventory, setInventory] = useState<MedicationInventory[]>([]);
  const [recentSupplies, setRecentSupplies] = useState<MedicationSupply[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDrugs, setExpandedDrugs] = useState<Set<number>>(new Set());

  // Form state
  const [drugName, setDrugName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplyDate, setSupplyDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const router = useRouter();
  // Top-up form state
  const [topUpQuantity, setTopUpQuantity] = useState("");

  useEffect(() => {
    loadInventory();
    loadRecentSupplies();
  }, []);

  async function loadInventory() {
    try {
      setLoading(true);
      const { data } = await api.get("/medications/inventory");
      setInventory(data.inventory || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentSupplies() {
    try {
      const { data } = await api.get("/medications/supplies/recent");
      setRecentSupplies(data.supplies || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load recent supplies"
      );
    }
  }

  async function handleAddSupply(e: React.FormEvent) {
    e.preventDefault();

    if (!drugName.trim() || !batchNumber.trim() || !expiryDate || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data } = await api.post("/medications/supplies", {
        drugName: drugName.trim(),
        batchNumber: batchNumber.trim(),
        expiryDate,
        quantitySupplied: parseInt(quantity),
        supplyDate,
        notes: notes.trim(),
      });

      toast.success(data.message || "Medication supply recorded successfully");

      setDrugName("");
      setBatchNumber("");
      setExpiryDate("");
      setQuantity("");
      setNotes("");
      setSupplyDate(new Date().toISOString().split("T")[0]);
      setIsAddModalOpen(false);

      loadInventory();
      loadRecentSupplies();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to record medication supply"
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
      const { data } = await api.post(
        `/medications/supplies/${selectedSupply.supplyId}/topup`,
        {
          additionalQuantity: parseInt(topUpQuantity),
        }
      );

      toast.success(data.message || "Supply topped up successfully");

      setTopUpQuantity("");
      setSelectedSupply(null);
      setIsTopUpModalOpen(false);

      loadInventory();
      loadRecentSupplies();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to top up supply");
    }
  }

  function openTopUpModal(supply: MedicationSupply) {
    setSelectedSupply(supply);
    setIsTopUpModalOpen(true);
  }

  async function handleExportReport() {
    try {
      const { data } = await api.get("/medications/reports");
      
      // Create downloadable JSON report
      const blob = new Blob([JSON.stringify(data.report, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `medication-report-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Report exported successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to export report");
    }
  }

  const toggleDrugExpand = (index: number) => {
    const newExpanded = new Set(expandedDrugs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDrugs(newExpanded);
  };

  const totalSupplied = inventory.reduce(
    (sum, item) => sum + item.overallTotal,
    0
  );
  const totalDispensed = inventory.reduce(
    (sum, item) => sum + item.overallDispensed,
    0
  );
  const totalRemaining = inventory.reduce(
    (sum, item) => sum + item.overallRemaining,
    0
  );

  // Count expiring and expired medications
  const expiringCount = recentSupplies.filter(s => s.isExpiringSoon).length;
  const expiredCount = recentSupplies.filter(s => s.isExpired).length;

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <PageTitle>Medication Inventory</PageTitle>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Record medication supplies, track dispensing, and monitor expiry dates
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
              className="rounded-2xl h-11 !bg-green-700 border-blue-700 hover:bg-blue-800 hover:border-blue-800 w-full sm:w-auto"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Record Supply
              </span>
            </Button>


<Button
  onClick={() => router.push('/icw/dispense')}   // using next/router
  className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto"
>
  <span className="inline-flex items-center justify-center gap-2">
    Dispense Drug
  </span>
</Button>

<Button
  onClick={() => router.push('/icw/medical-histories')}   // using next/router
  className="rounded-2xl h-11 !bg-red-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto"
>
  <span className="inline-flex items-center justify-center gap-2">
    View Medical Histories
  </span>
</Button>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-teal-700 shadow-xl">
          <div className="px-4 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 sm:px-3 sm:py-1 text-[8px] sm:text-xs font-semibold tracking-wide uppercase">
                Medication Management System
              </div>

              <h2 className="mt-2 sm:mt-3 text-lg sm:text-3xl font-bold leading-tight">
                Track medications from pharmacy to participants
              </h2>

              <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-200 leading-5 sm:leading-6">
                Monitor inventory, track expiry dates, and record dispensing to participants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 dark:bg-blue-900/20 p-2 sm:p-3">
              <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
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
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Dispensed
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {totalDispensed}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-100 dark:bg-orange-900/20 p-2 sm:p-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
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

        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 dark:bg-red-900/20 p-2 sm:p-3">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Expiring Soon
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {expiringCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts for expiring/expired medications */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="mb-5 space-y-3">
          {expiredCount > 0 && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100">
                    {expiredCount} Expired Medication{expiredCount > 1 ? 's' : ''}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    These medications have passed their expiry date and should not be dispensed.
                  </p>
                </div>
              </div>
            </div>
          )}
          {expiringCount > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                    {expiringCount} Medication{expiringCount > 1 ? 's' : ''} Expiring Soon
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    These medications will expire within 30 days. Use them first.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Inventory */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5 mb-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Inventory by Medication
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-8">
            <Pill className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No medications in inventory yet
            </p>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
              Click "Record Supply" to add medications
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
                      {item.drugName}
                    </h4>
                    {isLow && (
                      <Badge type="danger" className="w-fit">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          Low Stock
                        </span>
                      </Badge>
                    )}
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="relative w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all ${
                        isLow
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : "bg-gradient-to-r from-blue-500 to-blue-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none"
                      style={{
                        background: `linear-gradient(to right, white ${percentage}%, #111827 ${percentage}%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
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
                        Dispensed
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.overallDispensed}
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

                  {/* Breakdown by Batch */}
                  {item.byBatches.length > 1 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleDrugExpand(index)}
                        className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <span>
                          View breakdown by batch ({item.byBatches.length} batches)
                        </span>
                        {expandedDrugs.has(index) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {expandedDrugs.has(index) && (
                        <div className="mt-2 space-y-2">
                          {item.byBatches.map((batch) => (
                            <div
                              key={batch.supplyId}
                              className="text-xs bg-gray-50 dark:bg-gray-900/30 p-2 rounded flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-xs sm:text-sm">
                                    Batch: {batch.batchNumber}
                                  </p>
                                  {batch.isExpired && (
                                    <Badge type="danger" className="text-[10px]">
                                      Expired
                                    </Badge>
                                  )}
                                  {batch.isExpiringSoon && !batch.isExpired && (
                                    <Badge type="warning" className="text-[10px]">
                                      Expiring Soon
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                  Expiry: {new Date(batch.expiryDate).toLocaleDateString()} • {batch.quantityRemaining} / {batch.quantitySupplied} remaining
                                </p>
                              </div>
                              {!batch.isExpired && (
                                <button
                                  onClick={() => {
                                    const supply = recentSupplies.find(
                                      s => s.supplyId === batch.supplyId
                                    );
                                    if (supply) openTopUpModal(supply);
                                  }}
                                  className="ml-2 p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  title="Top up this batch"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
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

      {/* Recent Supplies Table */}
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
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Drug Name</TableCell>
                    <TableCell>Batch Number</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Supplied</TableCell>
                    <TableCell>Remaining</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSupplies.map((supply) => (
                    <TableRow key={supply.supplyId}>
                      <TableCell>
                        <span className="font-medium text-sm">
                          {supply.drugName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{supply.batchNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(supply.expiryDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm">
                          {supply.quantitySupplied}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm">
                          {supply.quantityRemaining}
                        </span>
                      </TableCell>
                      <TableCell>
                        {supply.isExpired ? (
                          <Badge type="danger">Expired</Badge>
                        ) : supply.isExpiringSoon ? (
                          <Badge type="warning">Expiring Soon</Badge>
                        ) : supply.quantityRemaining === 0 ? (
                          <Badge type="neutral">Depleted</Badge>
                        ) : (
                          <Badge type="success">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!supply.isExpired && supply.quantityRemaining > 0 && (
                          <button
                            onClick={() => openTopUpModal(supply)}
                            className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            title="Top up"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {recentSupplies.map((supply) => (
                <div
                  key={supply.supplyId}
                  className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {supply.drugName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Batch: {supply.batchNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {supply.isExpired ? (
                        <Badge type="danger">Expired</Badge>
                      ) : supply.isExpiringSoon ? (
                        <Badge type="warning">Expiring Soon</Badge>
                      ) : supply.quantityRemaining === 0 ? (
                        <Badge type="neutral">Depleted</Badge>
                      ) : (
                        <Badge type="success">Available</Badge>
                      )}
                      {!supply.isExpired && supply.quantityRemaining > 0 && (
                        <button
                          onClick={() => openTopUpModal(supply)}
                          className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Expiry Date
                      </p>
                      <p className="text-gray-900 dark:text-white text-sm">
                        {new Date(supply.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Remaining
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {supply.quantityRemaining} / {supply.quantitySupplied}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Supply Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsAddModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAddSupply}>
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Record Medication Supply
                  </h3>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Drug Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={drugName}
                      onChange={(e) => setDrugName(e.target.value)}
                      placeholder="e.g., Paracetamol, Ibuprofen"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="e.g., BATCH2024001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Quantity Supplied *
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Number of units"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Supply Date *
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={supplyDate}
                      onChange={(e) => setSupplyDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes (Optional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="rounded-xl sm:rounded-2xl bg-blue-700 border-blue-700 hover:bg-blue-800 hover:border-blue-800 w-full sm:w-auto order-1 sm:order-2"
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
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsTopUpModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-md mx-auto">
              <form onSubmit={handleTopUpSupply}>
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Top Up Medication Supply
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Drug Name
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSupply.drugName}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Batch Number
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSupply.batchNumber}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Current Stock
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedSupply.quantityRemaining} remaining of{" "}
                      {selectedSupply.quantitySupplied} supplied
                    </p>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Additional Quantity *
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="rounded-xl sm:rounded-2xl bg-blue-700 border-blue-700 hover:bg-blue-800 hover:border-blue-800 w-full sm:w-auto order-1 sm:order-2"
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