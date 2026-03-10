import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchMe, updateAccount, deleteAccount } from "../lib/api";
import { logout } from "../lib/auth";
import toast from "react-hot-toast";

export default function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (!newUsername && !newPassword) {
      toast.error("Nothing to update");
      return;
    }
    setSaving(true);
    try {
      await updateAccount({
        current_password: currentPassword,
        new_username: newUsername || undefined,
        new_password: newPassword || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Account updated");
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Account deleted");
      logout();
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Account Settings</h1>

      <div className="card space-y-4">
        <div>
          <span className="text-sm text-slate-400">Username</span>
          <p className="text-white font-medium">{user?.username}</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Update Account</h2>
        <div>
          <label className="label">Current Password *</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">New Username</label>
          <input
            type="text"
            className="input"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={user?.username}
            minLength={3}
            maxLength={50}
          />
        </div>
        <div>
          <label className="label">New Password</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
          />
        </div>
        {newPassword && (
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm bg-red-600/20 text-red-400 border border-red-600/40 rounded-lg hover:bg-red-600/30 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              This will permanently delete your account and all your flight data. This cannot be undone.
            </p>
            <div>
              <label className="label text-xs">Type <span className="text-red-400 font-mono">delete</span> to confirm</label>
              <input
                type="text"
                className="input"
                placeholder="delete"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== "delete" || deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
