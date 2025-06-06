"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from "@/components/ui/toast-notification";
import { useBranchStore } from '@/lib/stores/branchStore'; // Import branch store
import * as wasteLogService from '@/lib/services/wasteLogService';
// import * as branchService from '@/lib/services/branchService'; // Replaced by store
import * as reviewService from '@/lib/services/reviewService';
import type { WasteLog, Branch, Review as WasteLogReviewType, WasteLogData, DeletionReason } from '@/lib/types';

export interface WasteLogWithBranch extends WasteLog {
  branch: Branch; // Ensure branch is always populated
}

// Re-defining WasteLogReview here if it's different from the global Review type from lib/types
// For now, assuming lib/types.Review (aliased as WasteLogReviewType) is sufficient
// export interface WasteLogReview extends WasteLogReviewType {}


export type SortFieldWaste = "itemName" | "quantity" | "value" | "createdAt" | "reason";
export type SortOrderWaste = "asc" | "desc";

export interface UseWasteLogManagementReturn {
  wasteLogs: WasteLogWithBranch[];
  branches: Branch[];
  reviews: WasteLogReviewType[];
  loading: boolean;
  showForm: boolean;
  editingLog: WasteLogWithBranch | null;
  viewingLog: WasteLogWithBranch | null;
  showReviews: boolean;
  searchTerm: string;
  filterReason: string;
  filterBranch: string;
  sortBy: SortFieldWaste;
  sortOrder: SortOrderWaste;
  showFilters: boolean;
  deleteModal: { isOpen: boolean; wasteLog: WasteLogWithBranch | null; isLoading: boolean; };
  formData: {
    itemName: string;
    quantity: string;
    unit: string;
    value: string;
    reason: string;
    branchId: string;
    photo: string;
    wasteDate: string;
  };
  filteredWasteLogs: WasteLogWithBranch[];
  stats: { total: number; totalWaste: number; totalValue: number; averageValue: number; };
  refreshAllData: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleEdit: (e: React.FormEvent) => Promise<void>;
  handleDelete: (reason: string) => Promise<void>;
  handleReviewAction: (reviewId: string, action: "approve" | "reject", reviewNotes: string) => Promise<void>;
  resetForm: () => void;
  openEditForm: (log: WasteLogWithBranch) => void;
  openDeleteModal: (log: WasteLogWithBranch) => void;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setFilterReason: React.Dispatch<React.SetStateAction<string>>;
  setFilterBranch: React.Dispatch<React.SetStateAction<string>>;
  setSortBy: React.Dispatch<React.SetStateAction<SortFieldWaste>>;
  setSortOrder: React.Dispatch<React.SetStateAction<SortOrderWaste>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingLog: React.Dispatch<React.SetStateAction<WasteLogWithBranch | null>>;
  setViewingLog: React.Dispatch<React.SetStateAction<WasteLogWithBranch | null>>;
  setShowReviews: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; wasteLog: WasteLogWithBranch | null; isLoading: boolean; }>>;
  setFormData: React.Dispatch<React.SetStateAction<{
    itemName: string;
    quantity: string;
    unit: string;
    value: string;
    reason: string;
    branchId: string;
    photo: string;
    wasteDate: string;
  }>>;
}

