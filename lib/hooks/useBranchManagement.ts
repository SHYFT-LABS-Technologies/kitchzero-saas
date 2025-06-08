"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from "@/components/ui/toast-notification";
import { useBranchStore } from '@/lib/stores/branchStore'; // Import branch store
import * as branchService from '@/lib/services/branchService';
import * as userService from '@/lib/services/userService';
import type { Branch, User, BranchData, UserCreationData, UserUpdateData } from '@/lib/types';

export interface BranchWithStats extends Branch {
  users: User[]; // Users directly associated with this branch
  _count?: { // Optional: If your API provides these counts directly
    inventory: number;
    wasteLogs: number;
  };
}

export interface UseBranchManagementReturn {
  branches: BranchWithStats[]; // Detailed branches for the main page display
  branchListForUserForm: Branch[]; // Simple list for dropdowns, from global store
  allUsers: User[];
  loading: boolean; // Overall loading for the hook's primary data
  branchListLoading: boolean; // Loading state for the global branch list
  showBranchForm: boolean;
  showUserForm: boolean;
  editingBranch: BranchWithStats | null;
  editingUser: User | null;
  branchFormData: BranchData;
  userFormData: UserCreationData & { passwordConfirmation?: string }; // Include passwordConfirmation for form validation
  fetchBranchesAndUsers: () => Promise<void>;
  handleBranchSubmit: (e: React.FormEvent) => Promise<void>;
  handleUserSubmit: (e: React.FormEvent) => Promise<void>;
  handleDeleteBranch: (branchId: string) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;
  openEditBranchForm: (branch: BranchWithStats) => void;
  openNewBranchForm: () => void;
  openEditUserForm: (user: User) => void;
  openNewUserForm: (branchId?: string) => void;
  setShowBranchForm: React.Dispatch<React.SetStateAction<boolean>>;
  setShowUserForm: React.Dispatch<React.SetStateAction<boolean>>;
  setBranchFormData: React.Dispatch<React.SetStateAction<BranchData>>;
  setUserFormData: React.Dispatch<React.SetStateAction<UserCreationData & { passwordConfirmation?: string }>>;
  setEditingBranch: React.Dispatch<React.SetStateAction<BranchWithStats | null>>;
  setEditingUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export function useBranchManagement(): UseBranchManagementReturn {
  const { user: authUser, csrfToken } = useAuth();
  const { addToast } = useToast();

  // For the main display of branches with stats
  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  // For the user assignment dropdown (simpler list)
  const globalBranchListForUserForm = useBranchStore(state => state.branches);
  const fetchGlobalBranchList = useBranchStore(state => state.fetchAllBranches);
  const branchListLoading = useBranchStore(state => state.loading);
  // const branchListError = useBranchStore(state => state.error); // Optional: handle errors for this specific fetch

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); // For main branches & users data
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchWithStats | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const initialBranchFormData: BranchData = { name: "", location: "" };
  const initialUserFormData: UserCreationData & { passwordConfirmation?: string } = {
    username: "", password: "", role: "BRANCH_ADMIN", branchId: "", passwordConfirmation: ""
  };

  const [branchFormData, setBranchFormData] = useState<BranchData>(initialBranchFormData);
  const [userFormData, setUserFormData] = useState<UserCreationData & { passwordConfirmation?: string }>(initialUserFormData);

  const addValidationErrors = useCallback((details: any[], baseMessage: string) => {
    details.forEach(detail => {
      addToast({ type: "error", title: "Validation Error", message: `${detail.field}: ${detail.message}` });
    });
  }, [addToast]);

