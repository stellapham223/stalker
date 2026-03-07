"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ open, onConfirm, onCancel, title, description }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto rounded-lg border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-background/80 backdrop:backdrop-blur-sm"
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
    >
      <div className="p-6 max-w-sm">
        <h2 className="text-lg font-semibold">{title || "Are you sure?"}</h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </dialog>
  );
}
