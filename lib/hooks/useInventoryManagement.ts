"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from "@/components/ui/toast-notification";
import * as inventoryService from '@/lib/services/inventoryService';
import * as branchService from '@/lib/services/branchService'; // Assuming branchService is created
import type { InventoryItem, Branch, InventoryData, ApiResponse, PaginatedApiResponse } from '@/lib/types';
import { isExpired, isExpiringSoon } from '@/lib/utils/inventoryUtils';

export interface InventoryItemWithBranch extends InventoryItem {
  branch: Branch; // Ensure branch is always populated for display
}

export type SortField = "itemName" | "quantity" | "expiryDate" | "purchaseCost" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface UseInventoryManagementReturn {
  inventory: InventoryItemWithBranch[];
  branches: Branch[];
  loading: boolean;
  showForm: boolean;
  editingItem: InventoryItemWithBranch | null;
  viewingItem: InventoryItemWithBranch | null;
  searchTerm: string;
  filterStatus: string;
  filterBranch: string;
  sortField: SortField;
  sortOrder: SortOrder;
  showFilters: boolean;
  deleteModal: { isOpen: boolean; item: InventoryItemWithBranch | null; isLoading: boolean; };
  formData: {
    itemName: string;
    quantity: string;
    unit: string;
    expiryDate: string;
    purchaseCost: string;
    branchId: string;
  };
  filteredInventory: InventoryItemWithBranch[];
  stats: {
    total: number;
    expired: number;
    expiring: number;
    fresh: number;
    totalValue: number;
  };
  fetchInventoryItems: () => Promise<void>;
  fetchBranchesList: () => Promise<void>;
  refreshData: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleEdit: (e: React.FormEvent) => Promise<void>;
  handleDelete: () => Promise<void>;
  resetForm: () => void;
  openEditForm: (item: InventoryItemWithBranch) => void;
  openDeleteModal: (item: InventoryItemWithBranch) => void;
  handleSort: (field: SortField) => void;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  setFilterBranch: React.Dispatch<React.SetStateAction<string>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setViewingItem: React.Dispatch<React.SetStateAction<InventoryItemWithBranch | null>>;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setFormData: React.Dispatch<React.SetStateAction<{
    itemName: string;
    quantity: string;
    unit: string;
    expiryDate: string;
    purchaseCost: string;
    branchId: string;
  }>>;
  setEditingItem: React.Dispatch<React.SetStateAction<InventoryItemWithBranch | null>>;
}

