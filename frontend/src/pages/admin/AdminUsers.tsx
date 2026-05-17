import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUserApi,
  deleteUserApi,
  getUsersApi,
  updateUserApi,
} from "@/features/admin/services/adminService";
import { Users, Plus, Search, Edit, Trash2 } from "lucide-react";
import type { User } from "@/types";
import { toast } from "sonner";

export default function AdminUsers() {
  const { user } = useAuth();
  const { confirm } = useConfirmation();
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRemovingUserId, setIsRemovingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student" as "student" | "examiner",
    accountNumber: "",
  });
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "student" as "student" | "examiner" | "admin",
    isActive: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setAllUsers(await getUsersApi());
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    void load();
  }, []);

  const reloadUsers = async () => {
    try {
      setAllUsers(await getUsersApi());
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
      accountNumber: "",
    });
    setCreateError("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      const created = await createUserApi({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        accountNumber:
          form.role === "student" && form.accountNumber.trim().length > 0
            ? form.accountNumber.trim()
            : undefined,
      });
      setAllUsers((prev) => [created, ...prev]);
      setCreateOpen(false);
      resetForm();
      await reloadUsers();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create user",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (targetUser: User) => {
    setEditingUserId(targetUser._id);
    setEditForm({
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      role: targetUser.role as "student" | "examiner" | "admin",
      isActive: targetUser.isActive,
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    setEditError("");
    setIsSavingEdit(true);
    try {
      const updated = await updateUserApi(editingUserId, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        isActive: editForm.isActive,
      });
      setAllUsers((prev) =>
        prev.map((entry) => (entry._id === editingUserId ? updated : entry)),
      );
      setEditOpen(false);
      setEditingUserId(null);
      toast.success("User updated.");
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Failed to update user",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRemoveUser = async (targetUser: User) => {
    if (targetUser._id === user._id) {
      toast.error("You cannot remove your own admin account.");
      return;
    }

    const confirmed = await confirm({
      title: "Remove User",
      description: `Are you sure you want to remove ${targetUser.firstName} ${targetUser.lastName} from the system? This action cannot be undone.`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    setIsRemovingUserId(targetUser._id);
    try {
      await deleteUserApi(targetUser._id);
      setAllUsers((prev) =>
        prev.filter((entry) => entry._id !== targetUser._id),
      );
      toast.success("User removed.");
    } catch (error) {
      console.error("Failed to remove user", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove user.",
      );
    } finally {
      setIsRemovingUserId(null);
    }
  };

  const filtered = allUsers.filter((u) => {
    const matchesSearch = `${u.firstName} ${u.lastName} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "examiner":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {allUsers.length} registered users
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form className="grid gap-4 py-4" onSubmit={handleCreateUser}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@enaes.gov.et"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value: "student" | "examiner") =>
                    setForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="examiner">Examiner</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    National ID - FAN or FIN (optional)
                  </Label>
                  <Input
                    id="accountNumber"
                    placeholder="e.g., FAN-2026-003 or FIN-2026-003"
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        accountNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
              {createError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                  {createError}
                </div>
              )}
              <Button
                className="bg-gradient-primary"
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="examiner">Examiner</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={roleBadgeVariant(u.role) as any}
                      className="capitalize text-xs"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${u.isActive ? "text-success" : "text-destructive"}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-success" : "bg-destructive"}`}
                      />
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(u)}
                      aria-label={`Edit ${u.firstName} ${u.lastName}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => void handleRemoveUser(u)}
                      disabled={isRemovingUserId === u._id}
                      aria-label={`Remove ${u.firstName} ${u.lastName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditError("");
            setEditingUserId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update profile details and account status.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 py-2" onSubmit={handleSaveEdit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: "student" | "examiner" | "admin") =>
                  setEditForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="examiner">Examiner</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Status</Label>
              <Select
                value={editForm.isActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    isActive: value === "active",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                {editError}
              </div>
            )}
            <Button
              className="bg-gradient-primary"
              type="submit"
              disabled={isSavingEdit}
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