  const fetchBranchesAndUsers = useCallback(async (showNotification = false) => {
    if (authUser?.role !== "SUPER_ADMIN") {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const [branchResponse, usersResponse] = await Promise.all([
        branchService.fetchBranches(),
        userService.fetchUsers()
      ]);

      if (branchResponse.data) {
        // Assuming the service or API populates users per branch and counts
        setBranches(branchResponse.data as BranchWithStats[]);
      } else {
        addToast({ type: "error", title: "Error", message: branchResponse.error || "Failed to fetch branches." });
      }

      if (usersResponse.data) {
        setAllUsers(usersResponse.data);
      } else {
        addToast({ type: "error", title: "Error", message: usersResponse.error || "Failed to fetch users." });
      }
      if (showNotification) {
        addToast({ type: "success", title: "Data Refreshed", message: "Branches and users data updated." });
      }
    } catch (error) {
      console.error("Failed to fetch branches or users:", error);
      addToast({ type: "error", title: "Fetch Error", message: "Failed to fetch data. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [authUser?.role, addToast]);

  useEffect(() => {
    fetchBranchesAndUsers();
  }, [fetchBranchesAndUsers]);

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
        addToast({ type: "error", title: "Error", message: "CSRF token missing." });
        return;
    }
    if (!branchFormData.name.trim() || !branchFormData.location.trim()) {
      addToast({ type: "error", title: "Validation Error", message: "Branch name and location are required." });
      return;
    }

    try {
      let response: ApiResponse<Branch>;
      if (editingBranch) {
        response = await branchService.updateBranch(editingBranch.id, branchFormData, csrfToken);
      } else {
        response = await branchService.createBranch(branchFormData, csrfToken);
      }

      if (response.data) {
        addToast({ type: "success", title: "Success", message: response.message || `Branch ${editingBranch ? 'updated' : 'created'} successfully.` });
        setShowBranchForm(false);
        setEditingBranch(null);
        setBranchFormData(initialBranchFormData);
        fetchBranchesAndUsers();
      } else {
        if (response.details) addValidationErrors(response.details, "Branch operation failed");
        else addToast({ type: "error", title: "Error", message: response.error || "Failed to save branch." });
      }
    } catch (error) {
      addToast({ type: "error", title: "Save Error", message: "An unexpected error occurred." });
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
      addToast({ type: "error", title: "Error", message: "CSRF token missing." });
      return;
    }
    // Basic client-side validation (more detailed validation in Zod schemas / API)
    if (!userFormData.username.trim() || userFormData.username.trim().length < 3) {
      addToast({ type: "error", title: "Validation Error", message: "Username must be at least 3 characters." });
      return;
    }
    if (!editingUser && (!userFormData.password || userFormData.password.length < 10)) { // Check new password policy
      addToast({ type: "error", title: "Validation Error", message: "Password must be at least 10 characters for new users." });
      return;
    }
     if (userFormData.password && userFormData.password !== userFormData.passwordConfirmation) {
      addToast({ type: "error", title: "Validation Error", message: "Passwords do not match." });
      return;
    }
    if (userFormData.role === "BRANCH_ADMIN" && !userFormData.branchId) {
      addToast({ type: "error", title: "Validation Error", message: "Branch assignment is required for Branch Admins." });
      return;
    }

    try {
      const dataToSubmit: UserCreationData | UserUpdateData = {
        username: userFormData.username.trim(),
        role: userFormData.role,
        branchId: userFormData.role === "BRANCH_ADMIN" ? userFormData.branchId : null,
        ...(userFormData.password && { password: userFormData.password }), // Only include password if provided
      };

      let response: ApiResponse<User>;
      if (editingUser) {
        response = await userService.updateUser(editingUser.id, dataToSubmit as UserUpdateData, csrfToken);
      } else {
        response = await userService.createUser(dataToSubmit as UserCreationData, csrfToken);
      }

      if (response.data) {
        addToast({ type: "success", title: "Success", message: response.message || `User ${editingUser ? 'updated' : 'created'} successfully.` });
        setShowUserForm(false);
        setEditingUser(null);
        setUserFormData(initialUserFormData);
        fetchBranchesAndUsers(); // Refresh both users and branches (as branch might show new user)
      } else {
        if (response.details) addValidationErrors(response.details, "User operation failed");
        else addToast({ type: "error", title: "Error", message: response.error || "Failed to save user." });
      }
    } catch (error) {
      addToast({ type: "error", title: "Save Error", message: "An unexpected error occurred." });
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!csrfToken) {
      addToast({ type: "error", title: "Error", message: "CSRF token missing." });
      return;
    }
    if (!window.confirm("Are you sure? This may also delete associated users if not handled by backend.")) { // Simplified confirm
        return;
    }
    try {
      const response = await branchService.deleteBranch(branchId, csrfToken);
      if (response.success || response.message?.includes("deleted")) { // Check for success flag or message
        addToast({ type: "success", title: "Success", message: response.message || "Branch deleted successfully." });
        fetchBranchesAndUsers();
      } else {
        addToast({ type: "error", title: "Error", message: response.error || "Failed to delete branch." });
      }
    } catch (error) {
      addToast({ type: "error", title: "Delete Error", message: "An unexpected error occurred." });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!csrfToken) {
      addToast({ type: "error", title: "Error", message: "CSRF token missing." });
      return;
    }
     if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await userService.deleteUser(userId, csrfToken);
      if (response.success || response.message?.includes("deleted")) {
        addToast({ type: "success", title: "Success", message: response.message || "User deleted successfully." });
        fetchBranchesAndUsers(); // Refresh both
      } else {
        addToast({ type: "error", title: "Error", message: response.error || "Failed to delete user." });
      }
    } catch (error) {
      addToast({ type: "error", title: "Delete Error", message: "An unexpected error occurred." });
    }
  };

  const openNewBranchForm = () => {
    setEditingBranch(null);
    setBranchFormData(initialBranchFormData);
    setShowBranchForm(true);
  };

  const openEditBranchForm = (branch: BranchWithStats) => {
    setEditingBranch(branch);
    setBranchFormData({ name: branch.name, location: branch.location });
    setShowBranchForm(true);
  };

  const openNewUserForm = useCallback((branchId?: string) => {
    if (authUser?.role === 'SUPER_ADMIN') {
      fetchGlobalBranchList(); // Ensure branch list is available for SUPER_ADMIN
    }
    setEditingUser(null);
    setUserFormData({ ...initialUserFormData, branchId: branchId || "" });
    setShowUserForm(true);
  }, [authUser?.role, fetchGlobalBranchList, initialUserFormData]);

  const openEditUserForm = useCallback((userToEdit: User) => {
    if (authUser?.role === 'SUPER_ADMIN') {
      fetchGlobalBranchList(); // Ensure branch list is available
    }
    setEditingUser(userToEdit);
    setUserFormData({
      username: userToEdit.username,
      password: "", // Clear password for edit form
      passwordConfirmation: "",
      role: userToEdit.role,
      branchId: userToEdit.branchId || "",
    });
    setShowUserForm(true);
  }, [authUser?.role, fetchGlobalBranchList]); // Added useCallback and dependencies

  return {
    branches,
    branchListForUserForm: globalBranchListForUserForm,
    allUsers,
    loading,
    branchListLoading,
    showBranchForm, showUserForm, editingBranch, editingUser,
    branchFormData, userFormData, fetchBranchesAndUsers, handleBranchSubmit, handleUserSubmit,
    handleDeleteBranch, handleDeleteUser, openEditBranchForm, openNewBranchForm, openEditUserForm,
    setShowBranchForm, setShowUserForm, setBranchFormData, setUserFormData, setEditingBranch, setEditingUser,
  };
}