export function useInventoryManagement(): UseInventoryManagementReturn {
  const { user, csrfToken } = useAuth();
  const { addToast } = useToast();

  const [inventory, setInventory] = useState<InventoryItemWithBranch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemWithBranch | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItemWithBranch | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: InventoryItemWithBranch | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    item: null,
    isLoading: false,
  });
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    expiryDate: "",
    purchaseCost: "",
    branchId: user?.role === 'BRANCH_ADMIN' && user.branchId ? user.branchId : "",
  });

  const fetchInventoryItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inventoryService.fetchInventory();
      if (response.data) {
        // Ensure branch data is included or handle cases where it might be missing
        const itemsWithBranch = response.data.map(item => ({
          ...item,
          branch: item.branch || { id: 'unknown', name: 'Unknown Branch', location: '', createdAt: new Date(), updatedAt: new Date() }, // Provide a fallback branch
        })) as InventoryItemWithBranch[];
        setInventory(itemsWithBranch);
      } else {
         addToast({ type: "error", title: "Error", message: response.error || "Failed to fetch inventory." });
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      addToast({ type: "error", title: "Error", message: "Failed to fetch inventory. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchBranchesList = useCallback(async () => {
    if (user?.role !== "SUPER_ADMIN") return;
    try {
      const response = await branchService.fetchBranches();
      if (response.data) {
        setBranches(response.data);
      } else {
        addToast({ type: "error", title: "Error", message: response.error || "Failed to fetch branches." });
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      addToast({ type: "error", title: "Error", message: "Failed to fetch branches. Please try again." });
    }
  }, [user?.role, addToast]);

  useEffect(() => {
    fetchInventoryItems();
    fetchBranchesList();
  }, [fetchInventoryItems, fetchBranchesList]);

  // Reset branchId if user is not super_admin or if branches are loading
   useEffect(() => {
    if (user?.role === 'BRANCH_ADMIN' && user.branchId) {
      setFormData(prev => ({ ...prev, branchId: user.branchId! }));
    } else if (user?.role !== 'SUPER_ADMIN') {
       setFormData(prev => ({ ...prev, branchId: "" }));
    }
  }, [user, branches]);


  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchInventoryItems();
      await fetchBranchesList();
      addToast({
        type: "success",
        title: "Data Refreshed",
        message: "Inventory data has been refreshed successfully.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to refresh inventory. Please try again.",
      });
    } finally {
        setLoading(false);
    }
  }, [fetchInventoryItems, fetchBranchesList, addToast]);

  const resetForm = useCallback(() => {
    setFormData({
      itemName: "",
      quantity: "",
      unit: "kg",
      expiryDate: "",
      purchaseCost: "",
      branchId: user?.role === 'BRANCH_ADMIN' && user.branchId ? user.branchId : "",
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
        addToast({ type: "error", title: "Error", message: "CSRF token not available. Please refresh." });
        return;
    }
    try {
      const dataToSubmit: InventoryData = {
        itemName: formData.itemName.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit,
        expiryDate: new Date(formData.expiryDate),
        purchaseCost: Number(formData.purchaseCost),
        branchId: user?.role === 'SUPER_ADMIN' ? formData.branchId : user?.branchId,
      };

      const response = await inventoryService.createInventoryItem(dataToSubmit, csrfToken);

      if (response.data) {
        addToast({
          type: "success",
          title: "Inventory Item Created",
          message: response.message || "Inventory item has been successfully created.",
        });
        setShowForm(false);
        resetForm();
        await fetchInventoryItems();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: response.error || "Failed to create inventory item.",
          details: response.details,
        });
      }
    } catch (error) {
      console.error("Failed to create inventory item:", error);
      addToast({ type: "error", title: "Error", message: "An unexpected error occurred. Please try again." });
    }
  };

  const openEditForm = (item: InventoryItemWithBranch) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      quantity: item.quantity.toString(),
      unit: item.unit,
      expiryDate: new Date(item.expiryDate).toISOString().split("T")[0],
      purchaseCost: item.purchaseCost.toString(),
      branchId: item.branchId,
    });
    setShowForm(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !csrfToken) {
      addToast({ type: "error", title: "Error", message: "No item selected for editing or CSRF token missing." });
      return;
    }
    try {
      const dataToUpdate: Partial<InventoryData> = {
        itemName: formData.itemName.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit,
        expiryDate: new Date(formData.expiryDate),
        purchaseCost: Number(formData.purchaseCost),
        branchId: user?.role === 'SUPER_ADMIN' ? formData.branchId : user?.branchId,
      };

      const response = await inventoryService.updateInventoryItem(editingItem.id, dataToUpdate, csrfToken);

      if (response.data) {
        addToast({
          type: "success",
          title: "Inventory Item Updated",
          message: response.message || "Inventory item has been successfully updated.",
        });
        setEditingItem(null);
        setShowForm(false);
        resetForm();
        await fetchInventoryItems();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: response.error || "Failed to update inventory item.",
          details: response.details,
        });
      }
    } catch (error) {
      console.error("Failed to update inventory item:", error);
      addToast({ type: "error", title: "Error", message: "An unexpected error occurred. Please try again." });
    }
  };

  const openDeleteModal = (item: InventoryItemWithBranch) => {
    setDeleteModal({ isOpen: true, item, isLoading: false });
  };

  const handleDelete = async () => {
    if (!deleteModal.item || !csrfToken) {
       addToast({ type: "error", title: "Error", message: "No item selected for deletion or CSRF token missing." });
      return;
    }
    setDeleteModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await inventoryService.deleteInventoryItem(deleteModal.item.id, csrfToken);
      if (response.success || response.message) { // Some delete might return success:true or just a message
        addToast({
          type: "success",
          title: "Inventory Item Deleted",
          message: response.message || "Inventory item has been successfully deleted.",
        });
        setDeleteModal({ isOpen: false, item: null, isLoading: false });
        await fetchInventoryItems();
      } else {
         addToast({ type: "error", title: "Error", message: response.error || "Failed to delete inventory item."});
      }
    } catch (error) {
      console.error("Failed to delete inventory item:", error);
      addToast({ type: "error", title: "Error", message: "An unexpected error occurred. Please try again." });
    } finally {
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredInventory = inventory
    .filter((item) => {
      const itemDate = new Date(item.expiryDate);
      const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "expired" && isExpired(itemDate)) ||
        (filterStatus === "expiring" && isExpiringSoon(itemDate) && !isExpired(itemDate)) ||
        (filterStatus === "fresh" && !isExpired(itemDate) && !isExpiringSoon(itemDate));
      const matchesBranch = !filterBranch || !item.branch || item.branch.id === filterBranch;
      return matchesSearch && matchesStatus && matchesBranch;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      // Ensure consistent type comparison, especially for dates
      const valA = sortField === 'expiryDate' || sortField === 'createdAt' ? new Date(aValue).getTime() : aValue;
      const valB = sortField === 'expiryDate' || sortField === 'createdAt' ? new Date(bValue).getTime() : bValue;

      if (sortOrder === "asc") {
        return valA > valB ? 1 : (valA < valB ? -1 : 0);
      } else {
        return valA < valB ? 1 : (valA > valB ? -1 : 0);
      }
    });

  const stats = {
    total: inventory.length,
    expired: inventory.filter((item) => isExpired(new Date(item.expiryDate))).length,
    expiring: inventory.filter((item) => isExpiringSoon(new Date(item.expiryDate)) && !isExpired(new Date(item.expiryDate))).length,
    fresh: inventory.filter((item) => !isExpired(new Date(item.expiryDate)) && !isExpiringSoon(new Date(item.expiryDate))).length,
    totalValue: inventory.reduce((sum, item) => sum + (Number(item.purchaseCost) || 0), 0),
  };

  return {
    inventory,
    branches,
    loading,
    showForm,
    editingItem,
    viewingItem,
    searchTerm,
    filterStatus,
    filterBranch,
    sortField,
    sortOrder,
    showFilters,
    deleteModal,
    formData,
    filteredInventory,
    stats,
    fetchInventoryItems,
    fetchBranchesList,
    refreshData,
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    openEditForm,
    openDeleteModal,
    handleSort,
    setSearchTerm,
    setFilterStatus,
    setFilterBranch,
    setShowForm,
    setViewingItem,
    setShowFilters,
    setFormData,
    setEditingItem,
  };
}