export function useWasteLogManagement(): UseWasteLogManagementReturn {
  const { user, csrfToken } = useAuth();
  const { addToast } = useToast();

  const globalBranches = useBranchStore(state => state.branches);
  const fetchGlobalBranches = useBranchStore(state => state.fetchAllBranches);
  const branchStoreLoading = useBranchStore(state => state.loading);
  // const branchStoreError = useBranchStore(state => state.error); // Can be used for more specific error handling if needed

  const [wasteLogs, setWasteLogs] = useState<WasteLogWithBranch[]>([]);
  // const [branches, setBranches] = useState<Branch[]>([]); // Replaced by globalBranches
  const [reviews, setReviews] = useState<WasteLogReviewType[]>([]);
  const [loading, setLoading] = useState(true); // For waste logs and reviews primarily
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<WasteLogWithBranch | null>(null);
  const [viewingLog, setViewingLog] = useState<WasteLogWithBranch | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [sortBy, setSortBy] = useState<SortFieldWaste>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrderWaste>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    wasteLog: WasteLogWithBranch | null;
    isLoading: boolean;
  }>({ isOpen: false, wasteLog: null, isLoading: false });
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    value: "",
    reason: "SPOILAGE",
    branchId: user?.role === 'BRANCH_ADMIN' && user.branchId ? user.branchId : "",
    photo: "",
    wasteDate: new Date().toISOString().split("T")[0],
  });

  const addValidationErrors = useCallback((details: any[], title: string) => {
    details.forEach(detail => {
      addToast({
        type: "error",
        title: title,
        message: `${detail.field ? detail.field + ': ' : ''}${detail.message}`,
      });
    });
  }, [addToast]);

  const fetchWasteLogsInternal = useCallback(async () => {
    try {
      const response = await wasteLogService.fetchWasteLogs();
      if (response.data) {
        const logsWithBranch = response.data.map(log => ({
          ...log,
          branch: log.branch || { id: 'unknown', name: 'Unknown Branch', location: '', createdAt: new Date(), updatedAt: new Date() },
        })) as WasteLogWithBranch[];
        setWasteLogs(logsWithBranch);
      } else {
        addToast({ type: "error", title: "Error", message: response.error || "Failed to fetch waste logs." });
        setWasteLogs([]);
      }
    } catch (error) {
      console.error("Failed to fetch waste logs:", error);
      addToast({ type: "error", title: "Error", message: "An unexpected error occurred while fetching waste logs." });
      setWasteLogs([]);
    }
  }, [addToast]);

  // Use global branch store for fetching branches
  const loadGlobalBranches = useCallback(async (forceRefresh = false) => {
    if (user?.role === "SUPER_ADMIN") {
      await fetchGlobalBranches(forceRefresh);
    }
    // Non-SUPER_ADMINs don't need the full list for their own waste log management usually.
  }, [user?.role, fetchGlobalBranches]);

  const fetchReviewsInternal = useCallback(async () => {
    if (user?.role !== "SUPER_ADMIN") return;
    try {
      const response = await reviewService.fetchPendingReviews();
      if (response.data) {
        setReviews(response.data);
      } else {
        addToast({ type: "error", title: "Error", message: response.error || "Failed to fetch reviews." });
        setReviews([]);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      addToast({ type: "error", title: "Error", message: "An unexpected error occurred while fetching reviews." });
      setReviews([]);
    }
  }, [user?.role, addToast]);

  const refreshAllData = useCallback(async (showRefreshToast = true) => {
    setLoading(true); // Combined loading state, or manage separately
    await fetchWasteLogsInternal();
    if (user?.role === "SUPER_ADMIN") {
      await loadGlobalBranches(true); // Force refresh for branches
      await fetchReviewsInternal();
    }
    if (showRefreshToast) {
        addToast({ type: "success", title: "Data Refreshed", message: "All data has been refreshed." });
    }
    setLoading(false);
  }, [user?.role, fetchWasteLogsInternal, fetchBranchesInternal, fetchReviewsInternal, addToast]);

  useEffect(() => {
    refreshAllData(false); // Initial fetch, no toast
  }, [refreshAllData]);

   useEffect(() => {
    if (user?.role === 'BRANCH_ADMIN' && user.branchId) {
      setFormData(prev => ({ ...prev, branchId: user.branchId! }));
    } else if (user?.role !== 'SUPER_ADMIN') {
       setFormData(prev => ({ ...prev, branchId: "" }));
    }
  }, [user]);

  const resetForm = useCallback(() => {
    setFormData({
      itemName: "", quantity: "", unit: "kg", value: "", reason: "SPOILAGE",
      branchId: user?.role === 'BRANCH_ADMIN' && user.branchId ? user.branchId : "",
      photo: "", wasteDate: new Date().toISOString().split("T")[0],
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
        addToast({ type: "error", title: "Error", message: "CSRF token not available." });
        return;
    }
    setLoading(true);
    try {
      const dataToSubmit: WasteLogData = {
        ...formData,
        quantity: Number(formData.quantity),
        value: Number(formData.value),
        branchId: user?.role === 'SUPER_ADMIN' ? formData.branchId : user?.branchId,
        wasteDate: new Date(formData.wasteDate),
      };
      const response = await wasteLogService.createWasteLog(dataToSubmit, csrfToken);

      if (response.data) {
        addToast({ type: response.message?.includes("approval") ? "info" : "success", title: response.message?.includes("approval") ? "Submitted for Approval" : "Waste Log Created", message: response.message || "Operation successful." });
        setShowForm(false);
        resetForm();
        fetchWasteLogsInternal();
        if (user?.role === "SUPER_ADMIN") fetchReviewsInternal();
      } else {
        if (response.details) addValidationErrors(response.details, "Validation Error");
        else addToast({ type: "error", title: "Error", message: response.error || "Failed to create waste log." });
      }
    } catch (error) {
      addToast({ type: "error", title: "Submission Error", message: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (log: WasteLogWithBranch) => {
    setEditingLog(log);
    setFormData({
      itemName: log.itemName,
      quantity: log.quantity.toString(),
      unit: log.unit,
      value: log.value.toString(),
      reason: log.reason,
      branchId: log.branchId,
      photo: log.photo || "",
      wasteDate: new Date(log.createdAt).toISOString().split("T")[0], // Should be log.wasteDate if available
    });
    setShowForm(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !csrfToken) {
        addToast({ type: "error", title: "Error", message: "No log selected or CSRF token missing." });
        return;
    }
    setLoading(true);
    try {
        const dataToUpdate: Partial<WasteLogData> = {
            ...formData,
            quantity: Number(formData.quantity),
            value: Number(formData.value),
            branchId: user?.role === 'SUPER_ADMIN' ? formData.branchId : user?.branchId,
            wasteDate: new Date(formData.wasteDate),
        };
        const response = await wasteLogService.updateWasteLog(editingLog.id, dataToUpdate, csrfToken);
        if (response.data) {
            addToast({ type: response.message?.includes("approval") ? "info" : "success", title: response.message?.includes("approval") ? "Update Submitted" : "Waste Log Updated", message: response.message || "Update successful." });
            setEditingLog(null);
            setShowForm(false);
            resetForm();
            fetchWasteLogsInternal();
            if (user?.role === "SUPER_ADMIN") fetchReviewsInternal();
        } else {
            if (response.details) addValidationErrors(response.details, "Validation Error");
            else addToast({ type: "error", title: "Error", message: response.error || "Failed to update waste log." });
        }
    } catch (error) {
        addToast({ type: "error", title: "Update Error", message: "An unexpected error occurred." });
    } finally {
        setLoading(false);
    }
  };

  const openDeleteModal = (log: WasteLogWithBranch) => {
    setDeleteModal({ isOpen: true, wasteLog: log, isLoading: false });
  };

  const handleDelete = async (reasonString: string) => {
    if (!deleteModal.wasteLog || !csrfToken) {
        addToast({ type: "error", title: "Error", message: "No log selected or CSRF token missing." });
        return;
    }
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    try {
        const reasonData: DeletionReason = { reason: reasonString };
        const response = await wasteLogService.deleteWasteLog(deleteModal.wasteLog.id, reasonData, csrfToken);
        if (response.success || response.message?.includes("Deleted") || response.message?.includes("approval")) {
             addToast({ type: response.message?.includes("approval") ? "info" : "success", title: response.message?.includes("approval") ? "Delete Request Submitted" : "Waste Log Deleted", message: response.message || "Deletion successful." });
            setDeleteModal({ isOpen: false, wasteLog: null, isLoading: false });
            fetchWasteLogsInternal();
            if (user?.role === "SUPER_ADMIN") fetchReviewsInternal();
        } else {
            addToast({ type: "error", title: "Error", message: response.error || "Failed to delete waste log." });
        }
    } catch (error) {
        addToast({ type: "error", title: "Delete Error", message: "An unexpected error occurred." });
    } finally {
        setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleReviewAction = async (reviewId: string, action: "approve" | "reject", reviewNotes: string) => {
    if (!csrfToken) {
         addToast({ type: "error", title: "Error", message: "CSRF token missing." });
        return;
    }
    if (!reviewNotes && action === "reject") { // Notes might be optional for approval by some systems
        addToast({ type: "error", title: "Note Required", message: "Review notes are required for rejecting a request."});
        return;
    }
    try {
        const response = await reviewService.updateReview(reviewId, action, reviewNotes, csrfToken);
        if (response.data) {
            addToast({ type: "success", title: `Request ${action === "approve" ? "Approved" : "Rejected"}`, message: `The request has been successfully ${action}d.` });
            fetchReviewsInternal();
            fetchWasteLogsInternal(); // Refresh logs as their status might change
        } else {
            addToast({ type: "error", title: "Error", message: response.error || "Failed to process review." });
        }
    } catch (error) {
        addToast({ type: "error", title: "Review Error", message: "An unexpected error occurred." });
    }
  };

  const filteredWasteLogs = wasteLogs
    .filter(log => {
      const matchesSearch = log.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesReason = !filterReason || log.reason === filterReason;
      const matchesBranch = !filterBranch || !log.branch || log.branch.id === filterBranch;
      return matchesSearch && matchesReason && matchesBranch;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const valA = sortBy === 'createdAt' ? new Date(aVal).getTime() : aVal;
      const valB = sortBy === 'createdAt' ? new Date(bVal).getTime() : bVal;
      if (sortOrder === "asc") return valA > valB ? 1 : (valA < valB ? -1 : 0);
      return valA < valB ? 1 : (valA > valB ? -1 : 0);
    });

  const stats = {
    total: wasteLogs.length,
    totalWaste: wasteLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0),
    totalValue: wasteLogs.reduce((sum, log) => sum + (Number(log.value) || 0), 0),
    averageValue: wasteLogs.length > 0 ? wasteLogs.reduce((sum, log) => sum + (Number(log.value) || 0), 0) / wasteLogs.length : 0,
  };

  return {
    wasteLogs, branches: globalBranches, reviews, loading: loading || branchStoreLoading, showForm, editingLog, viewingLog, showReviews,
    searchTerm, filterReason, filterBranch, sortBy, sortOrder, showFilters, deleteModal, formData,
    filteredWasteLogs, stats, refreshAllData, handleSubmit, handleEdit, handleDelete, handleReviewAction,
    resetForm, openEditForm, openDeleteModal, setSearchTerm, setFilterReason, setFilterBranch,
    setSortBy, setSortOrder, setShowForm, setEditingLog, setViewingLog, setShowReviews, setShowFilters,
    setDeleteModal, setFormData,
  };
}
